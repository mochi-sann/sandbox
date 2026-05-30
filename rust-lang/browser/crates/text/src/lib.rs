//! Font loading, shaping, measurement and glyph rasterization.
//!
//! This crate combines two libraries:
//! - [`rustybuzz`] (a pure-Rust HarfBuzz port) performs **text shaping**:
//!   turning a Unicode string into a sequence of positioned glyphs
//!   ([`ShapedGlyph`]) with proper advances/offsets. This is what
//!   measurement and line-wrapping in the layout stage build on.
//! - [`fontdue`] performs **rasterization**: turning a single glyph (by glyph
//!   id) into an 8-bit coverage bitmap ([`Glyph`]) for painting.
//!
//! Both are driven from the same embedded font bytes (DejaVu Sans), bundled via
//! [`include_bytes!`] so the engine is self-contained and independent of the
//! working directory.
//!
//! Responsibilities:
//! - [`Font::default_font`] / [`default_font`]: a process-wide shared instance.
//! - [`Font::shape`]: shape a string into a [`ShapedRun`] (glyphs + total
//!   advance width) at a given pixel size.
//! - [`Font::measure`] / [`Font::text_width`]: advance width of a string at a
//!   given pixel size (used by inline layout to wrap text); `measure` is the
//!   shaping-based name, `text_width` is kept as an alias for compatibility.
//! - [`Font::line_height`] / [`Font::ascent`]: vertical metrics.
//! - [`Font::rasterize`] / [`Font::rasterize_glyph`]: rasterize a single
//!   character or shaped glyph into a [`Glyph`] (metrics plus an 8-bit
//!   coverage/alpha bitmap), used by painting.

use std::sync::OnceLock;

use fontdue::{Font as FontdueFont, FontSettings};
use rustybuzz::{Face as RbFace, UnicodeBuffer};

/// The embedded default font (DejaVu Sans), copied into `assets/` at build
/// time so the engine is self-contained and independent of the working
/// directory.
const DEFAULT_FONT_BYTES: &[u8] = include_bytes!("../assets/DejaVuSans.ttf");

/// The default font size, in pixels, used when CSS does not specify
/// `font-size`.
pub const DEFAULT_FONT_SIZE: f32 = 16.0;

/// A single shaped glyph produced by [`Font::shape`].
///
/// Positions are already scaled to the requested pixel `font_size` (rustybuzz
/// works in font design units; we scale by `font_size / units_per_em`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ShapedGlyph {
    /// The glyph id (index into the font), as resolved by shaping. Pass this to
    /// [`Font::rasterize_glyph`] to draw it.
    pub glyph_id: u16,
    /// Horizontal advance in pixels: how far the pen moves after this glyph.
    pub x_advance: f32,
    /// Horizontal offset in pixels applied to the glyph's draw position.
    pub x_offset: f32,
    /// Vertical offset in pixels applied to the glyph's draw position
    /// (positive = up, following the shaping convention).
    pub y_offset: f32,
    /// The byte index in the original string this glyph derives from (the
    /// shaping "cluster"). Useful for hit-testing / mapping back to text.
    pub cluster: u32,
}

/// The result of shaping a run of text: the positioned [`ShapedGlyph`]s plus
/// the total advance width (sum of `x_advance`) in pixels.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct ShapedRun {
    /// The shaped glyphs, in visual order.
    pub glyphs: Vec<ShapedGlyph>,
    /// Total advance width in pixels (sum of every glyph's `x_advance`).
    pub width: f32,
}

/// A rasterized glyph: its placement metrics together with an 8-bit coverage
/// bitmap (one alpha byte per pixel, row-major).
#[derive(Debug, Clone)]
pub struct Glyph {
    /// Bitmap width in pixels.
    pub width: usize,
    /// Bitmap height in pixels.
    pub height: usize,
    /// Horizontal advance: how far the pen moves after drawing this glyph.
    pub advance: f32,
    /// Left bearing: x offset from the pen position to the bitmap's left edge.
    pub xmin: f32,
    /// Distance from the baseline up to the top of the bitmap (positive = up).
    /// Combine with the pen's baseline to find the bitmap's top row.
    pub top: f32,
    /// Coverage bitmap, one alpha byte (`0..=255`) per pixel, row-major
    /// (`y * width + x`).
    pub bitmap: Vec<u8>,
}

/// A loaded font.
///
/// Holds the raw font bytes (owned) so we can both rasterize via [`fontdue`]
/// and shape via [`rustybuzz`]. The fontdue parser is built once up front; the
/// rustybuzz [`Face`](RbFace) borrows the stored bytes and is re-created per
/// shaping call (it is cheap relative to actual shaping and avoids a
/// self-referential struct).
pub struct Font {
    /// Owned font bytes, the source of truth for both backends.
    bytes: Vec<u8>,
    /// The fontdue rasterizer/metrics provider.
    inner: FontdueFont,
}

impl Font {
    /// Loads a font from raw TrueType/OpenType `bytes`.
    ///
    /// Returns an error message if the bytes are not a valid font (for either
    /// the fontdue or rustybuzz backend).
    pub fn from_bytes(bytes: &[u8]) -> Result<Font, String> {
        let inner = FontdueFont::from_bytes(bytes, FontSettings::default())?;
        // Validate that rustybuzz can also parse these bytes up front, so a bad
        // font fails loudly here rather than silently producing empty shaping.
        let owned = bytes.to_vec();
        if RbFace::from_slice(&owned, 0).is_none() {
            return Err("rustybuzz could not parse the font".to_string());
        }
        Ok(Font {
            bytes: owned,
            inner,
        })
    }

    /// Returns the process-wide shared default font (DejaVu Sans).
    ///
    /// The font is parsed lazily on first use and cached for the lifetime of
    /// the process.
    pub fn default_font() -> &'static Font {
        static DEFAULT: OnceLock<Font> = OnceLock::new();
        DEFAULT.get_or_init(|| {
            Font::from_bytes(DEFAULT_FONT_BYTES).expect("embedded DejaVuSans.ttf must be valid")
        })
    }

    /// Builds a rustybuzz [`Face`](RbFace) borrowing this font's bytes, scaled
    /// to no particular size (scaling is applied by the caller).
    fn rb_face(&self) -> RbFace<'_> {
        RbFace::from_slice(&self.bytes, 0).expect("font bytes already validated in from_bytes")
    }

    /// Shapes `text` at `px` pixels into a [`ShapedRun`].
    ///
    /// Uses rustybuzz with no explicit features (default shaping). Advances and
    /// offsets are scaled from font design units into pixels via
    /// `px / units_per_em`. Returns an empty run (zero width) for empty input.
    pub fn shape(&self, text: &str, px: f32) -> ShapedRun {
        if text.is_empty() {
            return ShapedRun::default();
        }

        let face = self.rb_face();
        let units_per_em = face.units_per_em() as f32;
        // Guard against pathological fonts reporting 0 upem.
        let scale = if units_per_em > 0.0 {
            px / units_per_em
        } else {
            0.0
        };

        let mut buffer = UnicodeBuffer::new();
        buffer.push_str(text);
        let glyph_buffer = rustybuzz::shape(&face, &[], buffer);

        let infos = glyph_buffer.glyph_infos();
        let positions = glyph_buffer.glyph_positions();

        let mut glyphs = Vec::with_capacity(infos.len());
        let mut width = 0.0_f32;
        for (info, pos) in infos.iter().zip(positions.iter()) {
            let x_advance = pos.x_advance as f32 * scale;
            glyphs.push(ShapedGlyph {
                // rustybuzz stores the glyph id in the lower bits of `glyph`.
                glyph_id: info.glyph_id as u16,
                x_advance,
                x_offset: pos.x_offset as f32 * scale,
                y_offset: pos.y_offset as f32 * scale,
                cluster: info.cluster,
            });
            width += x_advance;
        }

        ShapedRun { glyphs, width }
    }

    /// Measures the advance width of `text` at `px` pixels by shaping it and
    /// summing glyph advances. Returns `0.0` for an empty string.
    ///
    /// This is the shaping-based replacement for per-character advance summing;
    /// it accounts for kerning and complex clustering that the font applies.
    pub fn measure(&self, text: &str, px: f32) -> f32 {
        self.shape(text, px).width
    }

    /// Measures the advance width of `text` at `px` pixels.
    ///
    /// Backwards-compatible alias for [`Font::measure`]; existing callers
    /// (layout, tests) continue to work unchanged.
    pub fn text_width(&self, text: &str, px: f32) -> f32 {
        self.measure(text, px)
    }

    /// Returns the line height (ascent + descent + line gap) for `px` pixels,
    /// falling back to `px * 1.2` if the font exposes no horizontal metrics.
    pub fn line_height(&self, px: f32) -> f32 {
        match self.inner.horizontal_line_metrics(px) {
            Some(m) => m.new_line_size,
            None => px * 1.2,
        }
    }

    /// Returns the distance from the top of a line box down to the baseline
    /// (the ascent) for `px` pixels.
    pub fn ascent(&self, px: f32) -> f32 {
        match self.inner.horizontal_line_metrics(px) {
            Some(m) => m.ascent,
            None => px,
        }
    }

    /// Looks up the glyph id for `c`, returning `0` (the `.notdef` glyph) if the
    /// font has no mapping for it.
    pub fn glyph_index(&self, c: char) -> u16 {
        self.inner.lookup_glyph_index(c)
    }

    /// Rasterizes a single character `c` at `px` pixels into a [`Glyph`].
    pub fn rasterize(&self, c: char, px: f32) -> Glyph {
        let (metrics, bitmap) = self.inner.rasterize(c, px);
        self.glyph_from_metrics(metrics, bitmap)
    }

    /// Rasterizes a glyph by its `glyph_id` (as produced by [`Font::shape`]) at
    /// `px` pixels into a [`Glyph`]. This is the shaping-aware path used by
    /// painting.
    pub fn rasterize_glyph(&self, glyph_id: u16, px: f32) -> Glyph {
        let (metrics, bitmap) = self.inner.rasterize_indexed(glyph_id, px);
        self.glyph_from_metrics(metrics, bitmap)
    }

    /// Converts fontdue [`Metrics`](fontdue::Metrics) + bitmap into our
    /// [`Glyph`] placement model.
    fn glyph_from_metrics(&self, metrics: fontdue::Metrics, bitmap: Vec<u8>) -> Glyph {
        Glyph {
            width: metrics.width,
            height: metrics.height,
            advance: metrics.advance_width,
            xmin: metrics.xmin as f32,
            // `ymin` is the bottom of the bitmap relative to the baseline
            // (positive = above). The top of the bitmap is `ymin + height`
            // above the baseline.
            top: (metrics.ymin + metrics.height as i32) as f32,
            bitmap,
        }
    }
}

/// Returns the process-wide shared default font. Convenience free function for
/// [`Font::default_font`].
pub fn default_font() -> &'static Font {
    Font::default_font()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn text_width_is_positive_and_grows_with_length() {
        let font = Font::default_font();
        let w_a = font.text_width("a", DEFAULT_FONT_SIZE);
        let w_aaa = font.text_width("aaa", DEFAULT_FONT_SIZE);

        assert!(w_a > 0.0, "single-character width must be positive");
        // Three of the same character advance roughly three times as far.
        assert!(w_aaa > w_a, "longer text must be wider");
    }

    #[test]
    fn empty_string_has_zero_width() {
        let font = Font::default_font();
        assert_eq!(font.text_width("", DEFAULT_FONT_SIZE), 0.0);
        assert_eq!(font.shape("", DEFAULT_FONT_SIZE), ShapedRun::default());
    }

    #[test]
    fn shape_produces_glyphs_and_positive_width() {
        let font = Font::default_font();
        let run = font.shape("Hello", DEFAULT_FONT_SIZE);

        // Latin text shapes one glyph per character (no ligatures in DejaVu for
        // "Hello"), and certainly more than zero.
        assert!(!run.glyphs.is_empty(), "shaping must produce glyphs");
        assert_eq!(run.glyphs.len(), "Hello".chars().count());
        assert!(run.width > 0.0, "shaped run must have positive width");

        // Every glyph carries a real (non-notdef for present chars) id and a
        // positive advance for visible Latin letters.
        for g in &run.glyphs {
            assert!(g.glyph_id > 0, "Latin letters must map to a real glyph");
            assert!(g.x_advance > 0.0);
        }
    }

    #[test]
    fn measure_matches_shaped_run_width() {
        let font = Font::default_font();
        let text = "Shaping width";
        let m = font.measure(text, DEFAULT_FONT_SIZE);
        let run = font.shape(text, DEFAULT_FONT_SIZE);
        assert_eq!(m, run.width);
        assert!(m > 0.0);
    }

    #[test]
    fn measure_grows_with_more_text() {
        let font = Font::default_font();
        let short = font.measure("ab", DEFAULT_FONT_SIZE);
        let long = font.measure("abcdef", DEFAULT_FONT_SIZE);
        assert!(long > short, "more characters must measure wider");
    }

    #[test]
    fn glyph_bitmap_is_non_empty_for_visible_char() {
        let font = Font::default_font();
        let glyph = font.rasterize('A', DEFAULT_FONT_SIZE);

        // A visible glyph has a non-empty bitmap whose length matches its
        // declared dimensions.
        assert!(glyph.width > 0 && glyph.height > 0);
        assert_eq!(glyph.bitmap.len(), glyph.width * glyph.height);
        // At least one pixel must have non-zero coverage (ink).
        assert!(glyph.bitmap.iter().any(|&a| a > 0));
        assert!(glyph.advance > 0.0);
    }

    #[test]
    fn rasterize_glyph_by_id_matches_rasterize_by_char() {
        let font = Font::default_font();
        // The glyph id shaping resolves for 'A' should rasterize to the same
        // bitmap as rasterizing 'A' directly.
        let run = font.shape("A", DEFAULT_FONT_SIZE);
        assert_eq!(run.glyphs.len(), 1);
        let id = run.glyphs[0].glyph_id;

        let by_id = font.rasterize_glyph(id, DEFAULT_FONT_SIZE);
        let by_char = font.rasterize('A', DEFAULT_FONT_SIZE);

        assert_eq!(by_id.width, by_char.width);
        assert_eq!(by_id.height, by_char.height);
        assert_eq!(by_id.bitmap, by_char.bitmap);
        assert!(by_id.bitmap.iter().any(|&a| a > 0));
    }
}
