use thiserror::Error;

#[derive(Debug, Error)]
pub enum BrowserError {
    #[error("URL parse error: {0}")]
    Url(#[from] url::ParseError),
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Network error: {0}")]
    Network(String),
    #[error("Parse error: {0}")]
    Parse(String),
}

pub type Result<T> = std::result::Result<T, BrowserError>;
