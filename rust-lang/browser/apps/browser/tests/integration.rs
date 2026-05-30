//! End-to-end integration test.
//!
//! Drives the full rendering pipeline through the library's public API and
//! verifies that it produces a non-empty `Canvas` of the requested size without
//! panicking.

use browser_css as css;
use browser_html as html;
use browser_layout::{layout_tree, Dimensions, Rect};
use browser_paint as painting;
use browser_style as style;

/// Builds a viewport (initial containing block) of the given size.
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

#[test]
fn pipeline_produces_canvas() {
    let html_source = r#"
        <html>
          <body>
            <div class="outer">
              <div class="inner"></div>
            </div>
          </body>
        </html>
    "#;
    let css_source = r#"
        html, body, div { display: block; }
        .outer { background: #ff0000; padding: 10px; }
        .inner { background: #0000ff; height: 50px; border-color: #00ff00; border-width: 2px; }
    "#;

    let root = html::parse(html_source.to_string());
    let sheet = css::parse(css_source.to_string());
    let styled = style::style_tree(&root, &sheet);

    let vp = viewport(200.0, 200.0);
    let layout_root = layout_tree(&styled, vp);

    // Painting must not panic and must yield a canvas of the viewport size.
    let canvas = painting::paint(&layout_root, vp.content);

    assert_eq!(canvas.width, 200);
    assert_eq!(canvas.height, 200);
    assert_eq!(canvas.pixels.len(), 200 * 200);

    // The outer box has a red background filling (almost) the whole viewport,
    // so at least one red pixel must be present somewhere in the canvas.
    let has_red = canvas
        .pixels
        .iter()
        .any(|c| c.r == 255 && c.g == 0 && c.b == 0);
    assert!(has_red, "expected the red background to be painted");
}

#[test]
fn empty_inputs_do_not_panic() {
    // Degenerate but valid inputs should still flow through the pipeline.
    let root = html::parse(String::new());
    let sheet = css::parse(String::new());
    let styled = style::style_tree(&root, &sheet);

    let vp = viewport(50.0, 50.0);
    let layout_root = layout_tree(&styled, vp);
    let canvas = painting::paint(&layout_root, vp.content);

    assert_eq!(canvas.width, 50);
    assert_eq!(canvas.height, 50);
}
