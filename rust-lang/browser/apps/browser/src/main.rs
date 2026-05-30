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

use browser_css as css;
use browser_html as html;
use browser_layout::{layout_tree, Dimensions, Rect};
use browser_net as net;
use browser_paint as painting;
use browser_shell as gui;
use browser_style as style;

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
    // `--dump-style` prints the DOM tree annotated with each node's computed
    // style to stdout (for inspecting the cascade) instead of rendering.
    let dump_style = args.iter().any(|a| a == "--dump-style");
    let positional: Vec<&String> = args
        .iter()
        .filter(|a| a.as_str() != "--gui" && a.as_str() != "--dump-style")
        .collect();

    let html_path = positional
        .first()
        .map(|s| s.as_str())
        .unwrap_or(DEFAULT_HTML);
    let css_path = positional.get(1).map(|s| s.as_str()).unwrap_or(DEFAULT_CSS);
    let out_path = positional.get(2).map(|s| s.as_str()).unwrap_or(DEFAULT_OUT);
    let width: u32 = parse_dim(positional.get(3).copied(), DEFAULT_WIDTH, "WIDTH")?;
    let height: u32 = parse_dim(positional.get(4).copied(), DEFAULT_HEIGHT, "HEIGHT")?;

    // `--gui` opens the interactive, navigable browser window. It loads the
    // HTML argument (URL or local path) through the shell's full pipeline and
    // follows hyperlink clicks; the CSS positional argument is ignored in this
    // mode (the page's own <style> plus the UA default stylesheet are used).
    if gui {
        let start = gui::url_from_input(html_path)
            .map_err(|e| format!("invalid start location '{html_path}': {e}"))?;
        println!(
            "Opening {width}x{height} browser window at {start} (Esc to exit, Backspace to go back)"
        );
        gui::run_browser(start, width, height).map_err(|e| format!("GUI error: {e}"))?;
        return Ok(());
    }

    let html_source = load_source("HTML", html_path)?;
    let css_source = load_source("CSS", css_path)?;

    if dump_style {
        // Build DOM + computed style tree and print it; skip layout/paint.
        let root_node = html::parse(html_source.to_string());
        let stylesheet = css::parse(css_source.to_string());
        let style_root = style::style_tree(&root_node, &stylesheet);
        println!("--- computed style tree ---");
        dump_style_tree(&style_root, 0);
        return Ok(());
    }

    // The viewport is the initial containing block. Only its width is honoured
    // by block layout (height grows from the content), but it also bounds the
    // canvas we paint onto.
    let viewport = viewport_dimensions(width as f32, height as f32);
    let canvas = render(&html_source, &css_source, viewport);

    canvas
        .save_png(out_path)
        .map_err(|e| format!("failed to write PNG '{out_path}': {e}"))?;

    println!(
        "Wrote {}x{} image to {out_path}",
        canvas.width, canvas.height
    );
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

/// Prints a style node and its subtree, indented by depth, annotating each
/// node with its computed CSS property values (cascade + inheritance).
fn dump_style_tree(node: &style::StyledNode, depth: usize) {
    use style::DomNodeType as NodeType;

    let indent = "  ".repeat(depth);
    match &node.node.node_type {
        NodeType::Element(elem) => {
            let mut head = format!("{indent}<{}", elem.tag_name);
            if let Some(id) = elem.id() {
                head.push_str(&format!(" #{id}"));
            }
            let classes = elem.classes();
            if !classes.is_empty() {
                let mut cs: Vec<&str> = classes.into_iter().collect();
                cs.sort_unstable();
                head.push_str(&format!(" .{}", cs.join(".")));
            }
            head.push('>');
            println!("{head}");

            // Computed values, sorted by property name for stable output.
            let mut props: Vec<(&String, &css::Value)> = node.specified_values.iter().collect();
            props.sort_by(|a, b| a.0.cmp(b.0));
            for (name, value) in props {
                println!("{indent}  {name}: {}", format_value(value));
            }
        }
        NodeType::Text(text) => {
            let trimmed = text.trim();
            if !trimmed.is_empty() {
                println!("{indent}#text {trimmed:?}");
                // Show inherited color/font-size on text nodes too.
                if let Some(c) = node.value("color") {
                    println!("{indent}  color: {}", format_value(&c));
                }
                if let Some(f) = node.value("font-size") {
                    println!("{indent}  font-size: {}", format_value(&f));
                }
            }
        }
    }

    for child in &node.children {
        dump_style_tree(child, depth + 1);
    }
}

/// Formats a [`css::Value`] for human-readable debug output.
fn format_value(value: &css::Value) -> String {
    match value {
        css::Value::Keyword(k) => k.clone(),
        css::Value::Length(n, unit) => {
            let u = match unit {
                css::Unit::Px => "px",
                css::Unit::Em => "em",
                css::Unit::Percent => "%",
            };
            format!("{n}{u}")
        }
        css::Value::ColorValue(c) => {
            format!("#{:02x}{:02x}{:02x}{:02x}", c.r, c.g, c.b, c.a)
        }
    }
}

/// Builds an initial containing block (the viewport) of the given size.
fn viewport_dimensions(width: f32, height: f32) -> Dimensions {
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
    println!("    --gui     open an interactive, navigable browser window for the");
    println!("              HTML argument (URL or local path) instead of writing a");
    println!("              PNG. Click links to navigate, Backspace to go back,");
    println!("              scroll with the mouse wheel, Esc/close to exit. The CSS");
    println!("              argument is ignored (the page's own <style> plus a");
    println!("              built-in user-agent stylesheet are used).");
    println!("    --dump-style  print the DOM annotated with computed styles");
    println!("                  (cascade + inheritance) and exit; no rendering");
    println!("    -h, --help  print this help");
}
