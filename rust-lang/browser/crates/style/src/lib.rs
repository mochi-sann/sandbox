//! The style tree.
//!
//! This module combines a [`browser_dom`] tree with a [`browser_css`]
//! stylesheet to produce a *style tree*: a parallel tree where every node
//! carries its **computed** CSS property values.
//!
//! The design follows Matt Brubeck's "Let's build a browser engine"
//! (robinson), extended towards a real cascade:
//! - selector matching against an element's tag / id / class
//! - cascading ordered by `(important, specificity, source order)`, so an
//!   `!important` declaration beats a more specific normal one
//! - inheritance: inherited properties (`color`, `font-size`, `font-family`,
//!   `line-height`, ...) fall back to the parent's computed value
//! - an initial-value table providing defaults (`color: black`,
//!   `font-size: 16px`, ...) so [`computed_value`](StyledNode::computed_value)
//!   always resolves to a concrete value
//! - best-effort resolution of relative `font-size` units (`em`, `%`) to px
//!
//! The public entry point is [`style_tree`].

use std::collections::HashMap;

use browser_css::{Color, Rule, Selector, SimpleSelector, Specificity, Stylesheet, Unit, Value};
use browser_dom::{ElementData, Node, NodeType};

// Re-export the DOM node types so consumers of the style tree (which holds a
// `&Node`) can match on `node_type` without depending on `browser-dom` directly.
pub use browser_dom::{self, NodeType as DomNodeType};

/// A map from CSS property names to their [`Value`].
pub type PropertyMap = HashMap<String, Value>;

/// A node in the style tree: a borrowed reference to a DOM [`Node`] together
/// with its computed style and styled children.
///
/// `specified_values` holds the values that won the cascade *and* the values
/// inherited from the parent; i.e. it is the node's fully-resolved **computed
/// style** (the name is kept for backwards compatibility with earlier stages
/// and with the layout/paint crates). Use [`computed_value`](Self::computed_value)
/// to also fold in the initial-value table.
#[derive(Debug)]
pub struct StyledNode<'a> {
    /// The DOM node this style node corresponds to.
    pub node: &'a Node,
    /// The computed CSS property values for this node (cascade + inheritance).
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
    /// Returns the computed value of `name`, if the property is set on this
    /// node (after cascade + inheritance, but *not* falling back to the initial
    /// value table).
    pub fn value(&self, name: &str) -> Option<Value> {
        self.specified_values.get(name).cloned()
    }

    /// Returns the fully-resolved **computed value** of `name`: the cascaded /
    /// inherited value if present, otherwise the property's initial value.
    ///
    /// Returns `None` only for properties with no defined initial value.
    pub fn computed_value(&self, name: &str) -> Option<Value> {
        self.value(name).or_else(|| initial_value(name))
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

/// CSS properties that inherit from parent to child by default.
const INHERITED_PROPERTIES: &[&str] = &[
    "color",
    "font-size",
    "font-family",
    "font-weight",
    "font-style",
    "line-height",
    "text-align",
    "white-space",
];

/// Returns true if `name` is a CSS property that inherits by default.
pub fn is_inherited(name: &str) -> bool {
    INHERITED_PROPERTIES.contains(&name)
}

/// The initial (default) value for a handful of common properties, used when a
/// property is neither set on the node nor inherited.
pub fn initial_value(name: &str) -> Option<Value> {
    match name {
        "display" => Some(Value::Keyword("inline".to_string())),
        "color" => Some(Value::ColorValue(Color {
            r: 0,
            g: 0,
            b: 0,
            a: 255,
        })),
        "font-size" => Some(Value::Length(DEFAULT_FONT_SIZE, Unit::Px)),
        "font-family" => Some(Value::Keyword("serif".to_string())),
        "font-weight" | "font-style" => Some(Value::Keyword("normal".to_string())),
        "line-height" => Some(Value::Keyword("normal".to_string())),
        "margin" | "margin-top" | "margin-right" | "margin-bottom" | "margin-left" | "padding"
        | "padding-top" | "padding-right" | "padding-bottom" | "padding-left" | "border-width"
        | "border-top-width" | "border-right-width" | "border-bottom-width"
        | "border-left-width" => Some(Value::Length(0.0, Unit::Px)),
        _ => None,
    }
}

/// The default font size in CSS pixels (used as the initial `font-size` and as
/// the basis for resolving relative `em` / `%` font sizes at the root).
pub const DEFAULT_FONT_SIZE: f32 = 16.0;

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
    if selector.tag_name.iter().any(|name| *name != elem.tag_name) {
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
        .map(|selector| (browser_css::specificity(selector), rule))
}

/// Finds all rules in `stylesheet` that match `elem`.
fn matching_rules<'a>(elem: &ElementData, stylesheet: &'a Stylesheet) -> Vec<MatchedRule<'a>> {
    stylesheet
        .rules
        .iter()
        .filter_map(|rule| match_rule(elem, rule))
        .collect()
}

/// Computes the cascaded property values for `elem` by applying every matching
/// declaration in cascade order.
///
/// Declarations are sorted by the cascade key `(important, specificity, source
/// order)`: normal declarations first (so `!important` ones overwrite them
/// last and therefore win), then by ascending specificity, and finally — via
/// the stable sort — by source order. Each declaration is keyed by source
/// index so that ties within a rule are also broken by source order.
fn cascaded_values(elem: &ElementData, stylesheet: &Stylesheet) -> PropertyMap {
    let mut values = PropertyMap::new();
    let rules = matching_rules(elem, stylesheet);

    // Flatten every matching declaration into a tuple carrying its cascade key.
    // `source_order` is a global counter across all matched declarations,
    // preserving document order for declarations of equal weight.
    let mut decls: Vec<(bool, Specificity, usize, &str, &Value)> = Vec::new();
    let mut source_order = 0usize;
    for (specificity, rule) in &rules {
        for declaration in &rule.declarations {
            decls.push((
                declaration.important,
                *specificity,
                source_order,
                declaration.name.as_str(),
                &declaration.value,
            ));
            source_order += 1;
        }
    }

    // Ascending order so the *last* applied declaration is the winner:
    // important (true) sorts after normal (false); higher specificity sorts
    // later; later source order sorts later.
    decls.sort_by_key(|(important, specificity, order, _, _)| (*important, *specificity, *order));

    for (_, _, _, name, value) in decls {
        values.insert(name.to_string(), value.clone());
    }

    values
}

/// Builds a style tree from a DOM `root` and a `stylesheet`.
///
/// The returned tree has fully computed styles: every node's
/// `specified_values` contains its cascaded declarations folded together with
/// the inherited values from its ancestors.
pub fn style_tree<'a>(root: &'a Node, stylesheet: &'a Stylesheet) -> StyledNode<'a> {
    style_tree_inner(root, stylesheet, &PropertyMap::new())
}

/// Recursive worker for [`style_tree`]. `inherited` carries the parent's
/// computed values for inherited properties.
fn style_tree_inner<'a>(
    root: &'a Node,
    stylesheet: &'a Stylesheet,
    inherited: &PropertyMap,
) -> StyledNode<'a> {
    // Cascaded values from matching rules (empty for text nodes, which never
    // match selectors but still inherit from their parent).
    let cascaded = match &root.node_type {
        NodeType::Element(elem) => cascaded_values(elem, stylesheet),
        NodeType::Text(_) => PropertyMap::new(),
    };

    let computed = resolve_computed(cascaded, inherited);

    // The set of inherited values handed down to children: every inherited
    // property's computed value on this node.
    let mut child_inherited = PropertyMap::new();
    for &name in INHERITED_PROPERTIES {
        if let Some(value) = computed.get(name) {
            child_inherited.insert(name.to_string(), value.clone());
        }
    }

    let children = root
        .children
        .iter()
        .map(|child| style_tree_inner(child, stylesheet, &child_inherited))
        .collect();

    StyledNode {
        node: root,
        specified_values: computed,
        children,
    }
}

/// Folds `inherited` parent values into the node's own `cascaded` values to
/// produce its computed style.
///
/// For inherited properties not set on the node, the parent's computed value is
/// adopted. Relative `font-size` units (`em` / `%`) are resolved against the
/// parent font size into absolute px on a best-effort basis.
fn resolve_computed(mut cascaded: PropertyMap, inherited: &PropertyMap) -> PropertyMap {
    // Inherit any inherited property the node did not set itself.
    for &name in INHERITED_PROPERTIES {
        if !cascaded.contains_key(name) {
            if let Some(value) = inherited.get(name) {
                cascaded.insert(name.to_string(), value.clone());
            }
        }
    }

    // Resolve a relative font-size (em / %) against the inherited (parent)
    // font-size, on a best-effort basis, into an absolute px length.
    if let Some(resolved) = resolve_relative_font_size(&cascaded, inherited) {
        cascaded.insert("font-size".to_string(), resolved);
    }

    cascaded
}

/// Best-effort resolution of a relative `font-size` (`1.5em`, `150%`) to an
/// absolute px length, using the parent's font size as the basis. Returns
/// `None` if the value is already absolute px or not a recognized relative
/// form.
fn resolve_relative_font_size(cascaded: &PropertyMap, inherited: &PropertyMap) -> Option<Value> {
    let Some(Value::Length(num, unit)) = cascaded.get("font-size") else {
        return None;
    };
    let parent_px = match inherited.get("font-size") {
        Some(Value::Length(px, Unit::Px)) => *px,
        _ => DEFAULT_FONT_SIZE,
    };
    let px = match unit {
        Unit::Em => num * parent_px,
        Unit::Percent => num / 100.0 * parent_px,
        Unit::Px => return None,
    };
    Some(Value::Length(px, Unit::Px))
}

#[cfg(test)]
mod tests {
    use super::*;
    use browser_css as css;
    use browser_dom::{self as dom, AttrMap};

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

    fn black() -> Value {
        Value::ColorValue(css::Color {
            r: 0,
            g: 0,
            b: 0,
            a: 255,
        })
    }

    fn red() -> Value {
        Value::ColorValue(css::Color {
            r: 255,
            g: 0,
            b: 0,
            a: 255,
        })
    }

    #[test]
    fn color_inherits_from_parent_to_child_and_text() {
        // Only the parent <div> sets color; the child <span> and the text node
        // must inherit it.
        let sheet = css::parse("div { color: #ff0000; }".to_string());

        let span = dom::elem(
            "span".to_string(),
            AttrMap::new(),
            vec![dom::text("hi".to_string())],
        );
        let div = dom::elem("div".to_string(), AttrMap::new(), vec![span]);

        let styled = style_tree(&div, &sheet);
        assert_eq!(styled.value("color"), Some(red()));

        let child = &styled.children[0];
        assert_eq!(child.value("color"), Some(red()), "span inherits color");

        let text = &child.children[0];
        assert_eq!(text.value("color"), Some(red()), "text inherits color");
    }

    #[test]
    fn child_can_override_inherited_value() {
        let sheet = css::parse("div { color: #ff0000; } span { color: #000000; }".to_string());
        let span = dom::elem("span".to_string(), AttrMap::new(), vec![]);
        let div = dom::elem("div".to_string(), AttrMap::new(), vec![span]);

        let styled = style_tree(&div, &sheet);
        assert_eq!(styled.children[0].value("color"), Some(black()));
    }

    #[test]
    fn important_beats_higher_specificity() {
        // The tag rule is !important; the id rule is more specific but normal.
        // !important must win.
        let sheet = css::parse(
            "div { color: #ff0000 !important; } #box { color: #000000; }".to_string(),
        );
        let mut attrs = AttrMap::new();
        attrs.insert("id".to_string(), "box".to_string());
        let node = dom::elem("div".to_string(), attrs, vec![]);

        let styled = style_tree(&node, &sheet);
        assert_eq!(styled.value("color"), Some(red()));
    }

    #[test]
    fn initial_values_apply_when_unset() {
        let sheet = css::parse("div { }".to_string());
        let node = dom::elem("div".to_string(), AttrMap::new(), vec![]);
        let styled = style_tree(&node, &sheet);

        // Not set anywhere -> falls back to the initial-value table.
        assert_eq!(styled.value("color"), None);
        assert_eq!(styled.computed_value("color"), Some(black()));
        assert_eq!(
            styled.computed_value("font-size"),
            Some(Value::Length(DEFAULT_FONT_SIZE, Unit::Px))
        );
        assert_eq!(
            styled.computed_value("display"),
            Some(Value::Keyword("inline".to_string()))
        );
    }

    #[test]
    fn relative_em_font_size_resolves_against_parent() {
        // Parent 20px, child 1.5em -> 30px.
        let sheet =
            css::parse("div { font-size: 20px; } span { font-size: 1.5em; }".to_string());
        let span = dom::elem("span".to_string(), AttrMap::new(), vec![]);
        let div = dom::elem("div".to_string(), AttrMap::new(), vec![span]);

        let styled = style_tree(&div, &sheet);
        assert_eq!(
            styled.value("font-size"),
            Some(Value::Length(20.0, Unit::Px))
        );
        assert_eq!(
            styled.children[0].value("font-size"),
            Some(Value::Length(30.0, Unit::Px))
        );
    }
}
