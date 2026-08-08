use crate::{
    ast::{
        BinaryOperator, ColumnDefinition, ColumnType, Expr, Projection, Statement, UnaryOperator,
        Value,
    },
    error::{DbError, Result},
    lexer::{Token, TokenKind, tokenize},
};

pub fn parse_sql(input: &str) -> Result<Vec<Statement>> {
    Parser::new(tokenize(input)?, input.len()).parse_statements()
}

struct Parser {
    tokens: Vec<Token>,
    current: usize,
    end_position: usize,
}

impl Parser {
    fn new(tokens: Vec<Token>, end_position: usize) -> Self {
        Self {
            tokens,
            current: 0,
            end_position,
        }
    }

    fn parse_statements(mut self) -> Result<Vec<Statement>> {
        let mut statements = Vec::new();
        while !self.is_at_end() {
            while self.consume_kind(&TokenKind::Semicolon) {}
            if self.is_at_end() {
                break;
            }
            statements.push(self.parse_statement()?);
            if !self.consume_kind(&TokenKind::Semicolon) && !self.is_at_end() {
                return self.error("expected ';' between statements");
            }
        }
        Ok(statements)
    }

    fn parse_statement(&mut self) -> Result<Statement> {
        if self.consume_keyword("CREATE") {
            self.expect_keyword("TABLE")?;
            self.parse_create()
        } else if self.consume_keyword("INSERT") {
            self.expect_keyword("INTO")?;
            self.parse_insert()
        } else if self.consume_keyword("SELECT") {
            self.parse_select()
        } else if self.consume_keyword("UPDATE") {
            self.parse_update()
        } else if self.consume_keyword("DELETE") {
            self.expect_keyword("FROM")?;
            self.parse_delete()
        } else {
            self.error("expected CREATE, INSERT, SELECT, UPDATE, or DELETE")
        }
    }

    fn parse_create(&mut self) -> Result<Statement> {
        let name = self.expect_identifier()?;
        self.expect_kind(&TokenKind::LeftParen, "expected '(' after table name")?;
        let mut columns = Vec::new();
        loop {
            let name = self.expect_identifier()?;
            let data_type = if self.consume_keyword("INTEGER") {
                ColumnType::Integer
            } else if self.consume_keyword("TEXT") {
                ColumnType::Text
            } else {
                return self.error("expected INTEGER or TEXT column type");
            };
            let nullable = if self.consume_keyword("NOT") {
                self.expect_keyword("NULL")?;
                false
            } else {
                true
            };
            columns.push(ColumnDefinition {
                name,
                data_type,
                nullable,
            });
            if !self.consume_kind(&TokenKind::Comma) {
                break;
            }
        }
        self.expect_kind(&TokenKind::RightParen, "expected ')' after columns")?;
        Ok(Statement::CreateTable { name, columns })
    }

    fn parse_insert(&mut self) -> Result<Statement> {
        let table = self.expect_identifier()?;
        let columns = if self.consume_kind(&TokenKind::LeftParen) {
            let names = self.parse_identifier_list()?;
            self.expect_kind(&TokenKind::RightParen, "expected ')' after column list")?;
            Some(names)
        } else {
            None
        };
        self.expect_keyword("VALUES")?;
        self.expect_kind(&TokenKind::LeftParen, "expected '(' after VALUES")?;
        let mut values = Vec::new();
        loop {
            values.push(self.parse_value()?);
            if !self.consume_kind(&TokenKind::Comma) {
                break;
            }
        }
        self.expect_kind(&TokenKind::RightParen, "expected ')' after values")?;
        Ok(Statement::Insert {
            table,
            columns,
            values,
        })
    }

    fn parse_select(&mut self) -> Result<Statement> {
        let projection = if self.consume_kind(&TokenKind::Star) {
            Projection::All
        } else {
            Projection::Columns(self.parse_identifier_list()?)
        };
        self.expect_keyword("FROM")?;
        let table = self.expect_identifier()?;
        let filter = self.parse_optional_where()?;
        Ok(Statement::Select {
            table,
            projection,
            filter,
        })
    }

    fn parse_update(&mut self) -> Result<Statement> {
        let table = self.expect_identifier()?;
        self.expect_keyword("SET")?;
        let mut assignments = Vec::new();
        loop {
            let column = self.expect_identifier()?;
            self.expect_kind(&TokenKind::Equal, "expected '=' in assignment")?;
            assignments.push((column, self.parse_value()?));
            if !self.consume_kind(&TokenKind::Comma) {
                break;
            }
        }
        let filter = self.parse_optional_where()?;
        Ok(Statement::Update {
            table,
            assignments,
            filter,
        })
    }

    fn parse_delete(&mut self) -> Result<Statement> {
        let table = self.expect_identifier()?;
        let filter = self.parse_optional_where()?;
        Ok(Statement::Delete { table, filter })
    }

    fn parse_optional_where(&mut self) -> Result<Option<Expr>> {
        if self.consume_keyword("WHERE") {
            Ok(Some(self.parse_or()?))
        } else {
            Ok(None)
        }
    }

    fn parse_or(&mut self) -> Result<Expr> {
        let mut expression = self.parse_and()?;
        while self.consume_keyword("OR") {
            expression = Expr::Binary {
                left: Box::new(expression),
                operator: BinaryOperator::Or,
                right: Box::new(self.parse_and()?),
            };
        }
        Ok(expression)
    }

    fn parse_and(&mut self) -> Result<Expr> {
        let mut expression = self.parse_not()?;
        while self.consume_keyword("AND") {
            expression = Expr::Binary {
                left: Box::new(expression),
                operator: BinaryOperator::And,
                right: Box::new(self.parse_not()?),
            };
        }
        Ok(expression)
    }

    fn parse_not(&mut self) -> Result<Expr> {
        if self.consume_keyword("NOT") {
            return Ok(Expr::Unary {
                operator: UnaryOperator::Not,
                expression: Box::new(self.parse_not()?),
            });
        }
        self.parse_comparison()
    }

    fn parse_comparison(&mut self) -> Result<Expr> {
        let left = self.parse_primary()?;
        if self.consume_keyword("IS") {
            let negated = self.consume_keyword("NOT");
            self.expect_keyword("NULL")?;
            return Ok(Expr::IsNull {
                expression: Box::new(left),
                negated,
            });
        }
        let operator = if self.consume_kind(&TokenKind::Equal) {
            Some(BinaryOperator::Equal)
        } else if self.consume_kind(&TokenKind::NotEqual) {
            Some(BinaryOperator::NotEqual)
        } else if self.consume_kind(&TokenKind::Less) {
            Some(BinaryOperator::Less)
        } else if self.consume_kind(&TokenKind::LessEqual) {
            Some(BinaryOperator::LessEqual)
        } else if self.consume_kind(&TokenKind::Greater) {
            Some(BinaryOperator::Greater)
        } else if self.consume_kind(&TokenKind::GreaterEqual) {
            Some(BinaryOperator::GreaterEqual)
        } else {
            None
        };
        match operator {
            Some(operator) => Ok(Expr::Binary {
                left: Box::new(left),
                operator,
                right: Box::new(self.parse_primary()?),
            }),
            None => Ok(left),
        }
    }

    fn parse_primary(&mut self) -> Result<Expr> {
        if self.consume_kind(&TokenKind::LeftParen) {
            let expression = self.parse_or()?;
            self.expect_kind(&TokenKind::RightParen, "expected ')' after expression")?;
            return Ok(expression);
        }
        if self.peek_keyword("NULL") || self.peek_value() || self.peek_kind(&TokenKind::Minus) {
            return Ok(Expr::Literal(self.parse_value()?));
        }
        Ok(Expr::Column(self.expect_identifier()?))
    }

    fn parse_value(&mut self) -> Result<Value> {
        if self.consume_keyword("NULL") {
            return Ok(Value::Null);
        }
        let negative = self.consume_kind(&TokenKind::Minus);
        let end_position = self.end_position;
        let token = self.advance().ok_or_else(|| DbError::Parse {
            position: end_position,
            message: "expected a literal value".into(),
        })?;
        match (&token.kind, negative) {
            (TokenKind::Integer(value), false) => Ok(Value::Integer(*value)),
            (TokenKind::Integer(value), true) => value
                .checked_neg()
                .map(Value::Integer)
                .ok_or_else(|| DbError::Parse {
                    position: token.position,
                    message: "integer is outside the i64 range".into(),
                }),
            (TokenKind::String(value), false) => Ok(Value::Text(value.clone())),
            _ => Err(DbError::Parse {
                position: token.position,
                message: "expected INTEGER, TEXT, or NULL literal".into(),
            }),
        }
    }

    fn parse_identifier_list(&mut self) -> Result<Vec<String>> {
        let mut names = vec![self.expect_identifier()?];
        while self.consume_kind(&TokenKind::Comma) {
            names.push(self.expect_identifier()?);
        }
        Ok(names)
    }

    fn expect_identifier(&mut self) -> Result<String> {
        let end_position = self.end_position;
        let token = self.advance().ok_or_else(|| DbError::Parse {
            position: end_position,
            message: "expected identifier".into(),
        })?;
        match &token.kind {
            TokenKind::Identifier(value) => Ok(value.clone()),
            _ => Err(DbError::Parse {
                position: token.position,
                message: "expected identifier".into(),
            }),
        }
    }

    fn expect_keyword(&mut self, keyword: &str) -> Result<()> {
        if self.consume_keyword(keyword) {
            Ok(())
        } else {
            self.error(&format!("expected {keyword}"))
        }
    }

    fn expect_kind(&mut self, kind: &TokenKind, message: &str) -> Result<()> {
        if self.consume_kind(kind) {
            Ok(())
        } else {
            self.error(message)
        }
    }

    fn consume_keyword(&mut self, keyword: &str) -> bool {
        if self.peek_keyword(keyword) {
            self.current += 1;
            true
        } else {
            false
        }
    }

    fn peek_keyword(&self, keyword: &str) -> bool {
        matches!(self.peek().map(|token| &token.kind), Some(TokenKind::Identifier(value)) if value.eq_ignore_ascii_case(keyword))
    }

    fn consume_kind(&mut self, kind: &TokenKind) -> bool {
        if self.peek_kind(kind) {
            self.current += 1;
            true
        } else {
            false
        }
    }

    fn peek_kind(&self, kind: &TokenKind) -> bool {
        self.peek().is_some_and(|token| {
            std::mem::discriminant(&token.kind) == std::mem::discriminant(kind)
        })
    }

    fn peek_value(&self) -> bool {
        matches!(
            self.peek().map(|token| &token.kind),
            Some(TokenKind::Integer(_) | TokenKind::String(_))
        )
    }

    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.current)
    }

    fn advance(&mut self) -> Option<&Token> {
        let token = self.tokens.get(self.current);
        self.current += usize::from(token.is_some());
        token
    }

    fn is_at_end(&self) -> bool {
        self.current >= self.tokens.len()
    }

    fn error<T>(&self, message: &str) -> Result<T> {
        Err(DbError::Parse {
            position: self
                .peek()
                .map_or(self.end_position, |token| token.position),
            message: message.into(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_all_statement_kinds() {
        let sql = "CREATE TABLE users (id INTEGER NOT NULL, name TEXT);\
                   INSERT INTO users (id, name) VALUES (1, 'Mochi');\
                   SELECT id, name FROM users WHERE id >= 1 AND name <> NULL;\
                   UPDATE users SET name = 'Ann' WHERE id = 1;\
                   DELETE FROM users WHERE name IS NULL;";
        let statements = parse_sql(sql).unwrap();
        assert_eq!(statements.len(), 5);
        assert!(matches!(statements[0], Statement::CreateTable { .. }));
        assert!(matches!(statements[4], Statement::Delete { .. }));
    }

    #[test]
    fn and_binds_more_tightly_than_or() {
        let statements = parse_sql("SELECT * FROM t WHERE a = 1 OR b = 2 AND c = 3").unwrap();
        let [
            Statement::Select {
                filter:
                    Some(Expr::Binary {
                        operator, right, ..
                    }),
                ..
            },
        ] = statements.as_slice()
        else {
            panic!("unexpected AST");
        };
        assert_eq!(*operator, BinaryOperator::Or);
        assert!(matches!(
            **right,
            Expr::Binary {
                operator: BinaryOperator::And,
                ..
            }
        ));
    }

    #[test]
    fn parses_negative_integer_and_null_test() {
        let statements =
            parse_sql("INSERT INTO t VALUES (-10); SELECT * FROM t WHERE x IS NOT NULL;").unwrap();
        assert!(matches!(
            &statements[0],
            Statement::Insert { values, .. } if values == &vec![Value::Integer(-10)]
        ));
    }
}
