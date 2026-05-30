//! The DOM (Document Object Model).
//!
//! This module defines the in-memory tree of nodes produced by the HTML
//! parser: element nodes (with a tag name and attributes) and text nodes.
//!
//! The design follows Matt Brubeck's "Let's build a browser engine" (robinson):
//! a [`Node`] owns its children and carries a [`NodeType`] describing whether it
//! is a text node or an element.

use std::collections::{HashMap, HashSet};

/// A map from attribute names to their (string) values, e.g. `id`, `class`.
pub type AttrMap = HashMap<String, String>;

/// A single node in the DOM tree.
///
/// Every node owns its `children`; the kind of node (text vs. element) is
/// distinguished by [`NodeType`].
#[derive(Debug, PartialEq, Clone)]
pub struct Node {
    /// Child nodes, in document order. Text nodes have no children.
    pub children: Vec<Node>,
    /// The concrete type/data of this node.
    pub node_type: NodeType,
}

/// The two kinds of nodes this engine understands.
#[derive(Debug, PartialEq, Clone)]
pub enum NodeType {
    /// A run of character data.
    Text(String),
    /// An element such as `<p class="lead">`.
    Element(ElementData),
}

/// Data specific to an element node: its tag name and attributes.
#[derive(Debug, PartialEq, Clone)]
pub struct ElementData {
    /// The lowercase-or-as-written tag name, e.g. `"div"`.
    pub tag_name: String,
    /// The element's attributes.
    pub attributes: AttrMap,
}

impl ElementData {
    /// Returns the value of the `id` attribute, if present.
    pub fn id(&self) -> Option<&String> {
        self.attributes.get("id")
    }

    /// Returns the set of class names from the `class` attribute, split on
    /// ASCII whitespace. Returns an empty set when there is no `class`
    /// attribute.
    pub fn classes(&self) -> HashSet<&str> {
        match self.attributes.get("class") {
            Some(classlist) => classlist.split_whitespace().collect(),
            None => HashSet::new(),
        }
    }
}

/// Constructs a text node holding `data`.
pub fn text(data: String) -> Node {
    Node {
        children: Vec::new(),
        node_type: NodeType::Text(data),
    }
}

/// Constructs an element node with the given tag `name`, `attrs` and
/// `children`.
pub fn elem(name: String, attrs: AttrMap, children: Vec<Node>) -> Node {
    Node {
        children,
        node_type: NodeType::Element(ElementData {
            tag_name: name,
            attributes: attrs,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn text_node_has_no_children() {
        let node = text("hello".to_string());
        assert!(node.children.is_empty());
        assert_eq!(node.node_type, NodeType::Text("hello".to_string()));
    }

    #[test]
    fn elem_carries_tag_and_attrs() {
        let mut attrs = AttrMap::new();
        attrs.insert("id".to_string(), "main".to_string());
        let node = elem("div".to_string(), attrs, vec![text("x".to_string())]);
        match node.node_type {
            NodeType::Element(ref data) => {
                assert_eq!(data.tag_name, "div");
                assert_eq!(data.id(), Some(&"main".to_string()));
            }
            _ => panic!("expected element"),
        }
        assert_eq!(node.children.len(), 1);
    }

    #[test]
    fn classes_split_on_whitespace() {
        let mut attrs = AttrMap::new();
        attrs.insert("class".to_string(), "  lead   bold ".to_string());
        let data = ElementData {
            tag_name: "p".to_string(),
            attributes: attrs,
        };
        let classes = data.classes();
        assert_eq!(classes.len(), 2);
        assert!(classes.contains("lead"));
        assert!(classes.contains("bold"));
    }

    #[test]
    fn classes_empty_when_absent() {
        let data = ElementData {
            tag_name: "span".to_string(),
            attributes: AttrMap::new(),
        };
        assert!(data.classes().is_empty());
    }
}
