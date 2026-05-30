//! The HTML parser.
//!
//! Turns a source string of HTML into a [`browser_dom`] tree using a small
//! recursive-descent parser in the style of Matt Brubeck's robinson.
//!
//! Supported subset:
//! - balanced start/end tags: `<p>...</p>`
//! - attributes with double- or single-quoted values: `name="value"`,
//!   `name='value'`
//! - text nodes
//! - HTML comments (`<!-- ... -->`) are skipped
//! - void / self-closing tags (`<br>`, `<img/>`) get no children
//!
//! The public entry point is [`parse`], which always returns a single root
//! node: if the source has multiple top-level nodes they are wrapped in a
//! synthetic `<html>` element.

use browser_dom::{self as dom, AttrMap, Node};

/// Parses an HTML `source` string into a single DOM [`Node`].
///
/// If parsing yields exactly one top-level node it is returned directly;
/// otherwise (zero or multiple top-level nodes) the nodes are wrapped in an
/// `<html>` element so the caller always receives a single root.
pub fn parse(source: String) -> Node {
    let mut nodes = Parser {
        pos: 0,
        input: source,
    }
    .parse_nodes();

    if nodes.len() == 1 {
        nodes.swap_remove(0)
    } else {
        dom::elem("html".to_string(), AttrMap::new(), nodes)
    }
}

/// Tag names that never have a closing tag (HTML void elements).
const VOID_ELEMENTS: &[&str] = &[
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source",
    "track", "wbr",
];

struct Parser {
    /// Current byte offset into `input`.
    pos: usize,
    input: String,
}

impl Parser {
    /// Reads the character at the current position without consuming it.
    fn next_char(&self) -> char {
        self.input[self.pos..].chars().next().unwrap()
    }

    /// Returns true if the remaining input begins with `s`.
    fn starts_with(&self, s: &str) -> bool {
        self.input[self.pos..].starts_with(s)
    }

    /// Returns true if all input has been consumed.
    fn eof(&self) -> bool {
        self.pos >= self.input.len()
    }

    /// Consumes and returns the current character, advancing `pos`.
    fn consume_char(&mut self) -> char {
        let mut iter = self.input[self.pos..].char_indices();
        let (_, cur_char) = iter.next().unwrap();
        let (next_pos, _) = iter.next().unwrap_or((1, ' '));
        self.pos += next_pos;
        cur_char
    }

    /// Consumes characters while `test` returns true and returns them.
    fn consume_while<F>(&mut self, test: F) -> String
    where
        F: Fn(char) -> bool,
    {
        let mut result = String::new();
        while !self.eof() && test(self.next_char()) {
            result.push(self.consume_char());
        }
        result
    }

    /// Consumes and discards any leading ASCII whitespace.
    fn consume_whitespace(&mut self) {
        self.consume_while(char::is_whitespace);
    }

    /// Parses a tag or attribute name (alphanumeric plus a few symbols).
    fn parse_name(&mut self) -> String {
        self.consume_while(|c| matches!(c, 'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_'))
    }

    /// Parses a sequence of sibling nodes until EOF or a closing tag.
    fn parse_nodes(&mut self) -> Vec<Node> {
        let mut nodes = Vec::new();
        loop {
            self.consume_whitespace();
            if self.eof() || self.starts_with("</") {
                break;
            }
            if self.starts_with("<!--") {
                self.skip_comment();
                continue;
            }
            nodes.push(self.parse_node());
        }
        nodes
    }

    /// Skips over an HTML comment `<!-- ... -->`.
    fn skip_comment(&mut self) {
        // Consume the opening "<!--".
        for _ in 0..4 {
            if !self.eof() {
                self.consume_char();
            }
        }
        while !self.eof() && !self.starts_with("-->") {
            self.consume_char();
        }
        // Consume the closing "-->" if present.
        for _ in 0..3 {
            if !self.eof() {
                self.consume_char();
            }
        }
    }

    /// Parses a single node: either an element or a text node.
    fn parse_node(&mut self) -> Node {
        if self.starts_with("<") {
            self.parse_element()
        } else {
            self.parse_text()
        }
    }

    /// Parses a text node up to the next `<`.
    fn parse_text(&mut self) -> Node {
        dom::text(self.consume_while(|c| c != '<'))
    }

    /// Parses an element: opening tag, children, closing tag.
    fn parse_element(&mut self) -> Node {
        // Opening tag.
        assert_eq!(self.consume_char(), '<');
        let tag_name = self.parse_name();
        let attrs = self.parse_attributes();

        // Self-closing form: `<tag ... />`.
        self.consume_whitespace();
        if self.starts_with("/>") {
            self.consume_char(); // '/'
            self.consume_char(); // '>'
            return dom::elem(tag_name, attrs, Vec::new());
        }
        assert_eq!(self.consume_char(), '>');

        // Void elements have no closing tag and no children.
        if VOID_ELEMENTS.contains(&tag_name.to_ascii_lowercase().as_str()) {
            return dom::elem(tag_name, attrs, Vec::new());
        }

        // Children.
        let children = self.parse_nodes();

        // Closing tag: `</tag>`. Tolerate a missing closing tag at EOF.
        if self.starts_with("</") {
            self.consume_char(); // '<'
            self.consume_char(); // '/'
            self.parse_name();
            self.consume_whitespace();
            if !self.eof() {
                assert_eq!(self.consume_char(), '>');
            }
        }

        dom::elem(tag_name, attrs, children)
    }

    /// Parses zero or more `name="value"` attribute pairs.
    fn parse_attributes(&mut self) -> AttrMap {
        let mut attributes = AttrMap::new();
        loop {
            self.consume_whitespace();
            if self.eof() || self.next_char() == '>' || self.starts_with("/>") {
                break;
            }
            let (name, value) = self.parse_attr();
            attributes.insert(name, value);
        }
        attributes
    }

    /// Parses a single `name="value"` (or `name='value'`) pair.
    fn parse_attr(&mut self) -> (String, String) {
        let name = self.parse_name();
        self.consume_whitespace();
        // Allow valueless / malformed attributes degrade to empty string.
        if self.eof() || self.next_char() != '=' {
            return (name, String::new());
        }
        assert_eq!(self.consume_char(), '=');
        self.consume_whitespace();
        let value = self.parse_attr_value();
        (name, value)
    }

    /// Parses a quoted attribute value.
    fn parse_attr_value(&mut self) -> String {
        let open_quote = self.consume_char();
        assert!(open_quote == '"' || open_quote == '\'');
        let value = self.consume_while(|c| c != open_quote);
        assert_eq!(self.consume_char(), open_quote);
        value
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use browser_dom::NodeType;

    #[test]
    fn parses_single_element_with_text() {
        let root = parse("<p>Hello</p>".to_string());
        match root.node_type {
            NodeType::Element(ref data) => assert_eq!(data.tag_name, "p"),
            _ => panic!("expected element"),
        }
        assert_eq!(root.children.len(), 1);
        assert_eq!(
            root.children[0].node_type,
            NodeType::Text("Hello".to_string())
        );
    }

    #[test]
    fn parses_attributes_with_both_quote_styles() {
        let root = parse(r#"<div id="main" class='a b'><span></span></div>"#.to_string());
        match root.node_type {
            NodeType::Element(ref data) => {
                assert_eq!(data.tag_name, "div");
                assert_eq!(data.id(), Some(&"main".to_string()));
                let classes = data.classes();
                assert!(classes.contains("a") && classes.contains("b"));
            }
            _ => panic!("expected element"),
        }
        assert_eq!(root.children.len(), 1);
    }

    #[test]
    fn wraps_multiple_top_level_nodes_in_html() {
        let root = parse("<p>one</p><p>two</p>".to_string());
        match root.node_type {
            NodeType::Element(ref data) => assert_eq!(data.tag_name, "html"),
            _ => panic!("expected synthetic html wrapper"),
        }
        assert_eq!(root.children.len(), 2);
    }

    #[test]
    fn skips_comments_and_handles_void_and_self_closing() {
        let root = parse("<div><!-- note --><br><img src=\"x.png\"/></div>".to_string());
        match root.node_type {
            NodeType::Element(ref data) => assert_eq!(data.tag_name, "div"),
            _ => panic!("expected element"),
        }
        // Comment skipped; two void/self-closing children remain.
        assert_eq!(root.children.len(), 2);
        for child in &root.children {
            assert!(child.children.is_empty());
        }
    }
}
