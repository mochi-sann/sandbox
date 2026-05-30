//! Painting (rasterization).
//!
//! This module walks the [`crate::layout`] tree to build a *display list* of
//! drawing commands, then rasterizes them into a pixel buffer ([`Canvas`]).
//!
//! The design follows Matt Brubeck's "Let's build a browser engine"
//! (robinson):
//! - [`build_display_list`] turns a [`LayoutBox`] tree into a flat
//!   [`DisplayList`] of [`DisplayCommand`]s (background fills and border edges).
//! - [`paint`] allocates a [`Canvas`] and executes each command, clipping to the
//!   canvas bounds.
//! - [`Canvas::to_image`] / [`Canvas::save_png`] convert the canvas to an
//!   [`image::RgbaImage`] and write it out as a PNG.
//!
//! The public entry point is [`paint`].

use std::path::Path;

use crate::css::{Color, Value};
use crate::font;
use crate::layout::{BoxType, LayoutBox, Rect};

/// A single drawing operation in a [`DisplayList`].
#[derive(Debug, Clone)]
pub enum DisplayCommand {
    /// Fill the given rectangle with a solid color.
    SolidColor(Color, Rect),
    /// Draw a run of text in `color`, with its left edge at `origin_x` and its
    /// baseline at `baseline_y`, rasterized at `font_size` pixels.
    Text {
        /// The text to draw (a single line).
        text: String,
        /// Fill color of the glyphs.
        color: Color,
        /// X coordinate of the run's left edge.
        origin_x: f32,
        /// Y coordinate of the text baseline.
        baseline_y: f32,
        /// Font size in pixels.
        font_size: f32,
    },
}

/// An ordered list of drawing commands, painted back-to-front.
pub type DisplayList = Vec<DisplayCommand>;

/// A rasterized pixel buffer. Pixels are stored row-major (`y * width + x`).
pub struct Canvas {
    /// The pixel buffer, one [`Color`] per pixel, row-major.
    pub pixels: Vec<Color>,
    /// Canvas width in pixels.
    pub width: usize,
    /// Canvas height in pixels.
    pub height: usize,
}

impl Canvas {
    /// Creates a `width` x `height` canvas filled with opaque white.
    pub fn new(width: usize, height: usize) -> Canvas {
        let white = Color {
            r: 255,
            g: 255,
            b: 255,
            a: 255,
        };
        Canvas {
            pixels: vec![white; width * height],
            width,
            height,
        }
    }

    /// Paints a single command onto the canvas, clipping to the canvas bounds.
    fn paint_item(&mut self, item: &DisplayCommand) {
        match item {
            DisplayCommand::SolidColor(color, rect) => {
                // Clip the rectangle to the canvas. Use `.max(0.0)` before the
                // cast so negative coordinates do not wrap around on `usize`.
                let x0 = rect.x.clamp(0.0, self.width as f32) as usize;
                let y0 = rect.y.clamp(0.0, self.height as f32) as usize;
                let x1 = (rect.x + rect.width).clamp(0.0, self.width as f32) as usize;
                let y1 = (rect.y + rect.height).clamp(0.0, self.height as f32) as usize;

                for y in y0..y1 {
                    for x in x0..x1 {
                        // No alpha blending yet: colors are opaque (a == 255).
                        self.pixels[y * self.width + x] = color.clone();
                    }
                }
            }
            DisplayCommand::Text {
                text,
                color,
                origin_x,
                baseline_y,
                font_size,
            } => {
                self.draw_text(text, color, *origin_x, *baseline_y, *font_size);
            }
        }
    }

    /// Rasterizes and alpha-blends a run of `text` onto the canvas, with its
    /// left edge at `origin_x` and baseline at `baseline_y`, at `font_size`
    /// pixels. Each glyph's coverage bitmap is blended over the existing pixels
    /// using `color`.
    fn draw_text(
        &mut self,
        text: &str,
        color: &Color,
        origin_x: f32,
        baseline_y: f32,
        font_size: f32,
    ) {
        let font = font::default_font();
        // Pen position advances per glyph along the baseline.
        let mut pen_x = origin_x;

        for ch in text.chars() {
            let glyph = font.rasterize(ch, font_size);

            // Top-left of the glyph bitmap in canvas space. `xmin` is the left
            // bearing; `top` is how far the bitmap top sits above the baseline.
            let gx = (pen_x + glyph.xmin).round() as i32;
            let gy = (baseline_y - glyph.top).round() as i32;

            for row in 0..glyph.height {
                for col in 0..glyph.width {
                    let coverage = glyph.bitmap[row * glyph.width + col];
                    if coverage == 0 {
                        continue;
                    }
                    let px = gx + col as i32;
                    let py = gy + row as i32;
                    if px < 0 || py < 0 || px >= self.width as i32 || py >= self.height as i32 {
                        continue;
                    }
                    let idx = py as usize * self.width + px as usize;
                    self.pixels[idx] = blend(color, coverage, &self.pixels[idx]);
                }
            }

            pen_x += glyph.advance;
        }
    }

    /// Converts the canvas to an [`image::RgbaImage`].
    pub fn to_image(&self) -> image::RgbaImage {
        let mut img = image::RgbaImage::new(self.width as u32, self.height as u32);
        for (i, color) in self.pixels.iter().enumerate() {
            let x = (i % self.width) as u32;
            let y = (i / self.width) as u32;
            img.put_pixel(x, y, image::Rgba([color.r, color.g, color.b, color.a]));
        }
        img
    }

    /// Saves the canvas to `path` as a PNG.
    pub fn save_png<P: AsRef<Path>>(&self, path: P) -> image::ImageResult<()> {
        self.to_image().save(path)
    }
}

/// Builds a flat [`DisplayList`] from a layout tree, in back-to-front order.
pub fn build_display_list(layout_root: &LayoutBox) -> DisplayList {
    let mut list = Vec::new();
    // Text color inherits down the tree; the document default is black.
    let black = Color {
        r: 0,
        g: 0,
        b: 0,
        a: 255,
    };
    render_layout_box(&mut list, layout_root, black);
    list
}

/// Appends the drawing commands for `layout_box` (and its children) to `list`.
///
/// `inherited_color` is the text color in effect from ancestors (CSS `color`
/// inherits); a box's own `color` property overrides it for itself and its
/// descendants.
fn render_layout_box(list: &mut DisplayList, layout_box: &LayoutBox, inherited_color: Color) {
    render_background(list, layout_box);
    render_borders(list, layout_box);

    // Resolve the effective text color for this box (own `color` wins).
    let color = get_color(layout_box, "color").unwrap_or(inherited_color);

    render_text(list, layout_box, &color);
    for child in &layout_box.children {
        render_layout_box(list, child, color.clone());
    }
}

/// Emits a [`DisplayCommand::Text`] for each positioned text fragment on the
/// box, using the effective inherited/own text `color`.
fn render_text(list: &mut DisplayList, layout_box: &LayoutBox, color: &Color) {
    for fragment in &layout_box.text_fragments {
        list.push(DisplayCommand::Text {
            text: fragment.text.clone(),
            color: color.clone(),
            origin_x: fragment.origin_x,
            baseline_y: fragment.baseline_y,
            font_size: fragment.font_size,
        });
    }
}

/// Emits a background fill covering the box's border area, if it has a
/// `background` (or `background-color`) color.
fn render_background(list: &mut DisplayList, layout_box: &LayoutBox) {
    if let Some(color) =
        get_color(layout_box, "background").or_else(|| get_color(layout_box, "background-color"))
    {
        list.push(DisplayCommand::SolidColor(
            color,
            layout_box.dimensions.border_box(),
        ));
    }
}

/// Emits the four border edges as solid-color rectangles, if the box has a
/// `border-color`.
fn render_borders(list: &mut DisplayList, layout_box: &LayoutBox) {
    let color = match get_color(layout_box, "border-color") {
        Some(color) => color,
        None => return, // No border color: nothing to draw.
    };

    let d = &layout_box.dimensions;
    let border_box = d.border_box();

    // Left edge.
    list.push(DisplayCommand::SolidColor(
        color.clone(),
        Rect {
            x: border_box.x,
            y: border_box.y,
            width: d.border.left,
            height: border_box.height,
        },
    ));

    // Right edge.
    list.push(DisplayCommand::SolidColor(
        color.clone(),
        Rect {
            x: border_box.x + border_box.width - d.border.right,
            y: border_box.y,
            width: d.border.right,
            height: border_box.height,
        },
    ));

    // Top edge.
    list.push(DisplayCommand::SolidColor(
        color.clone(),
        Rect {
            x: border_box.x,
            y: border_box.y,
            width: border_box.width,
            height: d.border.top,
        },
    ));

    // Bottom edge.
    list.push(DisplayCommand::SolidColor(
        color,
        Rect {
            x: border_box.x,
            y: border_box.y + border_box.height - d.border.bottom,
            width: border_box.width,
            height: d.border.bottom,
        },
    ));
}

/// Looks up a color-valued property (`name`) on the box's styled node, returning
/// `None` for anonymous blocks or non-color values.
fn get_color(layout_box: &LayoutBox, name: &str) -> Option<Color> {
    match layout_box.box_type {
        BoxType::BlockNode(style) | BoxType::InlineNode(style) => match style.value(name) {
            Some(Value::ColorValue(color)) => Some(color),
            _ => None,
        },
        // Anonymous blocks carry no style.
        BoxType::AnonymousBlock => None,
    }
}

/// Alpha-blends `src` over `dst` with the given 8-bit `coverage` (the glyph's
/// per-pixel alpha). Returns the resulting opaque color.
fn blend(src: &Color, coverage: u8, dst: &Color) -> Color {
    // Effective source alpha combines the glyph coverage with the color's own
    // alpha channel.
    let a = (coverage as f32 / 255.0) * (src.a as f32 / 255.0);
    let mix = |s: u8, d: u8| -> u8 {
        (s as f32 * a + d as f32 * (1.0 - a))
            .round()
            .clamp(0.0, 255.0) as u8
    };
    Color {
        r: mix(src.r, dst.r),
        g: mix(src.g, dst.g),
        b: mix(src.b, dst.b),
        a: 255,
    }
}

/// Rasterizes a layout tree into a [`Canvas`] of the given `bounds` size.
///
/// `bounds.width`/`bounds.height` determine the canvas size; `bounds.x`/`bounds.y`
/// are ignored (the layout tree is already in document coordinates).
pub fn paint(layout_root: &LayoutBox, bounds: Rect) -> Canvas {
    let display_list = build_display_list(layout_root);
    let mut canvas = Canvas::new(bounds.width as usize, bounds.height as usize);
    for item in &display_list {
        canvas.paint_item(item);
    }
    canvas
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::css;
    use crate::html;
    use crate::layout::{layout_tree, Dimensions};
    use crate::style::style_tree;

    /// A viewport `Dimensions` of the given content size.
    fn viewport(width: f32, height: f32) -> Dimensions {
        let mut d = Dimensions::default();
        d.content.width = width;
        d.content.height = height;
        d
    }

    /// Returns the canvas pixel at `(x, y)`.
    fn pixel_at(canvas: &Canvas, x: usize, y: usize) -> &Color {
        &canvas.pixels[y * canvas.width + x]
    }

    #[test]
    fn background_color_fills_box() {
        // A single block filling the whole viewport, painted red.
        let dom = html::parse("<div></div>".to_string());
        let sheet =
            css::parse("div { display: block; height: 50px; background: #ff0000; }".to_string());
        let styled = style_tree(&dom, &sheet);

        let bounds = Rect {
            x: 0.0,
            y: 0.0,
            width: 100.0,
            height: 100.0,
        };
        let layout_root = layout_tree(&styled, viewport(bounds.width, bounds.height));
        let canvas = paint(&layout_root, bounds);

        assert_eq!(canvas.width, 100);
        assert_eq!(canvas.height, 100);

        // Inside the box (width auto fills 100, height 50) -> red.
        let red = Color {
            r: 255,
            g: 0,
            b: 0,
            a: 255,
        };
        assert_eq!(pixel_at(&canvas, 10, 10), &red);
        assert_eq!(pixel_at(&canvas, 99, 49), &red);

        // Below the box (y >= 50) -> background white untouched.
        let white = Color {
            r: 255,
            g: 255,
            b: 255,
            a: 255,
        };
        assert_eq!(pixel_at(&canvas, 10, 80), &white);
    }

    #[test]
    fn border_is_painted_on_edges() {
        // A box with a blue background and a green 10px border on every side.
        let dom = html::parse("<div></div>".to_string());
        let sheet = css::parse(
            "div { display: block; width: 80px; height: 80px; \
             background: #0000ff; border-width: 10px; border-color: #00ff00; }"
                .to_string(),
        );
        let styled = style_tree(&dom, &sheet);

        let bounds = Rect {
            x: 0.0,
            y: 0.0,
            width: 100.0,
            height: 100.0,
        };
        let layout_root = layout_tree(&styled, viewport(bounds.width, bounds.height));
        let canvas = paint(&layout_root, bounds);

        let green = Color {
            r: 0,
            g: 255,
            b: 0,
            a: 255,
        };
        let blue = Color {
            r: 0,
            g: 0,
            b: 255,
            a: 255,
        };

        // Border box starts at x=0,y=0 (no margin), is 100x100 (80 content +
        // 2*10 border). The top-left corner is on the border -> green.
        assert_eq!(pixel_at(&canvas, 0, 0), &green);
        // A pixel within the left border strip (x < 10) -> green.
        assert_eq!(pixel_at(&canvas, 5, 50), &green);
        // Well inside the content area -> blue.
        assert_eq!(pixel_at(&canvas, 50, 50), &blue);
    }

    #[test]
    fn text_paints_non_background_pixels() {
        // A paragraph containing text on a white background. After painting,
        // some pixels must differ from the white background (glyph ink).
        let dom = html::parse("<div><p>Hello World</p></div>".to_string());
        let sheet = css::parse("div, p { display: block; } p { color: #000000; }".to_string());
        let styled = style_tree(&dom, &sheet);

        let bounds = Rect {
            x: 0.0,
            y: 0.0,
            width: 300.0,
            height: 100.0,
        };
        let layout_root = layout_tree(&styled, viewport(bounds.width, bounds.height));
        let canvas = paint(&layout_root, bounds);

        let white = Color {
            r: 255,
            g: 255,
            b: 255,
            a: 255,
        };
        let non_white = canvas.pixels.iter().filter(|c| **c != white).count();
        assert!(
            non_white > 0,
            "expected glyph ink (non-background pixels) from painted text"
        );
    }

    #[test]
    fn text_color_is_applied() {
        // Red text should produce pixels with a red component and no blue.
        let dom = html::parse("<p>iii</p>".to_string());
        let sheet = css::parse("p { display: block; color: #ff0000; }".to_string());
        let styled = style_tree(&dom, &sheet);

        let bounds = Rect {
            x: 0.0,
            y: 0.0,
            width: 200.0,
            height: 60.0,
        };
        let layout_root = layout_tree(&styled, viewport(bounds.width, bounds.height));
        let canvas = paint(&layout_root, bounds);

        // Red text over white leaves the red channel high while the green and
        // blue channels are pulled toward 0 wherever a glyph has coverage, so
        // some pixel must be clearly red-dominant (r > g and r > b).
        let has_red_ink = canvas.pixels.iter().any(|c| c.r > c.g && c.r > c.b);
        assert!(has_red_ink, "expected red-tinted glyph pixels");
    }
}
