use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ElementData {
    pub tag_name: String,
    pub attrs: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub enum NodeType {
    Document,
    Element(ElementData),
    Text(String),
}

#[derive(Debug, Clone)]
pub struct DomNode {
    pub node_type: NodeType,
    pub children: Vec<DomNode>,
}

impl DomNode {
    pub fn document(children: Vec<DomNode>) -> Self {
        Self {
            node_type: NodeType::Document,
            children,
        }
    }

    pub fn element(tag_name: String, attrs: HashMap<String, String>, children: Vec<DomNode>) -> Self {
        Self {
            node_type: NodeType::Element(ElementData { tag_name, attrs }),
            children,
        }
    }

    pub fn text(text: String) -> Self {
        Self {
            node_type: NodeType::Text(text),
            children: Vec::new(),
        }
    }

    pub fn attr(&self, key: &str) -> Option<&str> {
        match &self.node_type {
            NodeType::Element(el) => el.attrs.get(key).map(String::as_str),
            _ => None,
        }
    }
}
