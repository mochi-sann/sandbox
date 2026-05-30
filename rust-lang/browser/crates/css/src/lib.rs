//! The CSS parser and data model.
//!
//! This module defines the parsed representation of a stylesheet (rules,
//! selectors, declarations, values, units, colors) and a small recursive-
//! descent parser that turns a CSS source string into a [`Stylesheet`].
//!
//! The design follows Matt Brubeck's "Let's build a browser engine"
//! (robinson) and intentionally mirrors the helper-method style of the HTML
//! parser in the `browser-html` crate.
//!
//! Supported subset:
//! - selectors: type (`p`), id (`#main`), class (`.lead`), universal (`*`),
//!   and combinations such as `p.lead#main` (in any order)
//! - comma-separated selector lists: `h1, h2, .title { ... }`
//! - declaration blocks with `name: value;` pairs
//! - values: keywords (`auto`, `block`, ...), `px` lengths (`10px`), and
//!   `#rrggbb` / `#rgb` hex colors
//!
//! The public entry point is [`parse`].

/// A parsed CSS stylesheet: an ordered list of rules.
#[derive(Debug, PartialEq, Clone)]
pub struct Stylesheet {
    /// The rules, in source order.
    pub rules: Vec<Rule>,
}

/// A single CSS rule: a list of selectors and the declarations they apply.
#[derive(Debug, PartialEq, Clone)]
pub struct Rule {
    /// The selectors that share this rule's declarations.
    pub selectors: Vec<Selector>,
    /// The declarations inside the `{ ... }` block.
    pub declarations: Vec<Declaration>,
}

/// A CSS selector. Only simple selectors are supported for now.
#[derive(Debug, PartialEq, Clone)]
pub enum Selector {
    /// A simple selector (tag/id/class combination, no combinators).
    Simple(SimpleSelector),
}

/// A simple selector: an optional tag name, optional id, and zero or more
/// classes. The universal selector `*` is represented by all-`None`/empty.
#[derive(Debug, PartialEq, Clone)]
pub struct SimpleSelector {
    /// The tag name (`p`), or `None` for the universal selector / no tag.
    pub tag_name: Option<String>,
    /// The id (from `#id`), if any.
    pub id: Option<String>,
    /// The classes (from `.class`), in source order.
    pub class: Vec<String>,
}

/// A single `name: value` declaration.
#[derive(Debug, PartialEq, Clone)]
pub struct Declaration {
    /// The property name, e.g. `"margin-left"`.
    pub name: String,
    /// The property value.
    pub value: Value,
    /// Whether the declaration carries the `!important` flag. Important
    /// declarations win over normal ones in the cascade regardless of
    /// specificity (see the `browser-style` crate).
    pub important: bool,
}

/// A CSS value.
#[derive(Debug, PartialEq, Clone)]
pub enum Value {
    /// A bare keyword such as `auto` or `block`.
    Keyword(String),
    /// A length with its unit, e.g. `10px`.
    Length(f32, Unit),
    /// A color value.
    ColorValue(Color),
}

/// A length unit.
#[derive(Debug, PartialEq, Clone)]
pub enum Unit {
    /// CSS pixels (absolute).
    Px,
    /// `em` — relative to the element's font size.
    Em,
    /// `%` — relative to a context-dependent basis (e.g. parent font size for
    /// `font-size`).
    Percent,
}

/// An RGBA color, each channel in `0..=255`.
#[derive(Debug, PartialEq, Clone)]
pub struct Color {
    /// Red channel.
    pub r: u8,
    /// Green channel.
    pub g: u8,
    /// Blue channel.
    pub b: u8,
    /// Alpha channel (`255` = fully opaque).
    pub a: u8,
}

/// Specificity, as `(id_count, class_count, tag_count)`. Larger tuples win in
/// the cascade (used by the `style` stage).
pub type Specificity = (usize, usize, usize);

/// Computes the specificity of a selector following the CSS cascade rules:
/// number of ids, then classes, then tag names.
pub fn specificity(selector: &Selector) -> Specificity {
    let Selector::Simple(simple) = selector;
    let id = simple.id.iter().count();
    let class = simple.class.len();
    let tag = simple.tag_name.iter().count();
    (id, class, tag)
}

/// Parses a CSS `source` string into a [`Stylesheet`].
pub fn parse(source: String) -> Stylesheet {
    let mut parser = Parser {
        pos: 0,
        input: source,
    };
    Stylesheet {
        rules: parser.parse_rules(),
    }
}

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

    /// Consumes and discards any leading whitespace.
    fn consume_whitespace(&mut self) {
        self.consume_while(char::is_whitespace);
    }

    /// Parses a sequence of rules until EOF.
    fn parse_rules(&mut self) -> Vec<Rule> {
        let mut rules = Vec::new();
        loop {
            self.consume_whitespace();
            if self.eof() {
                break;
            }
            rules.push(self.parse_rule());
        }
        rules
    }

    /// Parses a single rule: selector list followed by a declaration block.
    fn parse_rule(&mut self) -> Rule {
        Rule {
            selectors: self.parse_selectors(),
            declarations: self.parse_declarations(),
        }
    }

    /// Parses a comma-separated list of selectors, sorted by descending
    /// specificity (so the most specific match comes first).
    fn parse_selectors(&mut self) -> Vec<Selector> {
        let mut selectors = Vec::new();
        loop {
            selectors.push(Selector::Simple(self.parse_simple_selector()));
            self.consume_whitespace();
            match self.next_char() {
                ',' => {
                    self.consume_char();
                    self.consume_whitespace();
                }
                '{' => break,
                c => panic!("Unexpected character {:?} in selector list", c),
            }
        }
        // Most-specific first; `sort_by` is stable so equal selectors keep
        // their source order.
        selectors.sort_by_key(|s| std::cmp::Reverse(specificity(s)));
        selectors
    }

    /// Parses a single simple selector (`tag`, `#id`, `.class`, `*`, or a
    /// combination).
    fn parse_simple_selector(&mut self) -> SimpleSelector {
        let mut selector = SimpleSelector {
            tag_name: None,
            id: None,
            class: Vec::new(),
        };
        while !self.eof() {
            match self.next_char() {
                '#' => {
                    self.consume_char();
                    selector.id = Some(self.parse_identifier());
                }
                '.' => {
                    self.consume_char();
                    selector.class.push(self.parse_identifier());
                }
                '*' => {
                    // Universal selector: matches everything, contributes
                    // nothing to specificity.
                    self.consume_char();
                }
                c if valid_identifier_char(c) => {
                    selector.tag_name = Some(self.parse_identifier());
                }
                _ => break,
            }
        }
        selector
    }

    /// Parses a declaration block: `{ name: value; ... }`.
    ///
    /// Box-model shorthands (`margin`, `padding`, `border-width`) are expanded
    /// into their per-side longhand declarations here, so the cascade and
    /// layout stages only ever see longhands.
    fn parse_declarations(&mut self) -> Vec<Declaration> {
        assert_eq!(self.consume_char(), '{');
        let mut declarations = Vec::new();
        loop {
            self.consume_whitespace();
            if self.eof() || self.next_char() == '}' {
                if !self.eof() {
                    self.consume_char(); // '}'
                }
                break;
            }
            let decl = self.parse_declaration();
            expand_shorthand(decl, &mut declarations);
        }
        declarations
    }

    /// Parses one `name: value [!important];` declaration.
    fn parse_declaration(&mut self) -> Declaration {
        let name = self.parse_identifier();
        self.consume_whitespace();
        assert_eq!(self.consume_char(), ':');
        self.consume_whitespace();
        let value = self.parse_value();
        self.consume_whitespace();
        // Optional `!important` flag.
        let important = self.parse_important();
        self.consume_whitespace();
        // Optional trailing semicolon.
        if !self.eof() && self.next_char() == ';' {
            self.consume_char();
        }
        Declaration {
            name,
            value,
            important,
        }
    }

    /// Consumes a trailing `!important` flag if present, returning whether it
    /// was found.
    fn parse_important(&mut self) -> bool {
        if self.eof() || self.next_char() != '!' {
            return false;
        }
        self.consume_char(); // '!'
        self.consume_whitespace();
        let ident = self.parse_identifier().to_ascii_lowercase();
        ident == "important"
    }

    /// Parses a value: hex color, length, or keyword.
    fn parse_value(&mut self) -> Value {
        match self.next_char() {
            '#' => self.parse_color(),
            c if c.is_ascii_digit() || c == '.' || c == '-' || c == '+' => self.parse_length(),
            _ => Value::Keyword(self.parse_value_keyword()),
        }
    }

    /// Parses a length value such as `10px`, `12.5px`, `1.5em`, or `150%`.
    /// A unit-less number defaults to `Px`.
    fn parse_length(&mut self) -> Value {
        let number = self.parse_float();
        let unit = self.parse_unit();
        Value::Length(number, unit)
    }

    /// Parses a floating point number.
    fn parse_float(&mut self) -> f32 {
        let s = self.consume_while(|c| matches!(c, '0'..='9' | '.' | '-' | '+'));
        s.parse().unwrap_or(0.0)
    }

    /// Parses a length unit. `px`, `em`, and `%` are recognized; any other
    /// (or missing) unit defaults to `Px`.
    fn parse_unit(&mut self) -> Unit {
        if !self.eof() && self.next_char() == '%' {
            self.consume_char();
            return Unit::Percent;
        }
        match self.parse_identifier().to_ascii_lowercase().as_str() {
            "em" => Unit::Em,
            _ => Unit::Px,
        }
    }

    /// Parses a `#rgb` or `#rrggbb` color.
    fn parse_color(&mut self) -> Value {
        assert_eq!(self.consume_char(), '#');
        let hex = self.consume_while(|c| c.is_ascii_hexdigit());
        let color = match hex.len() {
            3 => {
                // Shorthand: each digit is doubled.
                let r = expand_nibble(&hex[0..1]);
                let g = expand_nibble(&hex[1..2]);
                let b = expand_nibble(&hex[2..3]);
                Color { r, g, b, a: 255 }
            }
            6 => Color {
                r: parse_hex_pair(&hex[0..2]),
                g: parse_hex_pair(&hex[2..4]),
                b: parse_hex_pair(&hex[4..6]),
                a: 255,
            },
            _ => Color {
                r: 0,
                g: 0,
                b: 0,
                a: 255,
            },
        };
        Value::ColorValue(color)
    }

    /// Parses a keyword value, e.g. `auto`, `block`, `inline-block`.
    fn parse_value_keyword(&mut self) -> String {
        self.consume_while(|c| valid_identifier_char(c) || c == '%')
    }

    /// Parses an identifier (tag/id/class/property name).
    fn parse_identifier(&mut self) -> String {
        self.consume_while(valid_identifier_char)
    }
}

/// Expands a box-model shorthand declaration (`margin`, `padding`,
/// `border-width`) into its four per-side longhand declarations, pushing the
/// results onto `out`. Non-shorthand declarations are pushed through unchanged.
///
/// The CSS 1-to-4 value syntax is honoured, but because this minimal parser
/// only models a single [`Value`] per declaration (not a value list), a single
/// value is applied to all four sides. That covers the common
/// `margin: 10px;` case; multi-value shorthands degrade to the first value.
fn expand_shorthand(decl: Declaration, out: &mut Vec<Declaration>) {
    let sides = match decl.name.as_str() {
        "margin" => ["margin-top", "margin-right", "margin-bottom", "margin-left"],
        "padding" => [
            "padding-top",
            "padding-right",
            "padding-bottom",
            "padding-left",
        ],
        "border-width" => [
            "border-top-width",
            "border-right-width",
            "border-bottom-width",
            "border-left-width",
        ],
        _ => {
            out.push(decl);
            return;
        }
    };
    for side in sides {
        out.push(Declaration {
            name: side.to_string(),
            value: decl.value.clone(),
            important: decl.important,
        });
    }
    // Keep the shorthand itself too, so existing layout code that looks up the
    // shorthand name (e.g. `lookup("margin-left", "margin", ...)`) still works.
    out.push(decl);
}

/// Returns true if `c` may appear in a CSS identifier.
fn valid_identifier_char(c: char) -> bool {
    matches!(c, 'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_')
}

/// Parses a two-character hex string into a byte (defaults to 0 on error).
fn parse_hex_pair(s: &str) -> u8 {
    u8::from_str_radix(s, 16).unwrap_or(0)
}

/// Expands a single hex nibble (`"a"`) to a byte by doubling it (`0xaa`).
fn expand_nibble(s: &str) -> u8 {
    let n = u8::from_str_radix(s, 16).unwrap_or(0);
    n * 17 // 0x11 == doubling the nibble
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_simple_rule_with_declarations() {
        let css = "p { margin: 10px; color: #ff0000; }".to_string();
        let sheet = parse(css);
        assert_eq!(sheet.rules.len(), 1);

        let rule = &sheet.rules[0];
        assert_eq!(rule.selectors.len(), 1);
        let Selector::Simple(sel) = &rule.selectors[0];
        assert_eq!(sel.tag_name, Some("p".to_string()));
        assert_eq!(sel.id, None);
        assert!(sel.class.is_empty());

        // `margin` expands into 4 longhands + the shorthand itself, then color.
        let color = rule
            .declarations
            .iter()
            .find(|d| d.name == "color")
            .unwrap();
        assert_eq!(
            color.value,
            Value::ColorValue(Color {
                r: 255,
                g: 0,
                b: 0,
                a: 255
            })
        );
        let margin_left = rule
            .declarations
            .iter()
            .find(|d| d.name == "margin-left")
            .unwrap();
        assert_eq!(margin_left.value, Value::Length(10.0, Unit::Px));
        let margin = rule
            .declarations
            .iter()
            .find(|d| d.name == "margin")
            .unwrap();
        assert_eq!(margin.value, Value::Length(10.0, Unit::Px));
    }

    #[test]
    fn parses_important_flag_and_shorthand_expansion() {
        let css = "p { color: #ff0000 !important; padding: 5px; }".to_string();
        let sheet = parse(css);
        let rule = &sheet.rules[0];

        let color = rule
            .declarations
            .iter()
            .find(|d| d.name == "color")
            .unwrap();
        assert!(color.important);

        // padding -> 4 longhands (all 5px, not important) + shorthand.
        let padding_top = rule
            .declarations
            .iter()
            .find(|d| d.name == "padding-top")
            .unwrap();
        assert_eq!(padding_top.value, Value::Length(5.0, Unit::Px));
        assert!(!padding_top.important);
        assert!(rule.declarations.iter().any(|d| d.name == "padding-right"));
        assert!(rule.declarations.iter().any(|d| d.name == "padding-bottom"));
        assert!(rule.declarations.iter().any(|d| d.name == "padding-left"));
    }

    #[test]
    fn parses_combined_and_universal_selectors() {
        let css = "div.lead#main, * { display: block; }".to_string();
        let sheet = parse(css);
        assert_eq!(sheet.rules.len(), 1);

        let rule = &sheet.rules[0];
        assert_eq!(rule.selectors.len(), 2);

        // Sorted by descending specificity: the id/class/tag selector first.
        let Selector::Simple(first) = &rule.selectors[0];
        assert_eq!(first.tag_name, Some("div".to_string()));
        assert_eq!(first.id, Some("main".to_string()));
        assert_eq!(first.class, vec!["lead".to_string()]);
        assert_eq!(specificity(&rule.selectors[0]), (1, 1, 1));

        // The universal selector contributes nothing to specificity.
        let Selector::Simple(second) = &rule.selectors[1];
        assert_eq!(second.tag_name, None);
        assert_eq!(second.id, None);
        assert!(second.class.is_empty());
        assert_eq!(specificity(&rule.selectors[1]), (0, 0, 0));

        assert_eq!(rule.declarations.len(), 1);
        assert_eq!(rule.declarations[0].name, "display");
        assert_eq!(
            rule.declarations[0].value,
            Value::Keyword("block".to_string())
        );
    }

    #[test]
    fn parses_multiple_rules_and_shorthand_color() {
        let css = "
            h1 { color: #abc; }
            .title { width: 50px; height: auto; }
        "
        .to_string();
        let sheet = parse(css);
        assert_eq!(sheet.rules.len(), 2);

        // First rule: tag selector, 3-digit hex expanded to 6.
        let Selector::Simple(h1) = &sheet.rules[0].selectors[0];
        assert_eq!(h1.tag_name, Some("h1".to_string()));
        assert_eq!(
            sheet.rules[0].declarations[0].value,
            Value::ColorValue(Color {
                r: 0xaa,
                g: 0xbb,
                b: 0xcc,
                a: 255
            })
        );

        // Second rule: class selector with two declarations.
        let Selector::Simple(title) = &sheet.rules[1].selectors[0];
        assert_eq!(title.class, vec!["title".to_string()]);
        assert_eq!(title.tag_name, None);
        assert_eq!(sheet.rules[1].declarations.len(), 2);
        assert_eq!(
            sheet.rules[1].declarations[0].value,
            Value::Length(50.0, Unit::Px)
        );
        assert_eq!(
            sheet.rules[1].declarations[1].value,
            Value::Keyword("auto".to_string())
        );
    }
}
