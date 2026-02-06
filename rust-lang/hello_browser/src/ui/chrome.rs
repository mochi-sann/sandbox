use crate::layout::{Color, Rect};

pub const CHROME_HEIGHT: f32 = 44.0;

#[derive(Debug, Clone)]
pub struct ChromeRects {
    pub back: Rect,
    pub forward: Rect,
    pub reload: Rect,
    pub url: Rect,
}

#[derive(Debug, Clone)]
pub enum ChromeAction {
    Navigate(String),
    Back,
    Forward,
    Reload,
}

#[derive(Debug, Clone)]
pub struct ChromeState {
    pub url_input: String,
    pub editing: bool,
}

impl ChromeState {
    pub fn new() -> Self {
        Self {
            url_input: "about:blank".to_string(),
            editing: false,
        }
    }

    pub fn sync_url(&mut self, url: &str) {
        if !self.editing {
            self.url_input = url.to_string();
        }
    }

    pub fn rects(&self, width: f32) -> ChromeRects {
        let button_w = 34.0;
        let pad = 6.0;
        ChromeRects {
            back: Rect {
                x: pad,
                y: pad,
                width: button_w,
                height: CHROME_HEIGHT - pad * 2.0,
            },
            forward: Rect {
                x: pad + button_w + 4.0,
                y: pad,
                width: button_w,
                height: CHROME_HEIGHT - pad * 2.0,
            },
            reload: Rect {
                x: pad + (button_w + 4.0) * 2.0,
                y: pad,
                width: button_w,
                height: CHROME_HEIGHT - pad * 2.0,
            },
            url: Rect {
                x: pad + (button_w + 4.0) * 3.0 + 2.0,
                y: pad,
                width: (width - (pad + (button_w + 4.0) * 3.0 + 8.0)).max(10.0),
                height: CHROME_HEIGHT - pad * 2.0,
            },
        }
    }

    pub fn on_mouse_down(&mut self, x: f32, y: f32, width: f32) -> Option<ChromeAction> {
        let rects = self.rects(width);
        if contains(rects.back, x, y) {
            self.editing = false;
            return Some(ChromeAction::Back);
        }
        if contains(rects.forward, x, y) {
            self.editing = false;
            return Some(ChromeAction::Forward);
        }
        if contains(rects.reload, x, y) {
            self.editing = false;
            return Some(ChromeAction::Reload);
        }
        if contains(rects.url, x, y) {
            self.editing = true;
            return None;
        }
        self.editing = false;
        None
    }

    pub fn on_text(&mut self, text: &str) {
        if self.editing {
            self.url_input.push_str(text);
        }
    }

    pub fn on_backspace(&mut self) {
        if self.editing {
            self.url_input.pop();
        }
    }

    pub fn on_enter(&mut self) -> Option<ChromeAction> {
        if self.editing {
            self.editing = false;
            return Some(ChromeAction::Navigate(self.url_input.trim().to_string()));
        }
        None
    }

    pub fn palette() -> ChromePalette {
        ChromePalette {
            bg: Color::new(236, 238, 242, 255),
            button_bg: Color::new(245, 247, 250, 255),
            border: Color::new(180, 184, 194, 255),
            text: Color::new(32, 36, 40, 255),
            url_bg: Color::WHITE,
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct ChromePalette {
    pub bg: Color,
    pub button_bg: Color,
    pub border: Color,
    pub text: Color,
    pub url_bg: Color,
}

fn contains(rect: Rect, x: f32, y: f32) -> bool {
    x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}
