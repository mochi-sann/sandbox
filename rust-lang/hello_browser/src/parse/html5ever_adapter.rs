use std::collections::HashMap;

use html5ever::{parse_document, tendril::TendrilSink};
use markup5ever_rcdom::{Handle, NodeData, RcDom};

use crate::dom::types::DomNode;
use crate::error::Result;

pub trait HtmlParser {
    fn parse(&self, html: &str) -> Result<DomNode>;
}

#[derive(Default)]
pub struct Html5everParser;

impl Html5everParser {
    fn convert(handle: &Handle) -> Option<DomNode> {
        match &handle.data {
            NodeData::Document => {
                let children = handle
                    .children
                    .borrow()
                    .iter()
                    .filter_map(Self::convert)
                    .collect::<Vec<_>>();
                Some(DomNode::document(children))
            }
            NodeData::Element { name, attrs, .. } => {
                let tag_name = name.local.to_string();
                let mut map = HashMap::new();
                for attr in attrs.borrow().iter() {
                    map.insert(attr.name.local.to_string(), attr.value.to_string());
                }
                let children = handle
                    .children
                    .borrow()
                    .iter()
                    .filter_map(Self::convert)
                    .collect::<Vec<_>>();
                Some(DomNode::element(tag_name, map, children))
            }
            NodeData::Text { contents } => {
                let text = contents.borrow().to_string();
                if text.trim().is_empty() {
                    None
                } else {
                    Some(DomNode::text(text))
                }
            }
            _ => None,
        }
    }
}

impl HtmlParser for Html5everParser {
    fn parse(&self, html: &str) -> Result<DomNode> {
        let dom: RcDom = parse_document(RcDom::default(), Default::default()).one(html);
        Ok(Self::convert(&dom.document).unwrap_or_else(|| DomNode::document(Vec::new())))
    }
}

pub fn extract_style_blocks(node: &DomNode, out: &mut Vec<String>) {
    use crate::dom::types::NodeType;

    if let NodeType::Element(el) = &node.node_type
        && el.tag_name.eq_ignore_ascii_case("style")
    {
        let css = node
            .children
            .iter()
            .filter_map(|child| {
                if let NodeType::Text(text) = &child.node_type {
                    Some(text.as_str())
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
            .join("\n");
        if !css.trim().is_empty() {
            out.push(css);
        }
    }

    for child in &node.children {
        extract_style_blocks(child, out);
    }
}
