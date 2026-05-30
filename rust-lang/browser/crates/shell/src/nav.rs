//! Window-free navigation: the rendering pipeline, hyperlink hit-testing, and
//! browser session state (current URL + history).
//!
//! Everything in this module is deliberately independent of `winit`/`softbuffer`
//! so it can be unit-tested without opening a window or touching a display
//! server. The native window in [`crate`] drives this module: it asks
//! [`BrowserState`] to [`load`](BrowserState::load) a URL (producing a painted
//! [`Page`]), and on a mouse click it calls [`hit_test`] to discover which link
//! (if any) was clicked, then loads the resolved target.

use browser_dom::{Node, NodeType};
use browser_layout::{layout_tree, BoxType, Dimensions, LayoutBox, Rect};
use browser_net::{self as net, Url};
use browser_paint::paint_pixmap;
use browser_style::{style_tree, StyledNode};
use tiny_skia::Pixmap;

/// A default user-agent stylesheet applied when a page links no CSS of its own.
///
/// It gives the common block-level elements `display: block`, styles links with
/// the conventional blue, and sets a light page background so text is legible.
/// Author CSS (when present) is appended after this so it wins on equal
/// specificity (later source order).
pub const DEFAULT_UA_CSS: &str = r#"
html, body, div, p, h1, h2, h3, h4, h5, h6, ul, ol, li, section, article,
header, footer, nav, main, blockquote, pre { display: block; }
body { background: #ffffff; color: #111111; padding: 8px; }
a { color: #1a0dab; display: inline; }
h1 { font-size: 32px; }
h2 { font-size: 24px; }
h3 { font-size: 20px; }
"#;

/// A rectangular hyperlink hit area in document (layout) coordinates, paired with
/// the raw (unresolved) `href` of the `<a>` element that produced it.
#[derive(Debug, Clone, PartialEq)]
pub struct LinkArea {
    /// The border box of the link's layout box, in document pixels.
    pub rect: Rect,
    /// The raw `href` attribute value (may be relative; resolve against the page
    /// URL before fetching).
    pub href: String,
}

/// A fully rendered page: the rasterized pixmap plus the link hit areas and the
/// document size. This is an *owned* snapshot — it borrows nothing from the DOM
/// or style tree — so the window can hold it across event-loop iterations.
pub struct Page {
    /// The URL this page was loaded from (after redirects, when known).
    pub url: Url,
    /// The painted pixels.
    pub pixmap: Pixmap,
    /// Clickable link rectangles, in document coordinates.
    pub links: Vec<LinkArea>,
    /// The full laid-out document height in pixels (may exceed the pixmap).
    pub doc_height: f32,
}

/// Returns the `href` of the link whose border box contains the point
/// (`x`, `y`), or `None` if the point is not over any link.
///
/// Coordinates are in document space (the same space the layout tree uses).
/// When links nest, the deepest (most specific) matching link wins. This is the
/// pure hit-test used by the window on a mouse click; it needs no window and is
/// unit-tested directly.
pub fn hit_test(layout: &LayoutBox, x: f32, y: f32) -> Option<String> {
    let mut found: Option<String> = None;
    hit_test_into(layout, x, y, None, &mut found);
    found
}

/// Recursive helper for [`hit_test`]. `current_href` carries the `href` of the
/// nearest `<a>` ancestor so inline text inside the link still hits. The last
/// (deepest) box that both contains the point and is inside a link wins, which
/// is written into `found`.
fn hit_test_into(
    layout: &LayoutBox,
    x: f32,
    y: f32,
    current_href: Option<&str>,
    found: &mut Option<String>,
) {
    // If this box is an <a href>, it (and its subtree) belong to that link.
    let href_here = link_href(layout);
    let active = href_here.as_deref().or(current_href);

    let rect = layout.dimensions.border_box();
    if let Some(href) = active {
        if point_in_rect(rect, x, y) {
            // Deepest match wins: overwrite on the way down.
            *found = Some(href.to_string());
        }
    }

    for child in &layout.children {
        hit_test_into(child, x, y, active, found);
    }
}

/// Walks the whole layout tree and collects an owned list of every link's
/// border box. Used to build a [`Page`] snapshot the window can hit-test against
/// after the borrowed style/layout trees are dropped.
pub fn collect_links(layout: &LayoutBox) -> Vec<LinkArea> {
    let mut out = Vec::new();
    collect_links_into(layout, None, &mut out);
    out
}

fn collect_links_into(layout: &LayoutBox, current_href: Option<&str>, out: &mut Vec<LinkArea>) {
    let href_here = link_href(layout);
    let active = href_here.as_deref().or(current_href);

    if let Some(href) = href_here.as_deref() {
        out.push(LinkArea {
            rect: layout.dimensions.border_box(),
            href: href.to_string(),
        });
    }

    for child in &layout.children {
        collect_links_into(child, active, out);
    }
}

/// Hit-tests an owned [`LinkArea`] list (a page snapshot). Later entries are the
/// deeper/inner links, so a reverse scan returns the most specific match.
pub fn hit_test_links(links: &[LinkArea], x: f32, y: f32) -> Option<&str> {
    links
        .iter()
        .rev()
        .find(|l| point_in_rect(l.rect, x, y))
        .map(|l| l.href.as_str())
}

/// Returns the `href` of this layout box if it renders an `<a>` element that has
/// a non-empty `href` attribute.
fn link_href(layout: &LayoutBox) -> Option<String> {
    let style = match &layout.box_type {
        BoxType::BlockNode(s) | BoxType::InlineNode(s) => *s,
        BoxType::AnonymousBlock => return None,
    };
    element_href(style.node)
}

/// Returns the `href` of `node` if it is an `<a>` element with a non-empty
/// `href` attribute.
fn element_href(node: &Node) -> Option<String> {
    if let NodeType::Element(elem) = &node.node_type {
        if elem.tag_name.eq_ignore_ascii_case("a") {
            if let Some(href) = elem.attributes.get("href") {
                let trimmed = href.trim();
                if !trimmed.is_empty() {
                    return Some(trimmed.to_string());
                }
            }
        }
    }
    None
}

/// Returns whether the point (`x`, `y`) lies within `rect` (inclusive of the
/// top-left edge, exclusive of the bottom-right).
fn point_in_rect(rect: Rect, x: f32, y: f32) -> bool {
    x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height
}

/// Builds a viewport (initial containing block) of the given pixel size.
fn viewport(width: f32, height: f32) -> Dimensions {
    Dimensions {
        content: Rect {
            x: 0.0,
            y: 0.0,
            width,
            height,
        },
        ..Default::default()
    }
}

/// The browser session: the page currently shown plus the back history.
///
/// `history` holds previously visited URLs (oldest first); `current_url` is the
/// page on screen. [`load`](Self::load) pushes the old current URL onto the
/// history and renders the new one; [`back`](Self::back) pops it.
#[derive(Debug, Default)]
pub struct BrowserState {
    /// The URL of the page currently displayed, if any has been loaded.
    pub current_url: Option<Url>,
    /// Previously visited URLs, oldest first (used by [`back`](Self::back)).
    pub history: Vec<Url>,
}

impl BrowserState {
    /// Creates an empty session with no current page and no history.
    pub fn new() -> BrowserState {
        BrowserState::default()
    }

    /// Resolves `target` (an absolute URL string, a `file://` URL, or a local
    /// path) into an absolute [`Url`], using the current page as the base for
    /// relative references when one is loaded.
    ///
    /// Absolute `http(s)`/`file` URLs are parsed directly; a bare local path is
    /// turned into a `file://` URL; anything else is joined onto `current_url`.
    pub fn resolve_target(&self, target: &str) -> Result<Url, net::NetError> {
        if let Some(base) = &self.current_url {
            // With a page loaded, treat the input as a (possibly relative) href.
            return net::resolve(base, target);
        }
        url_from_input(target)
    }

    /// Loads and renders `url` into a painted [`Page`] of `width`x`height`
    /// pixels, recording the previous page (if any) in [`history`](Self::history)
    /// and updating [`current_url`](Self::current_url).
    ///
    /// The pipeline is: fetch -> decode -> parse HTML -> parse CSS (UA default +
    /// any author `<style>` found in the document) -> style tree -> layout ->
    /// paint. The pixmap is the viewport-sized top of the document; the page's
    /// links and full document height are recorded for hit-testing and scrolling.
    pub fn load(&mut self, url: Url, width: u32, height: u32) -> Result<Page, LoadError> {
        let resource = net::fetch_resource(&url).map_err(LoadError::Net)?;
        let final_url = resource.final_url.clone();
        let html_source = net::decode_text(&resource);

        let page = render(&final_url, &html_source, width, height);

        // Record navigation: the page we were on moves into history.
        if let Some(prev) = self.current_url.replace(final_url) {
            self.history.push(prev);
        }
        Ok(page)
    }

    /// Whether [`back`](Self::back) has somewhere to go.
    pub fn can_go_back(&self) -> bool {
        !self.history.is_empty()
    }

    /// Returns the previous URL (popping it from history) without rendering, and
    /// makes it current. The window is responsible for re-loading it. Returns
    /// `None` when the history is empty.
    pub fn back(&mut self) -> Option<Url> {
        let prev = self.history.pop()?;
        self.current_url = Some(prev.clone());
        Some(prev)
    }
}

/// Renders an already-fetched HTML document (with `base_url` used only to label
/// the resulting [`Page`]) to a painted page snapshot.
///
/// This is the borrow-heavy core: the DOM, stylesheet, style tree and layout
/// tree are all built and dropped here, leaving only the owned [`Page`].
pub fn render(base_url: &Url, html_source: &str, width: u32, height: u32) -> Page {
    let dom = browser_html::parse(html_source.to_string());

    // Combine the UA default stylesheet with any author CSS extracted from the
    // document, so author rules (appended last) win on equal specificity.
    let mut css_source = String::from(DEFAULT_UA_CSS);
    css_source.push('\n');
    css_source.push_str(&extract_inline_css(&dom));
    let stylesheet = browser_css::parse(css_source);

    let style_root: StyledNode = style_tree(&dom, &stylesheet);
    let vp = viewport(width as f32, height as f32);
    let layout_root = layout_tree(&style_root, vp);

    let links = collect_links(&layout_root);
    let doc_height = layout_root.dimensions.margin_box().height;
    let pixmap = paint_pixmap(&layout_root, width as usize, height as usize);

    Page {
        url: base_url.clone(),
        pixmap,
        links,
        doc_height,
    }
}

/// Collects the text of every `<style>` element in the document, concatenated,
/// so a single self-contained HTML file can carry its own CSS.
fn extract_inline_css(node: &Node) -> String {
    let mut css = String::new();
    collect_inline_css(node, false, &mut css);
    css
}

fn collect_inline_css(node: &Node, in_style: bool, out: &mut String) {
    match &node.node_type {
        NodeType::Element(elem) => {
            let is_style = elem.tag_name.eq_ignore_ascii_case("style");
            for child in &node.children {
                collect_inline_css(child, in_style || is_style, out);
            }
        }
        NodeType::Text(text) => {
            if in_style {
                out.push_str(text);
                out.push('\n');
            }
        }
    }
}

/// Turns a command-line target (an absolute URL or a local filesystem path) into
/// an absolute [`Url`]. http(s)/file URLs parse directly; everything else is
/// treated as a local path and canonicalized into a `file://` URL.
pub fn url_from_input(input: &str) -> Result<Url, net::NetError> {
    if net::is_url(input) || input.starts_with("file://") {
        return net::parse_url(input);
    }
    // Treat as a local path: make absolute, then build a file:// URL.
    let path = std::path::Path::new(input);
    let abs = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()
            .map_err(|e| net::NetError::Io(e.to_string()))?
            .join(path)
    };
    Url::from_file_path(&abs)
        .map_err(|()| net::NetError::InvalidUrl(format!("not a valid file path: {}", abs.display())))
}

/// Errors that can occur while loading a page.
#[derive(Debug)]
pub enum LoadError {
    /// A network/IO error while fetching the resource.
    Net(net::NetError),
}

impl std::fmt::Display for LoadError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LoadError::Net(e) => write!(f, "{e}"),
        }
    }
}

impl std::error::Error for LoadError {}

#[cfg(test)]
mod tests {
    use super::*;
    use browser_css as css;
    use browser_html as html;
    use browser_style::style_tree;

    fn vp(w: f32, h: f32) -> Dimensions {
        viewport(w, h)
    }

    #[test]
    fn hit_test_finds_link_by_point() {
        let dom = html::parse(
            r#"<div><a href="https://example.com/">click</a></div>"#.to_string(),
        );
        let sheet = css::parse(
            "div { display: block; } a { display: block; height: 20px; }".to_string(),
        );
        let styled = style_tree(&dom, &sheet);
        let layout = layout_tree(&styled, vp(800.0, 600.0));

        // The link is the first block child, at the top-left.
        let href = hit_test(&layout, 5.0, 5.0);
        assert_eq!(href.as_deref(), Some("https://example.com/"));
    }

    #[test]
    fn hit_test_misses_outside_link() {
        let dom = html::parse(
            r#"<div><a href="https://example.com/" >click</a></div>"#.to_string(),
        );
        let sheet = css::parse(
            "div { display: block; } a { display: block; height: 20px; }".to_string(),
        );
        let styled = style_tree(&dom, &sheet);
        let layout = layout_tree(&styled, vp(800.0, 600.0));

        // Far below the 20px-tall link: no hit.
        let href = hit_test(&layout, 5.0, 500.0);
        assert_eq!(href, None);
    }

    #[test]
    fn hit_test_ignores_anchor_without_href() {
        let dom = html::parse(r#"<div><a>no href</a></div>"#.to_string());
        let sheet = css::parse(
            "div { display: block; } a { display: block; height: 20px; }".to_string(),
        );
        let styled = style_tree(&dom, &sheet);
        let layout = layout_tree(&styled, vp(800.0, 600.0));

        assert_eq!(hit_test(&layout, 5.0, 5.0), None);
    }

    #[test]
    fn collect_links_records_each_anchor() {
        let dom = html::parse(
            r#"<div><a href="/a">a</a><a href="/b">b</a></div>"#.to_string(),
        );
        let sheet = css::parse(
            "div { display: block; } a { display: block; height: 10px; }".to_string(),
        );
        let styled = style_tree(&dom, &sheet);
        let layout = layout_tree(&styled, vp(800.0, 600.0));

        let links = collect_links(&layout);
        let hrefs: Vec<&str> = links.iter().map(|l| l.href.as_str()).collect();
        assert!(hrefs.contains(&"/a"));
        assert!(hrefs.contains(&"/b"));
    }

    #[test]
    fn hit_test_links_snapshot_matches_pure_hit_test() {
        let dom = html::parse(
            r#"<div><a href="/a">a</a><a href="/b">b</a></div>"#.to_string(),
        );
        let sheet = css::parse(
            "div { display: block; } a { display: block; height: 10px; }".to_string(),
        );
        let styled = style_tree(&dom, &sheet);
        let layout = layout_tree(&styled, vp(800.0, 600.0));
        let links = collect_links(&layout);

        // First link occupies y in [0,10), second in [10,20).
        assert_eq!(hit_test_links(&links, 1.0, 1.0), Some("/a"));
        assert_eq!(hit_test_links(&links, 1.0, 15.0), Some("/b"));
        assert_eq!(hit_test_links(&links, 1.0, 100.0), None);
    }

    #[test]
    fn resolve_target_joins_relative_against_current() {
        let mut state = BrowserState::new();
        state.current_url = Some(net::parse_url("https://example.com/a/b.html").unwrap());
        let resolved = state.resolve_target("../c.html").unwrap();
        assert_eq!(resolved.as_str(), "https://example.com/c.html");
    }

    #[test]
    fn resolve_target_absolute_url_without_base() {
        let state = BrowserState::new();
        let resolved = state.resolve_target("https://example.com/x").unwrap();
        assert_eq!(resolved.as_str(), "https://example.com/x");
    }

    #[test]
    fn url_from_input_makes_file_url_for_path() {
        let url = url_from_input("/tmp/page.html").unwrap();
        assert_eq!(url.scheme(), "file");
        assert!(url.path().ends_with("/tmp/page.html"));
    }

    #[test]
    fn extract_inline_css_reads_style_element() {
        let dom = html::parse(
            "<html><head><style>p { color: red; }</style></head><body></body></html>".to_string(),
        );
        let css = extract_inline_css(&dom);
        assert!(css.contains("color: red"));
    }

    #[test]
    fn render_self_contained_page_collects_links() {
        let url = net::parse_url("https://example.com/").unwrap();
        let page = render(
            &url,
            r#"<html><body><a href="/next">go</a></body></html>"#,
            400,
            300,
        );
        assert_eq!(page.pixmap.width(), 400);
        assert_eq!(page.pixmap.height(), 300);
        let hrefs: Vec<&str> = page.links.iter().map(|l| l.href.as_str()).collect();
        assert!(hrefs.contains(&"/next"));
    }
}
