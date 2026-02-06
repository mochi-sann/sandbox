use font8x8::{BASIC_FONTS, UnicodeFonts};
use tiny_skia::{Color as SkColor, Paint, PathBuilder, Pixmap, Rect as SkRect, Stroke, Transform};

use crate::layout::{Color, DrawCommand, LayoutTree, Rect};
use crate::ui::chrome::{ChromeState, CHROME_HEIGHT};

pub struct Frame {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u32>,
}

pub trait Renderer {
    fn render(&mut self, layout: &LayoutTree, chrome: &ChromeState, width: u32, height: u32, scroll_y: f32) -> Frame;
}

pub struct TinySkiaRenderer;

impl TinySkiaRenderer {
    pub fn new() -> Self {
        Self
    }
}

impl Renderer for TinySkiaRenderer {
    fn render(&mut self, layout: &LayoutTree, chrome: &ChromeState, width: u32, height: u32, scroll_y: f32) -> Frame {
        let mut pixmap = Pixmap::new(width.max(1), height.max(1)).expect("pixmap should be created");
        clear(&mut pixmap, Color::new(248, 249, 252, 255));

        draw_page(&mut pixmap, layout, scroll_y);
        draw_chrome(&mut pixmap, chrome, width as f32);

        Frame {
            width,
            height,
            pixels: rgba_to_xrgb(pixmap.data()),
        }
    }
}

fn draw_page(pixmap: &mut Pixmap, layout: &LayoutTree, scroll_y: f32) {
    for command in &layout.commands {
        match command {
            DrawCommand::FillRect { rect, color } => {
                draw_rect(
                    pixmap,
                    Rect {
                        x: rect.x,
                        y: rect.y + CHROME_HEIGHT - scroll_y,
                        width: rect.width,
                        height: rect.height,
                    },
                    *color,
                );
            }
            DrawCommand::StrokeRect { rect, color, width } => {
                draw_stroke_rect(
                    pixmap,
                    Rect {
                        x: rect.x,
                        y: rect.y + CHROME_HEIGHT - scroll_y,
                        width: rect.width,
                        height: rect.height,
                    },
                    *color,
                    *width,
                );
            }
            DrawCommand::Text {
                x,
                y,
                text,
                size_px,
                color,
            } => {
                draw_text(
                    pixmap,
                    *x,
                    *y + CHROME_HEIGHT - scroll_y,
                    text,
                    *size_px,
                    *color,
                );
            }
        }
    }
}

fn draw_chrome(pixmap: &mut Pixmap, chrome: &ChromeState, width: f32) {
    let rects = chrome.rects(width);
    let colors = ChromeState::palette();

    draw_rect(
        pixmap,
        Rect {
            x: 0.0,
            y: 0.0,
            width,
            height: CHROME_HEIGHT,
        },
        colors.bg,
    );
    draw_stroke_rect(
        pixmap,
        Rect {
            x: 0.0,
            y: 0.0,
            width,
            height: CHROME_HEIGHT,
        },
        colors.border,
        1.0,
    );

    for button in [rects.back, rects.forward, rects.reload] {
        draw_rect(pixmap, button, colors.button_bg);
        draw_stroke_rect(pixmap, button, colors.border, 1.0);
    }

    draw_rect(pixmap, rects.url, colors.url_bg);
    draw_stroke_rect(pixmap, rects.url, colors.border, 1.0);

    draw_text(pixmap, rects.back.x + 10.0, rects.back.y + 10.0, "<", 14.0, colors.text);
    draw_text(
        pixmap,
        rects.forward.x + 10.0,
        rects.forward.y + 10.0,
        ">",
        14.0,
        colors.text,
    );
    draw_text(
        pixmap,
        rects.reload.x + 8.0,
        rects.reload.y + 10.0,
        "R",
        14.0,
        colors.text,
    );
    draw_text(
        pixmap,
        rects.url.x + 8.0,
        rects.url.y + 10.0,
        &chrome.url_input,
        14.0,
        colors.text,
    );
}

fn draw_rect(pixmap: &mut Pixmap, rect: Rect, color: Color) {
    if rect.width <= 0.0 || rect.height <= 0.0 {
        return;
    }

    let Some(sk_rect) = SkRect::from_xywh(rect.x, rect.y, rect.width, rect.height) else {
        return;
    };

    let mut paint = Paint::default();
    paint.set_color(SkColor::from_rgba8(color.r, color.g, color.b, color.a));
    pixmap.fill_rect(sk_rect, &paint, Transform::identity(), None);
}

fn draw_stroke_rect(pixmap: &mut Pixmap, rect: Rect, color: Color, width: f32) {
    if width <= 0.0 || rect.width <= 0.0 || rect.height <= 0.0 {
        return;
    }

    let mut pb = PathBuilder::new();
    let Some(sk_rect) = SkRect::from_xywh(rect.x, rect.y, rect.width, rect.height) else {
        return;
    };
    pb.push_rect(sk_rect);
    let Some(path) = pb.finish() else {
        return;
    };

    let mut paint = Paint::default();
    paint.set_color(SkColor::from_rgba8(color.r, color.g, color.b, color.a));
    let stroke = Stroke {
        width,
        ..Stroke::default()
    };
    pixmap.stroke_path(&path, &paint, &stroke, Transform::identity(), None);
}

pub fn draw_text(pixmap: &mut Pixmap, x: f32, y: f32, text: &str, size_px: f32, color: Color) {
    let scale = (size_px / 8.0).max(1.0) as i32;
    let mut pen_x = x as i32;
    let pen_y = y as i32;

    for ch in text.chars() {
        if ch == '\n' {
            pen_x = x as i32;
            continue;
        }

        if let Some(glyph) = BASIC_FONTS.get(ch) {
            for (row, bits) in glyph.iter().enumerate() {
                for col in 0..8 {
                    if (bits >> col) & 1 == 1 {
                        fill_pixel_block(
                            pixmap,
                            pen_x + (col * scale as usize) as i32,
                            pen_y + (row * scale as usize) as i32,
                            scale,
                            color,
                        );
                    }
                }
            }
        }

        pen_x += 8 * scale;
    }
}

fn fill_pixel_block(pixmap: &mut Pixmap, x: i32, y: i32, scale: i32, color: Color) {
    let width = pixmap.width() as i32;
    let height = pixmap.height() as i32;
    for dy in 0..scale {
        for dx in 0..scale {
            let px = x + dx;
            let py = y + dy;
            if px < 0 || py < 0 || px >= width || py >= height {
                continue;
            }
            let idx = (py * width + px) as usize;
            pixmap.pixels_mut()[idx] =
                tiny_skia::PremultipliedColorU8::from_rgba(color.r, color.g, color.b, color.a)
                    .expect("valid RGBA");
        }
    }
}

fn clear(pixmap: &mut Pixmap, color: Color) {
    pixmap.fill(SkColor::from_rgba8(color.r, color.g, color.b, color.a));
}

fn rgba_to_xrgb(bytes: &[u8]) -> Vec<u32> {
    bytes
        .chunks_exact(4)
        .map(|rgba| {
            let r = rgba[0] as u32;
            let g = rgba[1] as u32;
            let b = rgba[2] as u32;
            (r << 16) | (g << 8) | b
        })
        .collect()
}
