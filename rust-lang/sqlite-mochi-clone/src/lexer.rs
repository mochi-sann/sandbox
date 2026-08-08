use crate::{DbError, Result};

#[derive(Clone, Debug, PartialEq)]
pub enum TokenKind {
    Identifier(String),
    Integer(i64),
    String(String),
    LeftParen,
    RightParen,
    Comma,
    Semicolon,
    Star,
    Minus,
    Equal,
    NotEqual,
    Less,
    LessEqual,
    Greater,
    GreaterEqual,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Token {
    pub kind: TokenKind,
    pub position: usize,
}

pub fn tokenize(input: &str) -> Result<Vec<Token>> {
    let mut chars = input.char_indices().peekable();
    let mut tokens = Vec::new();

    while let Some((position, ch)) = chars.next() {
        let kind = match ch {
            ch if ch.is_whitespace() => continue,
            '(' => TokenKind::LeftParen,
            ')' => TokenKind::RightParen,
            ',' => TokenKind::Comma,
            ';' => TokenKind::Semicolon,
            '*' => TokenKind::Star,
            '-' => TokenKind::Minus,
            '=' => TokenKind::Equal,
            '<' => match chars.peek().map(|(_, ch)| *ch) {
                Some('=') => {
                    chars.next();
                    TokenKind::LessEqual
                }
                Some('>') => {
                    chars.next();
                    TokenKind::NotEqual
                }
                _ => TokenKind::Less,
            },
            '>' => {
                if chars.peek().map(|(_, ch)| *ch) == Some('=') {
                    chars.next();
                    TokenKind::GreaterEqual
                } else {
                    TokenKind::Greater
                }
            }
            '!' => {
                if chars.peek().map(|(_, ch)| *ch) == Some('=') {
                    chars.next();
                    TokenKind::NotEqual
                } else {
                    return Err(DbError::Lex {
                        position,
                        message: "expected '=' after '!'".into(),
                    });
                }
            }
            '\'' => {
                let mut value = String::new();
                loop {
                    match chars.next() {
                        Some((_, '\'')) if chars.peek().map(|(_, ch)| *ch) == Some('\'') => {
                            chars.next();
                            value.push('\'');
                        }
                        Some((_, '\'')) => break,
                        Some((_, ch)) => value.push(ch),
                        None => {
                            return Err(DbError::Lex {
                                position,
                                message: "unterminated string literal".into(),
                            });
                        }
                    }
                }
                TokenKind::String(value)
            }
            ch if ch.is_ascii_digit() => {
                let mut end = position + ch.len_utf8();
                while let Some((next_position, next)) = chars.peek().copied() {
                    if !next.is_ascii_digit() {
                        break;
                    }
                    chars.next();
                    end = next_position + next.len_utf8();
                }
                let value = input[position..end].parse().map_err(|_| DbError::Lex {
                    position,
                    message: "integer is outside the i64 range".into(),
                })?;
                TokenKind::Integer(value)
            }
            ch if is_identifier_start(ch) => {
                let mut end = position + ch.len_utf8();
                while let Some((next_position, next)) = chars.peek().copied() {
                    if !is_identifier_continue(next) {
                        break;
                    }
                    chars.next();
                    end = next_position + next.len_utf8();
                }
                TokenKind::Identifier(input[position..end].to_owned())
            }
            _ => {
                return Err(DbError::Lex {
                    position,
                    message: format!("unexpected character '{ch}'"),
                });
            }
        };
        tokens.push(Token { kind, position });
    }

    Ok(tokens)
}

fn is_identifier_start(ch: char) -> bool {
    ch == '_' || ch.is_alphabetic()
}

fn is_identifier_continue(ch: char) -> bool {
    ch == '_' || ch.is_alphanumeric()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokenizes_operators_and_escaped_strings() {
        let tokens = tokenize("name <> 'Mochi''s' AND age >= 20;").unwrap();
        assert_eq!(tokens[1].kind, TokenKind::NotEqual);
        assert_eq!(tokens[2].kind, TokenKind::String("Mochi's".into()));
        assert_eq!(tokens[5].kind, TokenKind::GreaterEqual);
    }

    #[test]
    fn rejects_unterminated_string() {
        assert!(matches!(tokenize("'oops"), Err(DbError::Lex { .. })));
    }
}
