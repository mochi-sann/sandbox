use std::collections::HashMap;

use crate::dom::types::{DomNode, NodeType};
use crate::layout::Color;
use crate::parse::cssparser_adapter::{Selector, Stylesheet};

#[derive(Debug, Clone)]
pub struct StyleNode {
    pub node: DomNode,
    pub specified: HashMap<String, String>,
    pub children: Vec<StyleNode>,
}

impl StyleNode {
    pub fn value(&self, name: &str) -> Option<&str> {
        self.specified.get(name).map(String::as_str)
    }

    pub fn display_none(&self) -> bool {
        self.value("display")
            .is_some_and(|value| value.eq_ignore_ascii_case("none"))
    }

    pub fn font_size_px(&self) -> f32 {
        self.value("font-size")
            .and_then(parse_px)
            .unwrap_or(16.0)
            .clamp(8.0, 72.0)
    }

    pub fn color(&self) -> Color {
        self.value("color").and_then(parse_color).unwrap_or(Color::BLACK)
    }

    pub fn background_color(&self) -> Option<Color> {
        self.value("background-color").and_then(parse_color)
    }

    pub fn border_color(&self) -> Color {
        self.value("border-color")
            .and_then(parse_color)
            .unwrap_or(Color::GRAY)
    }

    pub fn spacing_px(&self, key: &str) -> f32 {
        self.value(key).and_then(parse_px).unwrap_or(0.0).max(0.0)
    }
}

pub fn style_tree(root: &DomNode, stylesheet: &Stylesheet) -> StyleNode {
    let mut specified = HashMap::new();

    if let NodeType::Element(el) = &root.node_type {
        for rule in &stylesheet.rules {
            let matches = rule.selectors.iter().any(|selector| selector_matches(selector, root));
            if matches {
                for (name, value) in &rule.declarations {
                    specified.insert(name.clone(), value.clone());
                }
            }
        }

        if let Some(inline_style) = el.attrs.get("style") {
            for item in inline_style.split(';') {
                if let Some((name, value)) = item.split_once(':') {
                    specified.insert(name.trim().to_ascii_lowercase(), value.trim().to_string());
                }
            }
        }
    }

    let children = root
        .children
        .iter()
        .map(|child| style_tree(child, stylesheet))
        .collect();

    StyleNode {
        node: root.clone(),
        specified,
        children,
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
    }
}

fn parse_px(input: &str) -> Option<f32> {
    let value = input.trim().trim_end_matches("px").trim();
    value.parse::<f32>().ok()
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
