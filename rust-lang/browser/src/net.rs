//! Networking stage: fetching resources over HTTP(S).
//!
//! This module lets the engine load pages and stylesheets from the network in
//! addition to the local filesystem. It is intentionally tiny: a blocking GET
//! that checks the status and returns the body as a `String`.
//!
//! ```no_run
//! use browser::net;
//!
//! if net::is_url("https://example.com") {
//!     let html = net::fetch("https://example.com")?;
//!     println!("{html}");
//! }
//! # Ok::<(), browser::net::NetError>(())
//! ```

use std::error::Error;
use std::fmt;

/// Errors that can occur while fetching a resource.
#[derive(Debug)]
pub enum NetError {
    /// The URL did not start with `http://` or `https://`.
    InvalidScheme(String),
    /// The server replied with a non-success status code (not 2xx).
    HttpStatus { url: String, status: u16 },
    /// The response body was not valid UTF-8 text, or could not be read.
    Body(String),
    /// A transport-level error from the underlying HTTP client.
    Transport(String),
}

impl fmt::Display for NetError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            NetError::InvalidScheme(url) => {
                write!(f, "unsupported URL scheme (expected http/https): {url}")
            }
            NetError::HttpStatus { url, status } => {
                write!(f, "request to {url} failed with HTTP status {status}")
            }
            NetError::Body(msg) => write!(f, "failed to read response body: {msg}"),
            NetError::Transport(msg) => write!(f, "network transport error: {msg}"),
        }
    }
}

impl Error for NetError {}

/// Returns `true` if `s` looks like an HTTP(S) URL.
///
/// The check is deliberately simple: it only inspects the scheme prefix and is
/// case-insensitive (so `HTTP://` is accepted as well). Anything else — local
/// paths, `file://`, `ftp://`, etc. — is treated as not a fetchable URL.
pub fn is_url(s: &str) -> bool {
    let lower = s.trim_start().to_ascii_lowercase();
    lower.starts_with("http://") || lower.starts_with("https://")
}

/// Performs a blocking HTTP(S) GET and returns the response body as text.
///
/// - `http` and `https` are supported (https via rustls, no system TLS needed).
/// - A non-2xx status is reported as [`NetError::HttpStatus`].
/// - The body is read as UTF-8; non-text/binary responses will usually fail to
///   decode and surface as [`NetError::Body`].
pub fn fetch(url: &str) -> Result<String, NetError> {
    if !is_url(url) {
        return Err(NetError::InvalidScheme(url.to_string()));
    }

    // ureq returns Err for >= 400 by default; we additionally guard so the
    // behaviour is explicit and any redirect-followed status is validated.
    let mut response = ureq::get(url)
        .call()
        .map_err(|e| classify_ureq_error(url, e))?;

    let status = response.status().as_u16();
    if !(200..300).contains(&status) {
        return Err(NetError::HttpStatus {
            url: url.to_string(),
            status,
        });
    }

    response
        .body_mut()
        .read_to_string()
        .map_err(|e| NetError::Body(e.to_string()))
}

/// Returns `true` if the `Content-Type` header (if any) names a textual type.
///
/// Recognises the common web text types: anything under `text/*`, plus the
/// `+xml`/`+json` structured suffixes and a few well-known application types
/// (`application/json`, `application/javascript`, `application/xml`). When no
/// `Content-Type` is present this returns `true`, since the engine optimistically
/// treats untyped responses as text.
pub fn is_text_content_type(content_type: Option<&str>) -> bool {
    let ct = match content_type {
        Some(ct) => ct.trim().to_ascii_lowercase(),
        // No header: assume text (e.g. many simple servers omit it).
        None => return true,
    };
    // Drop any `; charset=...` parameter.
    let essence = ct.split(';').next().unwrap_or("").trim();

    essence.starts_with("text/")
        || essence.ends_with("+xml")
        || essence.ends_with("+json")
        || matches!(
            essence,
            "application/json"
                | "application/javascript"
                | "application/ecmascript"
                | "application/xml"
                | "application/xhtml+xml"
        )
}

/// Maps a ureq error to our [`NetError`], preserving HTTP status when present.
fn classify_ureq_error(url: &str, err: ureq::Error) -> NetError {
    match err {
        ureq::Error::StatusCode(code) => NetError::HttpStatus {
            url: url.to_string(),
            status: code,
        },
        other => NetError::Transport(other.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_url_accepts_http_and_https() {
        assert!(is_url("http://example.com"));
        assert!(is_url("https://example.com/path?q=1"));
    }

    #[test]
    fn is_url_is_case_insensitive_and_trims() {
        assert!(is_url("HTTP://EXAMPLE.COM"));
        assert!(is_url("HtTpS://example.com"));
        assert!(is_url("   https://example.com"));
    }

    #[test]
    fn is_url_rejects_non_http() {
        assert!(!is_url("example.com"));
        assert!(!is_url("/local/path/index.html"));
        assert!(!is_url("file:///tmp/x.html"));
        assert!(!is_url("ftp://example.com"));
        assert!(!is_url(""));
        // A path that merely contains "http" later is not a URL.
        assert!(!is_url("./http-notes.txt"));
    }

    #[test]
    fn content_type_text_detection() {
        assert!(is_text_content_type(Some("text/html")));
        assert!(is_text_content_type(Some("text/css; charset=utf-8")));
        assert!(is_text_content_type(Some("TEXT/HTML")));
        assert!(is_text_content_type(Some("application/json")));
        assert!(is_text_content_type(Some("application/xhtml+xml")));
        // Missing header is treated as text.
        assert!(is_text_content_type(None));

        assert!(!is_text_content_type(Some("image/png")));
        assert!(!is_text_content_type(Some("application/octet-stream")));
        assert!(!is_text_content_type(Some("font/ttf")));
    }

    #[test]
    fn fetch_rejects_non_url_without_network() {
        // This must not touch the network: a non-URL fails the scheme check.
        let err = fetch("/local/path.html").unwrap_err();
        matches!(err, NetError::InvalidScheme(_));
    }

    /// Real network fetch. Ignored by default so `cargo test` stays offline.
    #[test]
    #[ignore = "performs a real network request"]
    fn fetch_real_url() {
        let body = fetch("https://example.com").expect("fetch should succeed");
        assert!(body.to_ascii_lowercase().contains("<html"));
    }
}
