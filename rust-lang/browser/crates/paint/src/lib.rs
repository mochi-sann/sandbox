//! Painting (rasterization), backed by [`tiny_skia`].
//!
//! This crate walks the [`browser_layout`] tree to build a *display list* of
//! drawing commands, then rasterizes them into a [`tiny_skia::Pixmap`].
//!
//! Pipeline:
//! - [`build_display_list`] turns a [`LayoutBox`] tree into a flat
//!   [`DisplayList`] of [`DisplayCommand`]s (background fills, border edges and
//!   positioned text runs).
//! - [`paint_pixmap`] allocates a [`tiny_skia::Pixmap`] and executes each
//!   command: solid rectangles are drawn with [`Pixmap::fill_rect`], and text is
//!   shaped (via [`browser_text`] / rustybuzz) and each glyph's coverage bitmap
//!   (rasterized by fontdue) is alpha-blended into the pixmap.
//! - [`pixmap_save_png`] / [`Pixmap::encode_png`] write PNGs (tiny-skia's own
//!   `png` encoder; no `image` dependency is required for output).
//!
//! Backwards compatibility: the original software [`Canvas`] type (a flat
//! `Vec<Color>` buffer) is retained and is what [`paint`] returns, so existing
//! consumers (the `shell` window, the CLI, tests) keep compiling unchanged. The
//! canvas is now produced *by* tiny-skia (rendered into a [`Pixmap`], then
//! converted back into opaque [`Color`] pixels).
//!
//! Public entry points:
//! - [`paint`] -> [`Canvas`] (compatibility; what the CLI / shell use today).
//! - [`paint_pixmap`] -> [`tiny_skia::Pixmap`] (the tiny-skia-native output).

use std::path::Path;

use browser_css::{Color, Value};
use browser_layout::{BoxType, LayoutBox, Rect};
use browser_text as font;
use tiny_skia::{
    Color as SkColor, IntSize, Paint, Pixmap, PremultipliedColorU8, Rect as SkRect, Transform,
};

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
///
/// This is the compatibility surface kept from the pre-tiny-skia design: it is
/// a flat `Vec<Color>` of opaque pixels. It is produced by converting a
/// rendered [`Pixmap`] (see [`canvas_from_pixmap`]); the `shell` crate blits it
/// to a window and tests index `pixels` directly.
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

    /// Converts the canvas to an [`image::RgbaImage`].
    ///
    /// Retained for callers that still want an `image` buffer; PNG output now
    /// goes through tiny-skia ([`Canvas::save_png`]).
    pub fn to_image(&self) -> image::RgbaImage {
        let mut img = image::RgbaImage::new(self.width as u32, self.height as u32);
        for (i, color) in self.pixels.iter().enumerate() {
            let x = (i % self.width) as u32;
            let y = (i / self.width) as u32;
            img.put_pixel(x, y, image::Rgba([color.r, color.g, color.b, color.a]));
        }
        img
    }

    /// Saves the canvas to `path` as a PNG, using tiny-skia's encoder.
    ///
    /// Returns an error string on failure (invalid size or I/O / encoding
    /// error).
    pub fn save_png<P: AsRef<Path>>(&self, path: P) -> Result<(), String> {
        let pixmap = self.to_pixmap()?;
        pixmap_save_png(&pixmap, path)
    }

    /// Builds a [`tiny_skia::Pixmap`] from this canvas's opaque pixels.
    fn to_pixmap(&self) -> Result<Pixmap, String> {
        let mut pixmap = new_pixmap(self.width, self.height)?;
        let dst = pixmap.pixels_mut();
        for (d, c) in dst.iter_mut().zip(self.pixels.iter()) {
            // Canvas colors are opaque, so premultiplication is the identity.
            *d = PremultipliedColorU8::from_rgba(c.r, c.g, c.b, 255)
                .unwrap_or_else(|| PremultipliedColorU8::from_rgba(0, 0, 0, 255).unwrap());
        }
        Ok(pixmap)
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

// ---------------------------------------------------------------------------
// tiny-skia rendering
// ---------------------------------------------------------------------------

/// Allocates a `width` x `height` [`Pixmap`] filled with opaque white.
///
/// Returns an error string if the dimensions are invalid for tiny-skia (zero or
/// overflowing).
fn new_pixmap(width: usize, height: usize) -> Result<Pixmap, String> {
    let w = u32::try_from(width).map_err(|_| "canvas width too large".to_string())?;
    let h = u32::try_from(height).map_err(|_| "canvas height too large".to_string())?;
    let size =
        IntSize::from_wh(w.max(1), h.max(1)).ok_or_else(|| "invalid canvas size".to_string())?;
    let mut pixmap = Pixmap::new(size.width(), size.height())
        .ok_or_else(|| "failed to allocate pixmap".to_string())?;
    pixmap.fill(SkColor::WHITE);
    Ok(pixmap)
}

/// Converts a CSS [`Color`] (straight-alpha 8-bit) into a tiny-skia
/// [`SkColor`].
fn sk_color(c: &Color) -> SkColor {
    SkColor::from_rgba8(c.r, c.g, c.b, c.a)
}

/// Rasterizes a layout tree into a [`tiny_skia::Pixmap`] of `width` x `height`
/// pixels.
///
/// This is the tiny-skia-native entry point. Coordinates in the layout tree are
/// already in document space; the pixmap origin is the top-left of the viewport
/// and content beyond the pixmap is clipped.
pub fn paint_pixmap(layout_root: &LayoutBox, width: usize, height: usize) -> Pixmap {
    let display_list = build_display_list(layout_root);
    // `new_pixmap` only fails on degenerate sizes; fall back to a 1x1 pixmap so
    // this entry point stays infallible for callers.
    let mut pixmap = new_pixmap(width, height)
        .or_else(|_| new_pixmap(1, 1))
        .expect("1x1 pixmap is always allocatable");

    for item in &display_list {
        paint_item(&mut pixmap, item);
    }
    pixmap
}

/// Renders the browser "chrome" — an address bar toolbar — into a freshly
/// allocated [`Pixmap`] of `width`x`height` pixels.
///
/// The toolbar has a flat background, an inset text field (its border turns blue
/// while `focused`), the `address` text, and a blinking-free caret drawn at the
/// end of the text when `focused`. The shell blits this above the page content
/// every frame, so it stays fixed while the document scrolls.
pub fn paint_address_bar(width: usize, height: usize, address: &str, focused: bool) -> Pixmap {
    let mut pixmap = new_pixmap(width, height)
        .or_else(|_| new_pixmap(1, 1))
        .expect("1x1 pixmap is always allocatable");

    let w = width as f32;
    let h = height as f32;

    // Toolbar background.
    let bar_bg = Color {
        r: 0xe8,
        g: 0xe8,
        b: 0xec,
        a: 255,
    };
    fill_rect(
        &mut pixmap,
        &bar_bg,
        &Rect {
            x: 0.0,
            y: 0.0,
            width: w,
            height: h,
        },
    );

    // Inset text field: a colored border rectangle with a white interior.
    let margin = 6.0;
    let field = Rect {
        x: margin,
        y: margin,
        width: (w - 2.0 * margin).max(0.0),
        height: (h - 2.0 * margin).max(0.0),
    };
    let border = if focused {
        Color {
            r: 0x1a,
            g: 0x73,
            b: 0xe8,
            a: 255,
        } // focus blue
    } else {
        Color {
            r: 0xb4,
            g: 0xb4,
            b: 0xbc,
            a: 255,
        } // idle gray
    };
    fill_rect(&mut pixmap, &border, &field);
    let inner = Rect {
        x: field.x + 1.5,
        y: field.y + 1.5,
        width: (field.width - 3.0).max(0.0),
        height: (field.height - 3.0).max(0.0),
    };
    let white = Color {
        r: 0xff,
        g: 0xff,
        b: 0xff,
        a: 255,
    };
    fill_rect(&mut pixmap, &white, &inner);

    // Address text, vertically centered in the field.
    let font_size = 15.0;
    let text_color = Color {
        r: 0x20,
        g: 0x20,
        b: 0x24,
        a: 255,
    };
    let pad_x = inner.x + 7.0;
    let f = font::default_font();
    let line_h = f.line_height(font_size);
    let ascent = f.ascent(font_size);
    let top = inner.y + ((inner.height - line_h) / 2.0).max(0.0);
    let baseline = top + ascent;
    draw_text(
        &mut pixmap,
        address,
        &text_color,
        pad_x,
        baseline,
        font_size,
    );

    // Caret at the end of the text while editing.
    if focused {
        let caret_x = pad_x + f.measure(address, font_size) + 1.0;
        let caret = Rect {
            x: caret_x,
            y: top + 1.0,
            width: 1.5,
            height: (line_h - 2.0).max(2.0),
        };
        fill_rect(&mut pixmap, &text_color, &caret);
    }

    pixmap
}

/// Draws a single [`DisplayCommand`] onto `pixmap`.
fn paint_item(pixmap: &mut Pixmap, item: &DisplayCommand) {
    match item {
        DisplayCommand::SolidColor(color, rect) => fill_rect(pixmap, color, rect),
        DisplayCommand::Text {
            text,
            color,
            origin_x,
            baseline_y,
            font_size,
        } => draw_text(pixmap, text, color, *origin_x, *baseline_y, *font_size),
    }
}

/// Fills `rect` with a solid `color` using tiny-skia's [`Pixmap::fill_rect`].
///
/// Degenerate rectangles (zero/negative width or height) are skipped, since
/// [`SkRect::from_xywh`] rejects them.
fn fill_rect(pixmap: &mut Pixmap, color: &Color, rect: &Rect) {
    if rect.width <= 0.0 || rect.height <= 0.0 {
        return;
    }
    let Some(sk_rect) = SkRect::from_xywh(rect.x, rect.y, rect.width, rect.height) else {
        return;
    };

    let mut paint = Paint::default();
    paint.set_color(sk_color(color));
    paint.anti_alias = false;

    pixmap.fill_rect(sk_rect, &paint, Transform::identity(), None);
}

/// Shapes and rasterizes a run of `text`, alpha-blending each glyph's coverage
/// bitmap into `pixmap` in `color`, with the run's left edge at `origin_x` and
/// baseline at `baseline_y`, at `font_size` pixels.
///
/// Shaping is done once with rustybuzz (via [`browser_text`]), and each shaped
/// glyph is rasterized by id (fontdue) and blended pixel-by-pixel. Glyph
/// positions use the shaped advances/offsets so kerning is respected.
fn draw_text(
    pixmap: &mut Pixmap,
    text: &str,
    color: &Color,
    origin_x: f32,
    baseline_y: f32,
    font_size: f32,
) {
    let font = font::default_font();
    let run = font.shape(text, font_size);

    let pix_w = pixmap.width() as i32;
    let pix_h = pixmap.height() as i32;
    let data = pixmap.pixels_mut();

    // Pen position advances per glyph along the baseline.
    let mut pen_x = origin_x;

    for shaped in &run.glyphs {
        let glyph = font.rasterize_glyph(shaped.glyph_id, font_size);

        // Top-left of the glyph bitmap in pixmap space. `xmin` is the left
        // bearing; `top` is how far the bitmap top sits above the baseline.
        // Shaped `x_offset`/`y_offset` nudge the draw position (y is up).
        let gx = (pen_x + shaped.x_offset + glyph.xmin).round() as i32;
        let gy = (baseline_y - shaped.y_offset - glyph.top).round() as i32;

        for row in 0..glyph.height {
            for col in 0..glyph.width {
                let coverage = glyph.bitmap[row * glyph.width + col];
                if coverage == 0 {
                    continue;
                }
                let px = gx + col as i32;
                let py = gy + row as i32;
                if px < 0 || py < 0 || px >= pix_w || py >= pix_h {
                    continue;
                }
                let idx = py as usize * pix_w as usize + px as usize;
                data[idx] = blend_pixel(color, coverage, data[idx]);
            }
        }

        pen_x += shaped.x_advance;
    }
}

/// Alpha-blends a glyph pixel of straight-alpha `src` color with the given 8-bit
/// `coverage` over the existing premultiplied `dst` pixel, returning the new
/// premultiplied pixel.
///
/// The pixmap is always opaque (it starts as opaque white and only opaque fills
/// are drawn), so `dst` is treated as an opaque background and the result is
/// kept opaque; premultiplied == straight for opaque colors.
fn blend_pixel(src: &Color, coverage: u8, dst: PremultipliedColorU8) -> PremultipliedColorU8 {
    // Effective source alpha combines the glyph coverage with the color's own
    // alpha channel.
    let a = (coverage as f32 / 255.0) * (src.a as f32 / 255.0);
    let mix = |s: u8, d: u8| -> u8 {
        (s as f32 * a + d as f32 * (1.0 - a))
            .round()
            .clamp(0.0, 255.0) as u8
    };
    let r = mix(src.r, dst.red());
    let g = mix(src.g, dst.green());
    let b = mix(src.b, dst.blue());
    // Opaque result -> premultiplied equals straight.
    PremultipliedColorU8::from_rgba(r, g, b, 255)
        .unwrap_or_else(|| PremultipliedColorU8::from_rgba(0, 0, 0, 255).unwrap())
}

/// Converts a rendered [`Pixmap`] back into a [`Canvas`] of opaque [`Color`]
/// pixels (the compatibility buffer the shell/CLI consume).
///
/// Pixmap pixels are premultiplied; since everything we draw is opaque the
/// stored RGB already equals the straight color, so we copy it directly and set
/// alpha to 255.
pub fn canvas_from_pixmap(pixmap: &Pixmap) -> Canvas {
    let width = pixmap.width() as usize;
    let height = pixmap.height() as usize;
    let pixels = pixmap
        .pixels()
        .iter()
        .map(|p| Color {
            r: p.red(),
            g: p.green(),
            b: p.blue(),
            a: 255,
        })
        .collect();
    Canvas {
        pixels,
        width,
        height,
    }
}

/// Converts a [`Pixmap`] into a softbuffer-compatible `u32` pixel buffer.
///
/// Each output pixel packs the (premultiplied, but opaque so identical to
/// straight) color as `0x00RRGGBB`, the layout softbuffer reads (the high byte
/// is ignored). The returned vector has `width * height` elements, row-major.
pub fn pixmap_to_u32(pixmap: &Pixmap) -> Vec<u32> {
    pixmap
        .pixels()
        .iter()
        .map(|p| {
            let r = p.red() as u32;
            let g = p.green() as u32;
            let b = p.blue() as u32;
            (r << 16) | (g << 8) | b
        })
        .collect()
}

/// Saves a [`Pixmap`] to `path` as a PNG using tiny-skia's encoder.
pub fn pixmap_save_png<P: AsRef<Path>>(pixmap: &Pixmap, path: P) -> Result<(), String> {
    pixmap
        .save_png(path)
        .map_err(|e| format!("failed to encode/write PNG: {e}"))
}

/// Rasterizes a layout tree into a [`Canvas`] of the given `bounds` size.
///
/// Compatibility entry point: renders with tiny-skia ([`paint_pixmap`]) and
/// converts the result back into the flat [`Canvas`] buffer the CLI / shell /
/// tests use. `bounds.x`/`bounds.y` are ignored (the layout tree is already in
/// document coordinates).
pub fn paint(layout_root: &LayoutBox, bounds: Rect) -> Canvas {
    let pixmap = paint_pixmap(layout_root, bounds.width as usize, bounds.height as usize);
    canvas_from_pixmap(&pixmap)
}

#[cfg(test)]
mod tests {
    use super::*;
    use browser_css as css;
    use browser_html as html;
    use browser_layout::{layout_tree, Dimensions};
    use browser_style::style_tree;

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
    fn pixmap_solid_rect_has_expected_color() {
        // Draw a single red rectangle directly onto a pixmap and check a pixel
        // inside it (tiny-skia fill_rect path).
        let mut pixmap = new_pixmap(20, 20).unwrap();
        let red = Color {
            r: 255,
            g: 0,
            b: 0,
            a: 255,
        };
        fill_rect(
            &mut pixmap,
            &red,
            &Rect {
                x: 5.0,
                y: 5.0,
                width: 10.0,
                height: 10.0,
            },
        );

        let canvas = canvas_from_pixmap(&pixmap);
        assert_eq!(pixel_at(&canvas, 10, 10), &red);
        // A corner outside the rect stays white.
        let white = Color {
            r: 255,
            g: 255,
            b: 255,
            a: 255,
        };
        assert_eq!(pixel_at(&canvas, 0, 0), &white);
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

    #[test]
    fn pixmap_to_u32_packs_rrggbb() {
        let mut pixmap = new_pixmap(2, 1).unwrap();
        // Fill the whole pixmap with a known color.
        fill_rect(
            &mut pixmap,
            &Color {
                r: 0x12,
                g: 0x34,
                b: 0x56,
                a: 255,
            },
            &Rect {
                x: 0.0,
                y: 0.0,
                width: 2.0,
                height: 1.0,
            },
        );
        let buf = pixmap_to_u32(&pixmap);
        assert_eq!(buf.len(), 2);
        assert_eq!(buf[0], 0x0012_3456);
    }
}
