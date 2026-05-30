//! CLI driver for the `browser` engine.
//!
//! Reads an HTML file and a CSS file, runs them through the full rendering
//! pipeline, and writes the result to a PNG image:
//!
//! ```text
//!   html::parse ─▶ DOM
//!   css::parse  ─▶ Stylesheet
//!   style::style_tree(DOM, Stylesheet) ─▶ Style tree
//!   layout::layout_tree(Style tree, viewport) ─▶ Layout tree
//!   painting::paint(Layout tree, bounds) ─▶ Canvas
//!   Canvas::save_png ─▶ output.png
//! ```
//!
//! Usage:
//!
//! ```text
//!   browser [HTML] [CSS] [OUT.png] [WIDTH] [HEIGHT]
//! ```
//!
//! All arguments are optional; with none given it renders the bundled example
//! (`examples/sample.html` + `examples/sample.css`) to `output.png` at
//! 800x600.

use std::process;

use browser::layout::{layout_tree, Dimensions, Rect};
use browser::{css, gui, html, net, painting, style};

/// Default values used when an argument is omitted.
const DEFAULT_HTML: &str = "examples/sample.html";
const DEFAULT_CSS: &str = "examples/sample.css";
const DEFAULT_OUT: &str = "output.png";
const DEFAULT_WIDTH: u32 = 800;
const DEFAULT_HEIGHT: u32 = 600;

fn main() {
    if let Err(message) = run() {
        eprintln!("error: {message}");
        process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().skip(1).collect();

    if args.iter().any(|a| a == "-h" || a == "--help") {
        print_usage();
        return Ok(());
    }

    // `--gui` opens a native window instead of writing a PNG. It is handled as
    // a flag and filtered out of the positional argument list so it never shifts
    // the [HTML] [CSS] [OUT] [WIDTH] [HEIGHT] slots.
    let gui = args.iter().any(|a| a == "--gui");
    let positional: Vec<&String> = args.iter().filter(|a| a.as_str() != "--gui").collect();

    let html_path = positional
        .first()
        .map(|s| s.as_str())
        .unwrap_or(DEFAULT_HTML);
    let css_path = positional.get(1).map(|s| s.as_str()).unwrap_or(DEFAULT_CSS);
    let out_path = positional.get(2).map(|s| s.as_str()).unwrap_or(DEFAULT_OUT);
    let width: u32 = parse_dim(positional.get(3).copied(), DEFAULT_WIDTH, "WIDTH")?;
    let height: u32 = parse_dim(positional.get(4).copied(), DEFAULT_HEIGHT, "HEIGHT")?;

    let html_source = load_source("HTML", html_path)?;
    let css_source = load_source("CSS", css_path)?;

    // The viewport is the initial containing block. Only its width is honoured
    // by block layout (height grows from the content), but it also bounds the
    // canvas we paint onto.
    let viewport = viewport_dimensions(width as f32, height as f32);
    let canvas = render(&html_source, &css_source, viewport);

    if gui {
        // Show the rendered canvas in a native window; this blocks until the
        // window is closed (close button or Esc). No PNG is written in GUI mode.
        println!(
            "Opening {}x{} window (close or press Esc to exit)",
            canvas.width, canvas.height
        );
        gui::run(canvas).map_err(|e| format!("GUI error: {e}"))?;
        return Ok(());
    }

    canvas
        .save_png(out_path)
        .map_err(|e| format!("failed to write PNG '{out_path}': {e}"))?;

    println!("Wrote {}x{} image to {out_path}", canvas.width, canvas.height);
    Ok(())
}

/// Loads a source document from either a URL (http/https) or a local file.
///
/// `label` is used only for log/error messages (e.g. "HTML", "CSS"). The origin
/// (URL or file) is logged so it is clear where the content came from.
fn load_source(label: &str, location: &str) -> Result<String, String> {
    if net::is_url(location) {
        println!("Fetching {label} from URL  {location}");
        net::fetch(location).map_err(|e| format!("failed to fetch {label} from '{location}': {e}"))
    } else {
        println!("Reading  {label} from file {location}");
        std::fs::read_to_string(location)
            .map_err(|e| format!("failed to read {label} file '{location}': {e}"))
    }
}

/// Runs the full pipeline and returns the rasterized canvas.
fn render(html_source: &str, css_source: &str, viewport: Dimensions) -> painting::Canvas {
    let root_node = html::parse(html_source.to_string());
    let stylesheet = css::parse(css_source.to_string());
    let style_root = style::style_tree(&root_node, &stylesheet);
    let layout_root = layout_tree(&style_root, viewport);
    painting::paint(&layout_root, viewport.content)
}

/// Builds an initial containing block (the viewport) of the given size.
fn viewport_dimensions(width: f32, height: f32) -> Dimensions {
    let mut viewport = Dimensions::default();
    viewport.content = Rect {
        x: 0.0,
        y: 0.0,
        width,
        height,
    };
    viewport
}

fn parse_dim(arg: Option<&String>, default: u32, label: &str) -> Result<u32, String> {
    match arg {
        Some(s) => s
            .parse::<u32>()
            .map_err(|_| format!("invalid {label} '{s}': expected a positive integer")),
        None => Ok(default),
    }
}

fn print_usage() {
    println!("browser - a minimal browser engine");
    println!();
    println!("USAGE:");
    println!("    browser [HTML] [CSS] [OUT.png] [WIDTH] [HEIGHT] [--gui]");
    println!();
    println!("ARGS (all optional):");
    println!("    HTML      path or http(s) URL to an HTML file (default: {DEFAULT_HTML})");
    println!("    CSS       path or http(s) URL to a CSS file   (default: {DEFAULT_CSS})");
    println!("    OUT.png   output PNG path        (default: {DEFAULT_OUT}; ignored with --gui)");
    println!("    WIDTH     viewport width in px   (default: {DEFAULT_WIDTH})");
    println!("    HEIGHT    canvas height in px    (default: {DEFAULT_HEIGHT})");
    println!();
    println!("FLAGS:");
    println!("    --gui     display the result in a native window instead of");
    println!("              writing a PNG (close the window or press Esc to exit)");
    println!("    -h, --help  print this help");
}
