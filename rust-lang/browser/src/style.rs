//! The style tree.
//!
//! This module combines a [`crate::dom`] tree with a [`crate::css`]
//! stylesheet to produce a *style tree*: a parallel tree where every element
//! node carries its computed CSS property values (its "specified values").
//!
//! The design follows Matt Brubeck's "Let's build a browser engine"
//! (robinson):
//! - selector matching against an element's tag / id / class
//! - cascading: every matching declaration is applied in order of ascending
//!   specificity, so the most specific rule wins
//!
//! The public entry point is [`style_tree`].

use std::collections::HashMap;

use crate::css::{Rule, Selector, SimpleSelector, Specificity, Stylesheet, Value};
use crate::dom::{ElementData, Node, NodeType};

/// A map from CSS property names to their specified [`Value`].
pub type PropertyMap = HashMap<String, Value>;

/// A node in the style tree: a borrowed reference to a DOM [`Node`] together
/// with its computed style and styled children.
#[derive(Debug)]
pub struct StyledNode<'a> {
    /// The DOM node this style node corresponds to.
    pub node: &'a Node,
    /// The specified CSS property values for this node.
    pub specified_values: PropertyMap,
    /// The styled children, in document order.
    pub children: Vec<StyledNode<'a>>,
}

/// The `display` property's possible values that the layout stage cares about.
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum Display {
    /// `display: inline` (the default).
    Inline,
    /// `display: block`.
    Block,
    /// `display: none` — the node is not laid out at all.
    None,
}

impl<'a> StyledNode<'a> {
    /// Returns the specified value of `name`, if the property is set.
    pub fn value(&self, name: &str) -> Option<Value> {
        self.specified_values.get(name).cloned()
    }

    /// Returns the `display` value of this node, defaulting to
    /// [`Display::Inline`] when unset or unrecognized.
    pub fn display(&self) -> Display {
        match self.value("display") {
            Some(Value::Keyword(s)) => match &*s {
                "block" => Display::Block,
                "none" => Display::None,
                _ => Display::Inline,
            },
            _ => Display::Inline,
        }
    }
}

/// A rule paired with the specificity of the selector that matched. The matched
/// specificity (not the rule's maximum) determines cascade order.
type MatchedRule<'a> = (Specificity, &'a Rule);

/// Returns true if `elem` matches the given simple selector.
///
/// Matching is case-sensitive: both the DOM and CSS retain their original
/// casing. A selector matches when all of its present components (tag, id,
/// classes) are satisfied by the element.
fn matches_simple_selector(elem: &ElementData, selector: &SimpleSelector) -> bool {
    // Tag name: must match if specified.
    if selector
        .tag_name
        .iter()
        .any(|name| *name != elem.tag_name)
    {
        return false;
    }

    // Id: must match if specified.
    if selector.id.iter().any(|id| Some(id) != elem.id()) {
        return false;
    }

    // Classes: every class in the selector must be present on the element.
    let elem_classes = elem.classes();
    if selector
        .class
        .iter()
        .any(|class| !elem_classes.contains(class.as_str()))
    {
        return false;
    }

    // No remaining selector components -> it matches.
    true
}

/// Returns true if `elem` matches `selector`.
fn matches(elem: &ElementData, selector: &Selector) -> bool {
    match selector {
        Selector::Simple(simple) => matches_simple_selector(elem, simple),
    }
}

/// If `rule` matches `elem`, returns the first (most specific) matching
/// selector's specificity paired with the rule.
fn match_rule<'a>(elem: &ElementData, rule: &'a Rule) -> Option<MatchedRule<'a>> {
    // `selectors` is already sorted by descending specificity by the CSS
    // parser, so the first match is the highest-specificity one.
    rule.selectors
        .iter()
        .find(|selector| matches(elem, selector))
        .map(|selector| (crate::css::specificity(selector), rule))
}

/// Finds all rules in `stylesheet` that match `elem`.
fn matching_rules<'a>(elem: &ElementData, stylesheet: &'a Stylesheet) -> Vec<MatchedRule<'a>> {
    stylesheet
        .rules
        .iter()
        .filter_map(|rule| match_rule(elem, rule))
        .collect()
}

/// Computes the specified property values for `elem` by applying every matching
/// declaration in order of ascending specificity (and, for ties, source order).
fn specified_values(elem: &ElementData, stylesheet: &Stylesheet) -> PropertyMap {
    let mut values = PropertyMap::new();
    let mut rules = matching_rules(elem, stylesheet);

    // Sort by ascending specificity so that more specific (and later) rules
    // overwrite earlier ones. `sort_by` is stable, preserving source order for
    // equal specificities.
    rules.sort_by(|(a, _), (b, _)| a.cmp(b));

    for (_, rule) in rules {
        for declaration in &rule.declarations {
            values.insert(declaration.name.clone(), declaration.value.clone());
        }
    }

    values
}

/// Builds a style tree from a DOM `root` and a `stylesheet`.
///
/// Text nodes receive an empty property map (text inherits no computed values
/// in this minimal engine).
pub fn style_tree<'a>(root: &'a Node, stylesheet: &'a Stylesheet) -> StyledNode<'a> {
    let specified_values = match &root.node_type {
        NodeType::Element(elem) => specified_values(elem, stylesheet),
        NodeType::Text(_) => PropertyMap::new(),
    };

    StyledNode {
        node: root,
        specified_values,
        children: root
            .children
            .iter()
            .map(|child| style_tree(child, stylesheet))
            .collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::css;
    use crate::dom::{self, AttrMap};

    #[test]
    fn matches_tag_id_and_class() {
        let mut attrs = AttrMap::new();
        attrs.insert("id".to_string(), "main".to_string());
        attrs.insert("class".to_string(), "lead bold".to_string());
        let elem = match dom::elem("p".to_string(), attrs, vec![]).node_type {
            NodeType::Element(e) => e,
            _ => unreachable!(),
        };

        // Tag-only, id-only, class-only, and combined selectors all match.
        let sheet = css::parse(
            "p { } #main { } .lead { } p.bold#main { } .missing { } div { }".to_string(),
        );
        let mut matched: Vec<_> = matching_rules(&elem, &sheet)
            .into_iter()
            .map(|(spec, _)| spec)
            .collect();
        matched.sort();
        // p, #main, .lead, p.bold#main => 4 matches; .missing and div do not.
        assert_eq!(matched.len(), 4);
    }

    #[test]
    fn cascade_applies_most_specific_value() {
        // Two rules set `color`; the id selector (#box) is more specific than
        // the tag selector (div), so its value must win regardless of order.
        let css = "div { color: #000000; } #box { color: #ffffff; }".to_string();
        let sheet = css::parse(css);

        let mut attrs = AttrMap::new();
        attrs.insert("id".to_string(), "box".to_string());
        let node = dom::elem("div".to_string(), attrs, vec![]);

        let styled = style_tree(&node, &sheet);
        assert_eq!(
            styled.value("color"),
            Some(Value::ColorValue(css::Color {
                r: 255,
                g: 255,
                b: 255,
                a: 255
            }))
        );
    }

    #[test]
    fn display_helper_and_styled_children() {
        // Root <div> is block; child <span> has display:none; text inside.
        let css = "div { display: block; } span { display: none; }".to_string();
        let sheet = css::parse(css);

        let span = dom::elem(
            "span".to_string(),
            AttrMap::new(),
            vec![dom::text("hi".to_string())],
        );
        let div = dom::elem("div".to_string(), AttrMap::new(), vec![span]);

        let styled = style_tree(&div, &sheet);
        assert_eq!(styled.display(), Display::Block);
        assert_eq!(styled.children.len(), 1);

        let child = &styled.children[0];
        assert_eq!(child.display(), Display::None);
        // The text node under <span> has no specified values and defaults to
        // inline.
        assert_eq!(child.children.len(), 1);
        assert!(child.children[0].specified_values.is_empty());
        assert_eq!(child.children[0].display(), Display::Inline);
    }
}
