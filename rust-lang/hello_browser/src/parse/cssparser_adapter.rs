use std::fmt::Write;

use cssparser::{Parser, ParserInput, Token};

use crate::error::{BrowserError, Result};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Selector {
    Tag(String),
    Class(String),
    Id(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Rule {
    pub selectors: Vec<Selector>,
    pub declarations: Vec<(String, String)>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Stylesheet {
    pub rules: Vec<Rule>,
}

pub trait CssParser {
    fn parse_stylesheet(&self, input: &str) -> Result<Stylesheet>;
}

#[derive(Default)]
pub struct CssParserAdapter;

impl CssParserAdapter {
    fn parse_selectors(raw: &str) -> Vec<Selector> {
        raw.split(',')
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .filter_map(|sel| {
                if let Some(class) = sel.strip_prefix('.') {
                    Some(Selector::Class(class.to_string()))
                } else if let Some(id) = sel.strip_prefix('#') {
                    Some(Selector::Id(id.to_string()))
                } else if sel.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
                    Some(Selector::Tag(sel.to_ascii_lowercase()))
                } else {
                    None
                }
            })
            .collect()
    }

    fn parse_declarations(raw: &str) -> Vec<(String, String)> {
        raw.split(';')
            .filter_map(|chunk| {
                let (name, value) = chunk.split_once(':')?;
                let name = name.trim().to_ascii_lowercase();
                if name.is_empty() {
                    return None;
                }
                let value = Self::normalize_css_value(value);
                if value.is_empty() {
                    return None;
                }
                Some((name, value))
            })
            .collect()
    }

    fn normalize_css_value(value: &str) -> String {
        let mut input = ParserInput::new(value);
        let mut parser = Parser::new(&mut input);
        let mut out = String::new();
        while !parser.is_exhausted() {
            if !out.is_empty() {
                out.push(' ');
            }
            match parser.next_including_whitespace_and_comments() {
                Ok(token) => {
                    let _ = write!(&mut out, "{}", Self::token_to_string(token));
                }
                Err(_) => break,
            }
        }
        out.trim().to_string()
    }

    fn token_to_string(token: &Token<'_>) -> String {
        match token {
            Token::Ident(s) => s.to_string(),
            Token::AtKeyword(s) => s.to_string(),
            Token::IDHash(s) => s.to_string(),
            Token::Hash(s) => s.to_string(),
            Token::QuotedString(s) => s.to_string(),
            Token::UnquotedUrl(s) => s.to_string(),
            Token::Dimension { value, unit, .. } => format!("{value}{unit}"),
            Token::WhiteSpace(s) => s.to_string(),
            Token::Comment(s) => s.to_string(),
            Token::Number { value, .. } => value.to_string(),
            Token::Percentage { unit_value, .. } => format!("{}%", unit_value),
            Token::Colon => ":".to_string(),
            Token::Semicolon => ";".to_string(),
            Token::Comma => ",".to_string(),
            Token::Delim(c) => c.to_string(),
            Token::ParenthesisBlock => "()".to_string(),
            Token::SquareBracketBlock => "[]".to_string(),
            Token::CurlyBracketBlock => "{}".to_string(),
            _ => String::new(),
        }
    }
}

impl CssParser for CssParserAdapter {
    fn parse_stylesheet(&self, input: &str) -> Result<Stylesheet> {
        let mut css = input;
        let mut rules = Vec::new();
        while let Some(start) = css.find('{') {
            let selector_text = css[..start].trim();
            let after_start = &css[start + 1..];
            let Some(end) = after_start.find('}') else {
                return Err(BrowserError::Parse("unterminated CSS block".to_string()));
            };
            let body = &after_start[..end];
            let selectors = Self::parse_selectors(selector_text);
            let declarations = Self::parse_declarations(body);
            if !selectors.is_empty() && !declarations.is_empty() {
                rules.push(Rule {
                    selectors,
                    declarations,
                });
            }
            css = &after_start[end + 1..];
        }
        Ok(Stylesheet { rules })
    }
}

#[cfg(test)]
mod tests {
    use super::{CssParser, CssParserAdapter, Selector};

    #[test]
    fn parse_basic_rule() {
        let parser = CssParserAdapter;
        let sheet = parser
            .parse_stylesheet("h1, .title { color: red; margin: 8px; }")
            .expect("css parse should succeed");

        assert_eq!(sheet.rules.len(), 1);
        assert_eq!(sheet.rules[0].selectors[0], Selector::Tag("h1".to_string()));
        assert_eq!(sheet.rules[0].selectors[1], Selector::Class("title".to_string()));
        assert_eq!(sheet.rules[0].declarations.len(), 2);
    }
}
