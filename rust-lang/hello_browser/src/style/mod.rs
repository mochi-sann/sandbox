use std::collections::HashMap;

use crate::dom::types::{DomNode, NodeType};
use crate::layout::Color;
use crate::parse::cssparser_adapter::{Selector, Stylesheet};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Display {
    Block,
    Inline,
    None,
    Flex,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FlexDirection {
    Row,
    Column,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JustifyContent {
    FlexStart,
    Center,
    SpaceBetween,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AlignItems {
    FlexStart,
    Center,
    Stretch,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FlexWrap {
    NoWrap,
    Wrap,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EdgeSizes {
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
    pub left: f32,
}

impl EdgeSizes {
    pub const ZERO: Self = Self {
        top: 0.0,
        right: 0.0,
        bottom: 0.0,
        left: 0.0,
    };
}

#[derive(Debug, Clone, Copy)]
pub struct ComputedStyle {
    pub display: Display,
    pub font_size_px: f32,
    pub color: Color,
    pub background_color: Option<Color>,
    pub border_color: Color,
    pub margin: EdgeSizes,
    pub padding: EdgeSizes,
    pub border_width: EdgeSizes,
    pub width: Option<f32>,
    pub height: Option<f32>,
    pub flex_direction: FlexDirection,
    pub justify_content: JustifyContent,
    pub align_items: AlignItems,
    pub flex_wrap: FlexWrap,
    pub flex_grow: f32,
    pub flex_shrink: f32,
    pub flex_basis: Option<f32>,
}

impl ComputedStyle {
    pub fn border_max(&self) -> f32 {
        self.border_width
            .top
            .max(self.border_width.right)
            .max(self.border_width.bottom)
            .max(self.border_width.left)
    }
}

#[derive(Debug, Clone)]
pub struct StyleNode {
    pub node: DomNode,
    pub computed: ComputedStyle,
    pub children: Vec<StyleNode>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Specificity {
    inline: u16,
    id: u16,
    class: u16,
    tag: u16,
}

impl Specificity {
    pub const INLINE: Self = Self {
        inline: 1,
        id: 0,
        class: 0,
        tag: 0,
    };

    fn from_selector(selector: &Selector) -> Self {
        match selector {
            Selector::Id(_) => Self {
                inline: 0,
                id: 1,
                class: 0,
                tag: 0,
            },
            Selector::Class(_) | Selector::Attribute(_) => Self {
                inline: 0,
                id: 0,
                class: 1,
                tag: 0,
            },
            Selector::Tag(_) => Self {
                inline: 0,
                id: 0,
                class: 0,
                tag: 1,
            },
        }
    }
}

#[derive(Debug, Clone)]
struct AppliedDecl {
    value: String,
    specificity: Specificity,
    order: usize,
}

pub fn style_tree(root: &DomNode, stylesheet: &Stylesheet) -> StyleNode {
    style_tree_with_parent(root, stylesheet, None)
}

fn style_tree_with_parent(root: &DomNode, stylesheet: &Stylesheet, parent: Option<&ComputedStyle>) -> StyleNode {
    let specified = collect_specified(root, stylesheet);
    let computed = compute_style(root, parent, &specified);

    let children = root
        .children
        .iter()
        .map(|child| style_tree_with_parent(child, stylesheet, Some(&computed)))
        .collect::<Vec<_>>();

    StyleNode {
        node: root.clone(),
        computed,
        children,
    }
}

fn collect_specified(root: &DomNode, stylesheet: &Stylesheet) -> HashMap<String, AppliedDecl> {
    let mut map: HashMap<String, AppliedDecl> = HashMap::new();
    let mut order = 0usize;

    if let NodeType::Element(el) = &root.node_type {
        for rule in &stylesheet.rules {
            let mut matched_spec: Option<Specificity> = None;
            for selector in &rule.selectors {
                if selector_matches(selector, root) {
                    let spec = Specificity::from_selector(selector);
                    if matched_spec.is_none_or(|current| spec > current) {
                        matched_spec = Some(spec);
                    }
                }
            }

            if let Some(spec) = matched_spec {
                for (name, value) in &rule.declarations {
                    apply_decl(&mut map, name, value, spec, order);
                    order += 1;
                }
            }
        }

        if let Some(inline_style) = el.attrs.get("style") {
            for item in inline_style.split(';') {
                if let Some((name, value)) = item.split_once(':') {
                    let prop = name.trim().to_ascii_lowercase();
                    let val = value.trim();
                    if prop.is_empty() || val.is_empty() {
                        continue;
                    }
                    apply_decl(&mut map, &prop, val, Specificity::INLINE, order);
                    order += 1;
                }
            }
        }
    }

    map
}

fn apply_decl(
    map: &mut HashMap<String, AppliedDecl>,
    name: &str,
    value: &str,
    specificity: Specificity,
    order: usize,
) {
    let key = name.to_ascii_lowercase();
    let next = AppliedDecl {
        value: value.trim().to_string(),
        specificity,
        order,
    };

    match map.get(&key) {
        Some(current)
            if current.specificity > next.specificity
                || (current.specificity == next.specificity && current.order > next.order) => {}
        _ => {
            map.insert(key, next);
        }
    }
}

fn selector_matches(selector: &Selector, node: &DomNode) -> bool {
    let NodeType::Element(el) = &node.node_type else {
        return false;
    };

    match selector {
        Selector::Tag(tag) => el.tag_name.eq_ignore_ascii_case(tag),
        Selector::Id(id) => node.attr("id").is_some_and(|candidate| candidate == id),
        Selector::Class(class) => node.attr("class").is_some_and(|list| {
            list.split_whitespace().any(|candidate| candidate == class)
        }),
        Selector::Attribute(attr) => match &attr.value {
            Some(expected) => node
                .attr(&attr.name)
                .is_some_and(|actual| actual.eq_ignore_ascii_case(expected)),
            None => node.attr(&attr.name).is_some(),
        },
    }
}

fn compute_style(
    node: &DomNode,
    parent: Option<&ComputedStyle>,
    specified: &HashMap<String, AppliedDecl>,
) -> ComputedStyle {
    let default_font = parent.map(|p| p.font_size_px).unwrap_or(16.0);
    let default_color = parent.map(|p| p.color).unwrap_or(Color::BLACK);

    let display = specified
        .get("display")
        .and_then(|d| parse_display(&d.value))
        .unwrap_or_else(|| default_display(node));

    let margin = parse_box_sides(specified, "margin");
    let padding = parse_box_sides(specified, "padding");
    let border_width = parse_box_sides(specified, "border-width");

    let border_color = specified
        .get("border-color")
        .and_then(|d| parse_color(&d.value))
        .unwrap_or(Color::GRAY);

    let font_size_px = specified
        .get("font-size")
        .and_then(|d| parse_px(&d.value))
        .unwrap_or(default_font)
        .clamp(8.0, 72.0);

    let color = specified
        .get("color")
        .and_then(|d| parse_color(&d.value))
        .unwrap_or(default_color);

    let background_color = specified
        .get("background-color")
        .and_then(|d| parse_color(&d.value));

    let width = specified.get("width").and_then(|d| parse_px(&d.value));
    let height = specified.get("height").and_then(|d| parse_px(&d.value));

    let flex_direction = specified
        .get("flex-direction")
        .and_then(|d| parse_flex_direction(&d.value))
        .unwrap_or(FlexDirection::Row);

    let justify_content = specified
        .get("justify-content")
        .and_then(|d| parse_justify_content(&d.value))
        .unwrap_or(JustifyContent::FlexStart);

    let align_items = specified
        .get("align-items")
        .and_then(|d| parse_align_items(&d.value))
        .unwrap_or(AlignItems::Stretch);

    let flex_wrap = specified
        .get("flex-wrap")
        .and_then(|d| parse_flex_wrap(&d.value))
        .unwrap_or(FlexWrap::NoWrap);
    let flex_grow = specified
        .get("flex-grow")
        .and_then(|d| parse_number(&d.value))
        .unwrap_or(0.0)
        .max(0.0);
    let flex_shrink = specified
        .get("flex-shrink")
        .and_then(|d| parse_number(&d.value))
        .unwrap_or(1.0)
        .max(0.0);
    let flex_basis = specified.get("flex-basis").and_then(|d| parse_px(&d.value));

    ComputedStyle {
        display,
        font_size_px,
        color,
        background_color,
        border_color,
        margin,
        padding,
        border_width,
        width,
        height,
        flex_direction,
        justify_content,
        align_items,
        flex_wrap,
        flex_grow,
        flex_shrink,
        flex_basis,
    }
}

fn default_display(node: &DomNode) -> Display {
    match &node.node_type {
        NodeType::Text(_) => Display::Inline,
        NodeType::Document => Display::Block,
        NodeType::Element(el) => {
            let tag = el.tag_name.to_ascii_lowercase();
            match tag.as_str() {
                "span" | "a" | "b" | "i" | "strong" | "em" | "small" => Display::Inline,
                _ => Display::Block,
            }
        }
    }
}

fn parse_box_sides(specified: &HashMap<String, AppliedDecl>, base: &str) -> EdgeSizes {
    let mut sides = specified
        .get(base)
        .map(|d| parse_edge_shorthand(&d.value))
        .unwrap_or(EdgeSizes::ZERO);

    if let Some(v) = specified
        .get(&format!("{base}-top"))
        .and_then(|d| parse_px(&d.value))
    {
        sides.top = v;
    }
    if let Some(v) = specified
        .get(&format!("{base}-right"))
        .and_then(|d| parse_px(&d.value))
    {
        sides.right = v;
    }
    if let Some(v) = specified
        .get(&format!("{base}-bottom"))
        .and_then(|d| parse_px(&d.value))
    {
        sides.bottom = v;
    }
    if let Some(v) = specified
        .get(&format!("{base}-left"))
        .and_then(|d| parse_px(&d.value))
    {
        sides.left = v;
    }

    sides.top = sides.top.max(0.0);
    sides.right = sides.right.max(0.0);
    sides.bottom = sides.bottom.max(0.0);
    sides.left = sides.left.max(0.0);
    sides
}

fn parse_edge_shorthand(value: &str) -> EdgeSizes {
    let nums = value
        .split_whitespace()
        .filter_map(parse_px)
        .collect::<Vec<_>>();

    match nums.len() {
        1 => EdgeSizes {
            top: nums[0],
            right: nums[0],
            bottom: nums[0],
            left: nums[0],
        },
        2 => EdgeSizes {
            top: nums[0],
            right: nums[1],
            bottom: nums[0],
            left: nums[1],
        },
        3 => EdgeSizes {
            top: nums[0],
            right: nums[1],
            bottom: nums[2],
            left: nums[1],
        },
        4 => EdgeSizes {
            top: nums[0],
            right: nums[1],
            bottom: nums[2],
            left: nums[3],
        },
        _ => EdgeSizes::ZERO,
    }
}

fn parse_display(input: &str) -> Option<Display> {
    match input.trim().to_ascii_lowercase().as_str() {
        "none" => Some(Display::None),
        "inline" => Some(Display::Inline),
        "flex" => Some(Display::Flex),
        "block" => Some(Display::Block),
        _ => None,
    }
}

fn parse_flex_direction(input: &str) -> Option<FlexDirection> {
    match input.trim().to_ascii_lowercase().as_str() {
        "row" => Some(FlexDirection::Row),
        "column" => Some(FlexDirection::Column),
        _ => None,
    }
}

fn parse_justify_content(input: &str) -> Option<JustifyContent> {
    match input.trim().to_ascii_lowercase().as_str() {
        "flex-start" | "start" => Some(JustifyContent::FlexStart),
        "center" => Some(JustifyContent::Center),
        "space-between" => Some(JustifyContent::SpaceBetween),
        _ => None,
    }
}

fn parse_align_items(input: &str) -> Option<AlignItems> {
    match input.trim().to_ascii_lowercase().as_str() {
        "flex-start" | "start" => Some(AlignItems::FlexStart),
        "center" => Some(AlignItems::Center),
        "stretch" => Some(AlignItems::Stretch),
        _ => None,
    }
}

fn parse_flex_wrap(input: &str) -> Option<FlexWrap> {
    match input.trim().to_ascii_lowercase().as_str() {
        "nowrap" => Some(FlexWrap::NoWrap),
        "wrap" => Some(FlexWrap::Wrap),
        _ => None,
    }
}

fn parse_number(input: &str) -> Option<f32> {
    let value = input.trim().replace(' ', "");
    value.parse::<f32>().ok()
}

fn parse_px(input: &str) -> Option<f32> {
    let trimmed = input.trim().to_ascii_lowercase().replace(' ', "");
    if let Some(v) = trimmed.strip_suffix("px") {
        return v.trim().parse::<f32>().ok();
    }
    if trimmed.chars().all(|c| c.is_ascii_digit() || c == '.' || c == '-') {
        return trimmed.parse::<f32>().ok();
    }
    None
}

pub fn parse_color(input: &str) -> Option<Color> {
    let value = input.trim().to_ascii_lowercase();
    match value.as_str() {
        "black" => Some(Color::BLACK),
        "white" => Some(Color::WHITE),
        "red" => Some(Color::new(220, 20, 60, 255)),
        "green" => Some(Color::new(34, 139, 34, 255)),
        "blue" => Some(Color::new(65, 105, 225, 255)),
        "gray" | "grey" => Some(Color::GRAY),
        "transparent" => Some(Color::new(0, 0, 0, 0)),
        _ => {
            if let Some(hex) = value.strip_prefix('#') {
                match hex.len() {
                    6 => {
                        let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
                        let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
                        let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
                        Some(Color::new(r, g, b, 255))
                    }
                    3 => {
                        let r = u8::from_str_radix(&hex[0..1].repeat(2), 16).ok()?;
                        let g = u8::from_str_radix(&hex[1..2].repeat(2), 16).ok()?;
                        let b = u8::from_str_radix(&hex[2..3].repeat(2), 16).ok()?;
                        Some(Color::new(r, g, b, 255))
                    }
                    _ => None,
                }
            } else {
                None
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::{Display, FlexWrap, style_tree};
    use crate::dom::types::DomNode;
    use crate::parse::cssparser_adapter::{CssParser, CssParserAdapter};

    #[test]
    fn inline_style_wins_specificity() {
        let parser = CssParserAdapter;
        let css = parser
            .parse_stylesheet("#main { color: blue; } .c { color: red; }")
            .expect("css parse should succeed");

        let html = DomNode::element(
            "div".to_string(),
            [
                ("id".to_string(), "main".to_string()),
                ("class".to_string(), "c".to_string()),
                ("style".to_string(), "color: green".to_string()),
            ]
            .into_iter()
            .collect(),
            Vec::new(),
        );

        let styled = style_tree(&html, &css);
        assert_eq!(styled.computed.color, crate::layout::Color::new(34, 139, 34, 255));
    }

    #[test]
    fn default_display_for_span_is_inline() {
        let html = DomNode::element("span".to_string(), HashMap::new(), Vec::new());
        let styled = style_tree(&html, &Default::default());
        assert_eq!(styled.computed.display, Display::Inline);
    }

    #[test]
    fn attribute_selector_matches() {
        let parser = CssParserAdapter;
        let css = parser
            .parse_stylesheet("[data-kind=card] { color: blue; }")
            .expect("css parse should succeed");

        let html = DomNode::element(
            "div".to_string(),
            [("data-kind".to_string(), "card".to_string())]
                .into_iter()
                .collect(),
            Vec::new(),
        );

        let styled = style_tree(&html, &css);
        assert_eq!(styled.computed.color, crate::layout::Color::new(65, 105, 225, 255));
    }

    #[test]
    fn flex_properties_are_computed() {
        let parser = CssParserAdapter;
        let css = parser
            .parse_stylesheet(
                "div { display:flex; flex-wrap: wrap; } p { flex-grow: 2; flex-shrink: 3; flex-basis: 120px; }",
            )
            .expect("css parse should succeed");

        let child = DomNode::element("p".to_string(), HashMap::new(), vec![DomNode::text("x".to_string())]);
        let root = DomNode::element("div".to_string(), HashMap::new(), vec![child]);
        let styled = style_tree(&root, &css);

        assert_eq!(styled.computed.flex_wrap, FlexWrap::Wrap);
        assert_eq!(styled.children[0].computed.flex_grow, 2.0);
        assert_eq!(styled.children[0].computed.flex_shrink, 3.0);
        assert_eq!(styled.children[0].computed.flex_basis, Some(120.0));
    }
}
