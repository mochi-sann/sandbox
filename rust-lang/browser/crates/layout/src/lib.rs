//! The layout engine.
//!
//! This module takes the [`browser_style`] tree and computes the geometry of the
//! page: a tree of boxes, each with a position and dimensions, following a
//! simplified version of the CSS box model and normal block flow.
//!
//! The design follows Matt Brubeck's "Let's build a browser engine"
//! (robinson):
//! - every box has `content`, `padding`, `border`, and `margin` edges
//! - block layout computes width top-down (honoring `auto` and `margin: auto`),
//!   then positions each box and stacks its block children vertically
//! - inline content is collapsed into anonymous block boxes for now
//!
//! The public entry point is [`layout_tree`].

use browser_css::{Unit, Value};
use browser_text::{self as font, DEFAULT_FONT_SIZE};
use browser_style::{Display, StyledNode};

/// A rectangle in the page's coordinate space (pixels). `x`/`y` are the
/// top-left corner of the *content* area.
#[derive(Debug, Default, Clone, Copy, PartialEq)]
pub struct Rect {
    /// X coordinate of the top-left corner.
    pub x: f32,
    /// Y coordinate of the top-left corner.
    pub y: f32,
    /// Width of the rectangle.
    pub width: f32,
    /// Height of the rectangle.
    pub height: f32,
}

impl Rect {
    /// Returns this rectangle expanded on every side by `edge`.
    pub fn expanded_by(self, edge: EdgeSizes) -> Rect {
        Rect {
            x: self.x - edge.left,
            y: self.y - edge.top,
            width: self.width + edge.left + edge.right,
            height: self.height + edge.top + edge.bottom,
        }
    }
}

/// The size of the four edges (padding, border, or margin) of a box.
#[derive(Debug, Default, Clone, Copy, PartialEq)]
pub struct EdgeSizes {
    /// Left edge width.
    pub left: f32,
    /// Right edge width.
    pub right: f32,
    /// Top edge width.
    pub top: f32,
    /// Bottom edge width.
    pub bottom: f32,
}

/// The position and size of a box and its surrounding edges, per the CSS box
/// model.
#[derive(Debug, Default, Clone, Copy, PartialEq)]
pub struct Dimensions {
    /// Position and size of the content area, relative to the document origin.
    pub content: Rect,
    /// Surrounding padding.
    pub padding: EdgeSizes,
    /// Surrounding border.
    pub border: EdgeSizes,
    /// Surrounding margin.
    pub margin: EdgeSizes,
}

impl Dimensions {
    /// The area covered by content plus padding.
    pub fn padding_box(self) -> Rect {
        self.content.expanded_by(self.padding)
    }

    /// The area covered by content, padding, and border.
    pub fn border_box(self) -> Rect {
        self.padding_box().expanded_by(self.border)
    }

    /// The area covered by content, padding, border, and margin.
    pub fn margin_box(self) -> Rect {
        self.border_box().expanded_by(self.margin)
    }
}

/// The kind of box, and (for block/inline boxes) the styled node it renders.
#[derive(Debug)]
pub enum BoxType<'a> {
    /// A block-level box, wrapping a `display: block` styled node.
    BlockNode(&'a StyledNode<'a>),
    /// An inline-level box, wrapping a `display: inline` styled node.
    InlineNode(&'a StyledNode<'a>),
    /// An anonymous block box generated to contain inline children of a block.
    AnonymousBlock,
}

/// A single positioned run of text produced by inline layout: one line (or
/// part of a line) of a text node, already wrapped to fit its containing block.
///
/// Coordinates are in document space. `origin_x`/`baseline_y` are the pen
/// position passed to the rasterizer: `origin_x` is the left edge of the run
/// and `baseline_y` is the text baseline (glyphs sit on it, with ascenders
/// above).
#[derive(Debug, Clone)]
pub struct TextFragment {
    /// The text of this run (a single line, no embedded newlines).
    pub text: String,
    /// X coordinate of the left edge of the run.
    pub origin_x: f32,
    /// Y coordinate of the text baseline for this run.
    pub baseline_y: f32,
    /// Font size, in pixels, used to lay out and to rasterize this run.
    pub font_size: f32,
}

/// A node in the layout tree: a box with computed [`Dimensions`], a
/// [`BoxType`], and laid-out children.
#[derive(Debug)]
pub struct LayoutBox<'a> {
    /// The computed geometry of this box.
    pub dimensions: Dimensions,
    /// What kind of box this is (and the styled node it renders, if any).
    pub box_type: BoxType<'a>,
    /// The child boxes, in document order.
    pub children: Vec<LayoutBox<'a>>,
    /// Positioned text runs produced by inline layout. Empty for boxes that
    /// contain no directly-laid-out text (block boxes, anonymous wrappers).
    pub text_fragments: Vec<TextFragment>,
}

impl<'a> LayoutBox<'a> {
    /// Creates a new layout box of the given type with zeroed dimensions and no
    /// children.
    pub fn new(box_type: BoxType<'a>) -> LayoutBox<'a> {
        LayoutBox {
            box_type,
            dimensions: Dimensions::default(),
            children: Vec::new(),
            text_fragments: Vec::new(),
        }
    }

    /// Returns the resolved `font-size` (in px) for this box, reading the CSS
    /// `font-size` length and defaulting to [`DEFAULT_FONT_SIZE`].
    fn font_size(&self) -> f32 {
        match self.box_type {
            BoxType::BlockNode(style) | BoxType::InlineNode(style) => {
                match style.value("font-size") {
                    Some(Value::Length(px, Unit::Px)) => px,
                    _ => DEFAULT_FONT_SIZE,
                }
            }
            BoxType::AnonymousBlock => DEFAULT_FONT_SIZE,
        }
    }

    /// Returns the text content of this box if it wraps a DOM text node,
    /// otherwise `None`.
    fn text_content(&self) -> Option<&'a str> {
        match self.box_type {
            BoxType::InlineNode(style) => match &style.node.node_type {
                browser_dom::NodeType::Text(s) => Some(s.as_str()),
                _ => None,
            },
            _ => None,
        }
    }

    /// Returns the styled node this box renders, or panics for an anonymous
    /// block (which has no associated style).
    fn get_style_node(&self) -> &'a StyledNode<'a> {
        match self.box_type {
            BoxType::BlockNode(node) | BoxType::InlineNode(node) => node,
            BoxType::AnonymousBlock => {
                panic!("Anonymous block box has no style node")
            }
        }
    }

    /// Returns the container that inline children should be appended to. For a
    /// block box, inline children must go inside an anonymous block box; a run
    /// of consecutive inline children shares one such anonymous box.
    fn get_inline_container(&mut self) -> &mut LayoutBox<'a> {
        match self.box_type {
            BoxType::InlineNode(_) | BoxType::AnonymousBlock => self,
            BoxType::BlockNode(_) => {
                // If the last child is an anonymous block, reuse it; otherwise
                // start a new one.
                match self.children.last() {
                    Some(&LayoutBox {
                        box_type: BoxType::AnonymousBlock,
                        ..
                    }) => {}
                    _ => self.children.push(LayoutBox::new(BoxType::AnonymousBlock)),
                }
                self.children.last_mut().unwrap()
            }
        }
    }

    /// Lays out this box and its descendants. Dispatches on box type; inline
    /// layout is not implemented beyond block-style placement.
    fn layout(&mut self, containing_block: Dimensions) {
        match self.box_type {
            BoxType::BlockNode(_) => self.layout_block(containing_block),
            // Anonymous blocks (and bare inline nodes used as a root) flow their
            // inline/text children into wrapped lines.
            BoxType::AnonymousBlock | BoxType::InlineNode(_) => {
                self.layout_inline(containing_block)
            }
        }
    }

    /// Lays out an inline-formatting context: takes the full containing-block
    /// width, gathers the text of all inline descendants, and wraps it into
    /// lines, producing positioned [`TextFragment`]s. The box's content height
    /// grows to fit the resulting lines.
    fn layout_inline(&mut self, containing_block: Dimensions) {
        // Inline content fills the containing block's width and starts directly
        // below previous content (no inline margins/borders/padding in this
        // minimal model).
        let d = &mut self.dimensions;
        d.content.width = containing_block.content.width;
        d.content.x = containing_block.content.x;
        d.content.y = containing_block.content.y + containing_block.content.height;
        d.content.height = 0.0;

        let max_width = self.dimensions.content.width;
        let start_x = self.dimensions.content.x;
        let start_y = self.dimensions.content.y;

        let font = font::default_font();
        let mut fragments = Vec::new();
        let mut cursor_y = start_y;

        // Collect the text runs (each inline/text child contributes one run,
        // possibly wrapped across several lines). All runs share this block's
        // font size in this minimal model.
        let runs = self.collect_text_runs();
        for (text, font_size) in runs {
            let line_height = font.line_height(font_size);
            let ascent = font.ascent(font_size);

            for line in wrap_text(font, &text, font_size, max_width) {
                fragments.push(TextFragment {
                    text: line,
                    origin_x: start_x,
                    baseline_y: cursor_y + ascent,
                    font_size,
                });
                cursor_y += line_height;
            }
        }

        self.dimensions.content.height = cursor_y - start_y;
        self.text_fragments = fragments;
    }

    /// Gathers `(text, font_size)` runs from this box's inline/text subtree, in
    /// document order. Used to feed [`Self::layout_inline`].
    fn collect_text_runs(&self) -> Vec<(String, f32)> {
        let mut runs = Vec::new();
        self.collect_text_runs_into(&mut runs);
        runs
    }

    /// Recursive helper for [`Self::collect_text_runs`].
    fn collect_text_runs_into(&self, runs: &mut Vec<(String, f32)>) {
        if let Some(text) = self.text_content() {
            let trimmed = collapse_whitespace(text);
            if !trimmed.is_empty() {
                runs.push((trimmed, self.font_size()));
            }
        }
        for child in &self.children {
            child.collect_text_runs_into(runs);
        }
    }

    /// Lays out a block-level box and its children.
    fn layout_block(&mut self, containing_block: Dimensions) {
        // Width depends on the containing block (top-down).
        self.calculate_block_width(containing_block);
        // Position depends on width and the containing block.
        self.calculate_block_position(containing_block);
        // Recurse into children (which may grow this box's height).
        self.layout_block_children();
        // Height can depend on children, so compute it after they are laid out.
        self.calculate_block_height();
    }

    /// Computes this box's `content.width` and horizontal margins/padding/
    /// border, resolving `auto` against the containing block's width.
    fn calculate_block_width(&mut self, containing_block: Dimensions) {
        let style = self.get_style_node();

        // `width` defaults to `auto`.
        let auto = Value::Keyword("auto".to_string());
        let mut width = style.value("width").unwrap_or_else(|| auto.clone());

        let zero = Value::Length(0.0, Unit::Px);

        let mut margin_left = style.lookup("margin-left", "margin", &zero);
        let mut margin_right = style.lookup("margin-right", "margin", &zero);

        let border_left = style.lookup("border-left-width", "border-width", &zero);
        let border_right = style.lookup("border-right-width", "border-width", &zero);

        let padding_left = style.lookup("padding-left", "padding", &zero);
        let padding_right = style.lookup("padding-right", "padding", &zero);

        let total: f32 = [
            &margin_left,
            &margin_right,
            &border_left,
            &border_right,
            &padding_left,
            &padding_right,
            &width,
        ]
        .iter()
        .map(|v| v.to_px())
        .sum();

        // If width is not auto and the total is wider than the container,
        // treat auto margins as 0.
        if width != auto && total > containing_block.content.width {
            if margin_left == auto {
                margin_left = zero.clone();
            }
            if margin_right == auto {
                margin_right = zero.clone();
            }
        }

        // Adjust used values so the box fits exactly in the containing block.
        let underflow = containing_block.content.width - total;

        match (width == auto, margin_left == auto, margin_right == auto) {
            // Over-constrained: adjust the right margin.
            (false, false, false) => {
                margin_right = Value::Length(margin_right.to_px() + underflow, Unit::Px);
            }
            // Exactly one margin is auto: it absorbs the underflow.
            (false, false, true) => {
                margin_right = Value::Length(underflow, Unit::Px);
            }
            (false, true, false) => {
                margin_left = Value::Length(underflow, Unit::Px);
            }
            // Width is auto: any auto margins collapse to 0, width absorbs it.
            (true, _, _) => {
                if margin_left == auto {
                    margin_left = zero.clone();
                }
                if margin_right == auto {
                    margin_right = zero.clone();
                }
                if underflow >= 0.0 {
                    width = Value::Length(underflow, Unit::Px);
                } else {
                    // Negative underflow: shrink the right margin.
                    width = zero.clone();
                    margin_right = Value::Length(margin_right.to_px() + underflow, Unit::Px);
                }
            }
            // Both margins auto and width fixed: split the underflow evenly.
            (false, true, true) => {
                margin_left = Value::Length(underflow / 2.0, Unit::Px);
                margin_right = Value::Length(underflow / 2.0, Unit::Px);
            }
        }

        let d = &mut self.dimensions;
        d.content.width = width.to_px();

        d.padding.left = padding_left.to_px();
        d.padding.right = padding_right.to_px();

        d.border.left = border_left.to_px();
        d.border.right = border_right.to_px();

        d.margin.left = margin_left.to_px();
        d.margin.right = margin_right.to_px();
    }

    /// Computes this box's position (`content.x`/`content.y`) and vertical
    /// margins/padding/border, placing it below previous content in the
    /// containing block.
    fn calculate_block_position(&mut self, containing_block: Dimensions) {
        let style = self.get_style_node();
        let zero = Value::Length(0.0, Unit::Px);

        let d = &mut self.dimensions;

        d.margin.top = style.lookup("margin-top", "margin", &zero).to_px();
        d.margin.bottom = style.lookup("margin-bottom", "margin", &zero).to_px();

        d.border.top = style
            .lookup("border-top-width", "border-width", &zero)
            .to_px();
        d.border.bottom = style
            .lookup("border-bottom-width", "border-width", &zero)
            .to_px();

        d.padding.top = style.lookup("padding-top", "padding", &zero).to_px();
        d.padding.bottom = style.lookup("padding-bottom", "padding", &zero).to_px();

        d.content.x = containing_block.content.x + d.margin.left + d.border.left + d.padding.left;
        // Position below all previous content in the containing block.
        d.content.y = containing_block.content.height
            + containing_block.content.y
            + d.margin.top
            + d.border.top
            + d.padding.top;
    }

    /// Lays out the children of a block box, growing this box's tracked content
    /// height as each child's margin box is stacked.
    fn layout_block_children(&mut self) {
        for child in &mut self.children {
            // Pass the current dimensions each iteration: the accumulated
            // content height is how the next child knows where to start.
            child.layout(self.dimensions);
            // Track the height so each child is placed below the previous one.
            self.dimensions.content.height += child.dimensions.margin_box().height;
        }
    }

    /// Sets this box's height to an explicit `height` if given, otherwise leaves
    /// the height accumulated from its children.
    fn calculate_block_height(&mut self) {
        if let Some(Value::Length(h, Unit::Px)) = self.get_style_node().value("height") {
            self.dimensions.content.height = h;
        }
    }
}

/// Builds a layout tree from a style tree and lays it out within
/// `containing_block`.
///
/// The containing block's height is reset to `0` so that block stacking starts
/// from the top regardless of the caller-provided value.
pub fn layout_tree<'a>(
    node: &'a StyledNode<'a>,
    mut containing_block: Dimensions,
) -> LayoutBox<'a> {
    // The layout algorithm expects the containing block height to start at 0.
    containing_block.content.height = 0.0;

    let mut root_box = build_layout_tree(node);
    root_box.layout(containing_block);
    root_box
}

/// Builds the layout tree (without computing geometry) from a style tree,
/// skipping `display: none` nodes and wrapping inline children of block boxes in
/// anonymous block boxes.
fn build_layout_tree<'a>(style_node: &'a StyledNode<'a>) -> LayoutBox<'a> {
    let mut root = LayoutBox::new(match style_node.display() {
        Display::Block => BoxType::BlockNode(style_node),
        Display::Inline => BoxType::InlineNode(style_node),
        Display::None => panic!("Root node has display: none."),
    });

    for child in &style_node.children {
        match child.display() {
            Display::Block => root.children.push(build_layout_tree(child)),
            Display::Inline => root
                .get_inline_container()
                .children
                .push(build_layout_tree(child)),
            // Skip nodes with `display: none`.
            Display::None => {}
        }
    }
    root
}

/// Collapses runs of ASCII whitespace in `text` to single spaces and trims the
/// ends, mimicking the default CSS `white-space: normal` handling well enough
/// for this minimal engine.
fn collapse_whitespace(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Wraps `text` to fit within `max_width` pixels at `font_size`, breaking on
/// word boundaries. Words wider than `max_width` are placed on their own line
/// (no mid-word breaking). Returns at least one line for non-empty input.
fn wrap_text(font: &font::Font, text: &str, font_size: f32, max_width: f32) -> Vec<String> {
    let mut lines: Vec<String> = Vec::new();
    let mut current = String::new();

    for word in text.split_whitespace() {
        if current.is_empty() {
            current.push_str(word);
            continue;
        }
        // Tentatively add the word with a separating space. `measure` shapes
        // the candidate line so wrapping reflects real (kerned) advances.
        let candidate_width = font.measure(&format!("{current} {word}"), font_size);
        if candidate_width <= max_width {
            current.push(' ');
            current.push_str(word);
        } else {
            // Doesn't fit: flush the current line and start a new one.
            lines.push(std::mem::take(&mut current));
            current.push_str(word);
        }
    }

    if !current.is_empty() {
        lines.push(current);
    }
    lines
}

/// Helpers on [`Value`] used during layout.
trait ToPx {
    /// Returns the value as pixels, or `0.0` for non-length values.
    fn to_px(&self) -> f32;
}

impl ToPx for Value {
    fn to_px(&self) -> f32 {
        match self {
            Value::Length(f, Unit::Px) => *f,
            _ => 0.0,
        }
    }
}

/// Style lookup helpers used by layout (e.g. resolving `margin-left` then the
/// `margin` shorthand, then a default).
trait LookupValue {
    /// Returns the value of the first set property among `name` / `fallback`,
    /// or `default` if neither is set.
    fn lookup(&self, name: &str, fallback: &str, default: &Value) -> Value;
}

impl<'a> LookupValue for StyledNode<'a> {
    fn lookup(&self, name: &str, fallback: &str, default: &Value) -> Value {
        self.value(name)
            .or_else(|| self.value(fallback))
            .unwrap_or_else(|| default.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use browser_css as css;
    use browser_html as html;
    use browser_style::style_tree;

    /// Builds a styled tree from HTML + CSS strings, returning it boxed so the
    /// borrows live long enough for layout in each test.
    fn viewport(width: f32, height: f32) -> Dimensions {
        let mut d = Dimensions::default();
        d.content.width = width;
        d.content.height = height;
        d
    }

    #[test]
    fn root_block_fills_container_width_and_stacks_children() {
        let dom =
            html::parse("<div><div class=\"a\"></div><div class=\"b\"></div></div>".to_string());
        let sheet = css::parse(
            "div { display: block; } .a { height: 50px; } .b { height: 30px; }".to_string(),
        );
        let styled = style_tree(&dom, &sheet);

        let root = layout_tree(&styled, viewport(800.0, 600.0));

        // Root `width: auto` fills the containing block.
        assert_eq!(root.dimensions.content.width, 800.0);
        assert_eq!(root.dimensions.content.x, 0.0);
        assert_eq!(root.dimensions.content.y, 0.0);

        // Two block children, stacked: heights 50 + 30 = 80.
        assert_eq!(root.children.len(), 2);
        assert_eq!(root.dimensions.content.height, 80.0);

        let a = &root.children[0];
        let b = &root.children[1];
        assert_eq!(a.dimensions.content.height, 50.0);
        assert_eq!(a.dimensions.content.y, 0.0);
        assert_eq!(b.dimensions.content.height, 30.0);
        // `b` starts right below `a`.
        assert_eq!(b.dimensions.content.y, 50.0);
        // Both fill the container width.
        assert_eq!(a.dimensions.content.width, 800.0);
        assert_eq!(b.dimensions.content.width, 800.0);
    }

    #[test]
    fn fixed_width_with_auto_margins_centers_box() {
        let dom = html::parse("<div></div>".to_string());
        let sheet = css::parse("div { display: block; width: 200px; margin: auto; }".to_string());
        let styled = style_tree(&dom, &sheet);

        let root = layout_tree(&styled, viewport(800.0, 600.0));

        assert_eq!(root.dimensions.content.width, 200.0);
        // (800 - 200) / 2 = 300 on each side.
        assert_eq!(root.dimensions.margin.left, 300.0);
        assert_eq!(root.dimensions.margin.right, 300.0);
        // Content x is shifted right by the left margin.
        assert_eq!(root.dimensions.content.x, 300.0);
    }

    #[test]
    fn padding_and_explicit_height_affect_geometry() {
        let dom = html::parse("<div></div>".to_string());
        let sheet = css::parse(
            "div { display: block; width: 100px; padding: 10px; height: 40px; }".to_string(),
        );
        let styled = style_tree(&dom, &sheet);

        let root = layout_tree(&styled, viewport(800.0, 600.0));

        assert_eq!(root.dimensions.content.width, 100.0);
        assert_eq!(root.dimensions.content.height, 40.0);
        // Padding applies on every side.
        assert_eq!(root.dimensions.padding.left, 10.0);
        assert_eq!(root.dimensions.padding.top, 10.0);
        // Content origin is offset by the left/top padding.
        assert_eq!(root.dimensions.content.x, 10.0);
        assert_eq!(root.dimensions.content.y, 10.0);
        // Padding box is content + padding on both sides.
        let pb = root.dimensions.padding_box();
        assert_eq!(pb.width, 120.0);
        assert_eq!(pb.height, 60.0);
    }
}
