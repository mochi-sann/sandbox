use std::{fmt, io};

#[derive(Debug)]
pub enum DbError {
    Lex { position: usize, message: String },
    Parse { position: usize, message: String },
    Schema(String),
    Type(String),
    Constraint(String),
    Storage(String),
    Io(io::Error),
}

impl fmt::Display for DbError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Lex { position, message } => write!(f, "lex error at byte {position}: {message}"),
            Self::Parse { position, message } => {
                write!(f, "parse error at byte {position}: {message}")
            }
            Self::Schema(message) => write!(f, "schema error: {message}"),
            Self::Type(message) => write!(f, "type error: {message}"),
            Self::Constraint(message) => write!(f, "constraint error: {message}"),
            Self::Storage(message) => write!(f, "storage error: {message}"),
            Self::Io(error) => write!(f, "I/O error: {error}"),
        }
    }
}

impl std::error::Error for DbError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Io(error) => Some(error),
            _ => None,
        }
    }
}

impl From<io::Error> for DbError {
    fn from(value: io::Error) -> Self {
        Self::Io(value)
    }
}

pub type Result<T> = std::result::Result<T, DbError>;
