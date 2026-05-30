//! Font loading and glyph rasterization.
//!
//! This module wraps the [`fontdue`] rasterizer with a small, self-contained
//! [`Font`] type that the layout and painting stages use to measure and draw
//! text. The default font (DejaVu Sans) is embedded into the binary via
//! [`include_bytes!`], so the engine does not depend on any file being present
//! at runtime.
//!
//! Responsibilities:
//! - [`Font::default_font`] / [`default_font`]: a process-wide shared instance.
//! - [`Font::text_width`]: measure the advance width of a string at a given
//!   pixel size (used by inline layout to wrap text).
//! - [`Font::rasterize`]: rasterize a single character into a [`Glyph`]
//!   (metrics plus an 8-bit coverage/alpha bitmap), used by painting.

use std::sync::OnceLock;

use fontdue::{Font as FontdueFont, FontSettings};

/// The embedded default font (DejaVu Sans), copied into `assets/` at build
/// time so the engine is self-contained and independent of the working
/// directory.
const DEFAULT_FONT_BYTES: &[u8] = include_bytes!("../assets/DejaVuSans.ttf");

/// The default font size, in pixels, used when CSS does not specify
/// `font-size`.
pub const DEFAULT_FONT_SIZE: f32 = 16.0;

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

/// A loaded font, wrapping a [`fontdue`] rasterizer.
pub struct Font {
    inner: FontdueFont,
}

impl Font {
    /// Loads a font from raw TrueType/OpenType `bytes`.
    ///
    /// Returns an error message if the bytes are not a valid font.
    pub fn from_bytes(bytes: &[u8]) -> Result<Font, String> {
        let inner = FontdueFont::from_bytes(bytes, FontSettings::default())?;
        Ok(Font { inner })
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

    /// Measures the advance width of `text` at `px` pixels, summing each
    /// character's horizontal advance. Returns `0.0` for an empty string.
    pub fn text_width(&self, text: &str, px: f32) -> f32 {
        text.chars()
            .map(|c| self.inner.metrics(c, px).advance_width)
            .sum()
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

    /// Rasterizes a single character `c` at `px` pixels into a [`Glyph`].
    pub fn rasterize(&self, c: char, px: f32) -> Glyph {
        let (metrics, bitmap) = self.inner.rasterize(c, px);
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
}
