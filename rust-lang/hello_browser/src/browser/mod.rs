use url::Url;

use crate::dom::types::DomNode;
use crate::error::{BrowserError, Result};
use crate::layout::{LayoutTree, build_layout};
use crate::net::fetcher::{DocumentFetcher, NetFetcher};
use crate::parse::cssparser_adapter::{CssParser, CssParserAdapter, Stylesheet};
use crate::parse::html5ever_adapter::{Html5everParser, HtmlParser, extract_style_blocks};
use crate::style::{StyleNode, style_tree};

#[derive(Debug, Clone)]
pub struct BrowserState {
    pub current_url: Option<Url>,
    pub history_back: Vec<Url>,
    pub history_forward: Vec<Url>,
    pub dom: Option<DomNode>,
    pub stylesheet: Stylesheet,
    pub styled_root: Option<StyleNode>,
    pub layout: LayoutTree,
    pub scroll_y: f32,
    pub status_text: String,
}

impl Default for BrowserState {
    fn default() -> Self {
        Self {
            current_url: None,
            history_back: Vec::new(),
            history_forward: Vec::new(),
            dom: None,
            stylesheet: Stylesheet::default(),
            styled_root: None,
            layout: LayoutTree::default(),
            scroll_y: 0.0,
            status_text: "ready".to_string(),
        }
    }
}

pub struct Browser {
    pub state: BrowserState,
    fetcher: NetFetcher,
    html_parser: Html5everParser,
    css_parser: CssParserAdapter,
}

impl Browser {
    pub fn new() -> Result<Self> {
        Ok(Self {
            state: BrowserState::default(),
            fetcher: NetFetcher::new()?,
            html_parser: Html5everParser,
            css_parser: CssParserAdapter,
        })
    }

    pub fn current_url_string(&self) -> String {
        self.state
            .current_url
            .as_ref()
            .map(Url::as_str)
            .unwrap_or("about:blank")
            .to_string()
    }

    pub fn navigate(&mut self, input: &str, viewport_width: f32) {
        if input.trim().is_empty() || input.trim().eq_ignore_ascii_case("about:blank") {
            if let Some(current) = &self.state.current_url {
                self.state.history_back.push(current.clone());
                self.state.history_forward.clear();
            }
            self.state.current_url = None;
            self.load_html("<html><body></body></html>", viewport_width);
            self.state.status_text = "ok".to_string();
            return;
        }

        match Self::parse_user_url(input) {
            Ok(url) => {
                if let Some(current) = &self.state.current_url {
                    self.state.history_back.push(current.clone());
                    self.state.history_forward.clear();
                }
                self.load_url(url, viewport_width);
            }
            Err(err) => {
                self.set_error_page(&format!("invalid URL: {err}"), viewport_width);
            }
        }
    }

    pub fn back(&mut self, viewport_width: f32) {
        let Some(url) = self.state.history_back.pop() else {
            return;
        };
        if let Some(current) = self.state.current_url.clone() {
            self.state.history_forward.push(current);
        }
        self.load_url(url, viewport_width);
    }

    pub fn forward(&mut self, viewport_width: f32) {
        let Some(url) = self.state.history_forward.pop() else {
            return;
        };
        if let Some(current) = self.state.current_url.clone() {
            self.state.history_back.push(current);
        }
        self.load_url(url, viewport_width);
    }

    pub fn reload(&mut self, viewport_width: f32) {
        if let Some(url) = self.state.current_url.clone() {
            self.load_url(url, viewport_width);
        } else {
            self.load_html("<html><body></body></html>", viewport_width);
        }
    }

    pub fn relayout(&mut self, viewport_width: f32) {
        if let Some(styled) = &self.state.styled_root {
            self.state.layout = build_layout(styled, viewport_width);
            self.clamp_scroll();
        }
    }

    pub fn scroll_by(&mut self, delta: f32, viewport_height: f32) {
        self.state.scroll_y = (self.state.scroll_y + delta).max(0.0);
        let max_scroll = (self.state.layout.content_height - viewport_height).max(0.0);
        if self.state.scroll_y > max_scroll {
            self.state.scroll_y = max_scroll;
        }
    }

    fn load_url(&mut self, url: Url, viewport_width: f32) {
        match self.fetcher.fetch(&url) {
            Ok(resource) => {
                self.state.current_url = Some(resource.final_url.clone());
                if !resource.content_type.to_ascii_lowercase().contains("text/html") {
                    let msg = format!(
                        "<html><body><h1>Unsupported content</h1><p>{}</p></body></html>",
                        resource.content_type
                    );
                    self.load_html(&msg, viewport_width);
                    return;
                }
                self.load_html(&resource.body, viewport_width);
                self.state.status_text = "ok".to_string();
            }
            Err(err) => {
                self.set_error_page(&format!("load failed: {err}"), viewport_width);
            }
        }
    }

    fn load_html(&mut self, html: &str, viewport_width: f32) {
        match self.html_parser.parse(html) {
            Ok(dom) => {
                let mut css_texts = Vec::new();
                extract_style_blocks(&dom, &mut css_texts);
                let mut stylesheet = Stylesheet::default();
                for css in css_texts {
                    match self.css_parser.parse_stylesheet(&css) {
                        Ok(parsed) => stylesheet.rules.extend(parsed.rules),
                        Err(err) => {
                            self.state.status_text = format!("css parse warning: {err}");
                        }
                    }
                }

                self.state.dom = Some(dom.clone());
                self.state.stylesheet = stylesheet;
                let styled = style_tree(&dom, &self.state.stylesheet);
                self.state.layout = build_layout(&styled, viewport_width);
                self.state.styled_root = Some(styled);
                self.state.scroll_y = 0.0;
            }
            Err(err) => self.set_error_page(&format!("parse failed: {err}"), viewport_width),
        }
    }

    fn set_error_page(&mut self, message: &str, viewport_width: f32) {
        let escaped = message.replace('<', "&lt;").replace('>', "&gt;");
        let html = format!(
            "<html><body style=\"margin:16px;\"><h1 style=\"color:red;\">Error</h1><p>{escaped}</p></body></html>"
        );
        self.state.status_text = message.to_string();
        if let Ok(dom) = self.html_parser.parse(&html) {
            self.state.dom = Some(dom.clone());
            self.state.stylesheet = Stylesheet::default();
            let styled = style_tree(&dom, &self.state.stylesheet);
            self.state.layout = build_layout(&styled, viewport_width);
            self.state.styled_root = Some(styled);
            self.state.scroll_y = 0.0;
        }
    }

    fn clamp_scroll(&mut self) {
        if self.state.scroll_y.is_sign_negative() {
            self.state.scroll_y = 0.0;
        }
    }

    fn parse_user_url(input: &str) -> Result<Url> {
        let trimmed = input.trim();
        if let Ok(url) = Url::parse(trimmed) {
            return Ok(url);
        }

        let with_scheme = format!("https://{trimmed}");
        Url::parse(&with_scheme).map_err(BrowserError::from)
    }
}

#[cfg(test)]
mod tests {
    use super::BrowserState;
    use url::Url;

    #[test]
    fn history_back_forward_stacks() {
        let mut state = BrowserState::default();
        let a = Url::parse("https://a.example").expect("valid URL");
        let b = Url::parse("https://b.example").expect("valid URL");

        state.current_url = Some(a.clone());
        state.history_back.push(a.clone());
        state.current_url = Some(b.clone());

        assert_eq!(state.history_back.len(), 1);
        assert_eq!(state.current_url, Some(b));
    }
}
