//! Networking stage: fetching resources over HTTP(S) and the local filesystem.
//!
//! This crate lets the engine load pages, stylesheets and other resources. It
//! grew from a tiny "GET a string" helper into a small but real network layer
//! that understands:
//!
//! - **URL parsing and resolution** via the [`url`] crate (WHATWG URL Standard),
//!   so relative links can be joined against a base document URL.
//! - **Redirect following** (handled by `ureq`) and reporting of the
//!   *final* URL a resource ended up at.
//! - **Transparent gzip/deflate** decompression (a `ureq` feature).
//! - **Best-effort character-encoding** detection (`Content-Type` charset, BOM
//!   sniffing, then a UTF-8 fallback) when turning raw bytes into text.
//! - **`file://` URLs** as well as `http`/`https`.
//!
//! The high-level entry points are [`fetch_resource`] (bytes + metadata) and
//! [`decode_text`] (bytes -> `String`). The older [`fetch`] helper is retained
//! for convenience and simply fetches and decodes in one step.
//!
//! ```no_run
//! use browser_net as net;
//!
//! // Resolve a relative link against a base, then fetch it.
//! let base = net::parse_url("https://example.com/dir/page.html")?;
//! let target = net::resolve(&base, "../style.css")?;
//! assert_eq!(target.as_str(), "https://example.com/style.css");
//!
//! let resource = net::fetch_resource(&target)?;
//! let text = net::decode_text(&resource);
//! println!("{} bytes from {}", resource.bytes.len(), resource.final_url);
//! # Ok::<(), browser_net::NetError>(())
//! ```

use std::error::Error;
use std::fmt;
use std::path::Path;

pub use url::Url;

/// Maximum response body size we will buffer (32 MiB). Guards against runaway
/// or hostile responses; `ureq` defaults to 10 MiB and we raise it modestly.
const BODY_LIMIT: u64 = 32 * 1024 * 1024;

/// Errors that can occur while fetching or resolving a resource.
#[derive(Debug)]
pub enum NetError {
    /// A URL could not be parsed, or a relative reference could not be resolved.
    InvalidUrl(String),
    /// The URL used a scheme this layer cannot fetch (only http/https/file).
    InvalidScheme(String),
    /// The server replied with a non-success status code (not 2xx).
    HttpStatus { url: String, status: u16 },
    /// The response body could not be read (I/O, size limit, etc.).
    Body(String),
    /// A transport-level error from the underlying HTTP client.
    Transport(String),
    /// Reading a `file://` URL failed (missing file, permissions, …).
    Io(String),
}

impl fmt::Display for NetError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            NetError::InvalidUrl(s) => write!(f, "invalid or unresolvable URL: {s}"),
            NetError::InvalidScheme(url) => {
                write!(f, "unsupported URL scheme (expected http/https/file): {url}")
            }
            NetError::HttpStatus { url, status } => {
                write!(f, "request to {url} failed with HTTP status {status}")
            }
            NetError::Body(msg) => write!(f, "failed to read response body: {msg}"),
            NetError::Transport(msg) => write!(f, "network transport error: {msg}"),
            NetError::Io(msg) => write!(f, "failed to read local resource: {msg}"),
        }
    }
}

impl Error for NetError {}

/// A fetched resource: where it ended up, what type it claims to be, and its
/// raw bytes. Text decoding is deferred to [`decode_text`] so binary resources
/// (images, fonts) can be handled by callers without lossy conversion.
#[derive(Debug, Clone)]
pub struct Resource {
    /// The URL the resource was ultimately served from (after any redirects).
    pub final_url: Url,
    /// The raw `Content-Type` header value, if the server sent one.
    pub content_type: Option<String>,
    /// The raw response body bytes.
    pub bytes: Vec<u8>,
}

impl Resource {
    /// The `charset` parameter of the `Content-Type`, lowercased, if present.
    ///
    /// e.g. for `text/html; charset=Shift_JIS` this returns `Some("shift_jis")`.
    pub fn charset(&self) -> Option<String> {
        self.content_type
            .as_deref()
            .and_then(charset_from_content_type)
    }

    /// Whether the `Content-Type` (if any) names a textual type. A missing
    /// header is optimistically treated as text.
    pub fn is_text(&self) -> bool {
        is_text_content_type(self.content_type.as_deref())
    }
}

/// Returns `true` if `s` looks like an HTTP(S) URL.
///
/// The check is deliberately simple: it only inspects the scheme prefix and is
/// case-insensitive (so `HTTP://` is accepted as well). Anything else — local
/// paths, `file://`, `ftp://`, etc. — is treated as not a fetchable web URL.
/// (Note that [`fetch_resource`] additionally supports `file://`; this helper
/// exists to decide "URL vs. local path" the way the CLI driver does.)
pub fn is_url(s: &str) -> bool {
    let lower = s.trim_start().to_ascii_lowercase();
    lower.starts_with("http://") || lower.starts_with("https://")
}

/// Parses an absolute URL string into a [`Url`].
///
/// Returns [`NetError::InvalidUrl`] if `s` is not a valid absolute URL.
pub fn parse_url(s: &str) -> Result<Url, NetError> {
    Url::parse(s).map_err(|e| NetError::InvalidUrl(format!("{s}: {e}")))
}

/// Resolves a (possibly relative) reference `href` against an absolute `base`.
///
/// This implements the standard URL "join" operation: `href` may be absolute
/// (in which case `base` is ignored), protocol-relative (`//host/path`),
/// root-relative (`/path`), or relative (`../x`, `x.css`, `#frag`).
///
/// ```
/// # use browser_net::{parse_url, resolve};
/// let base = parse_url("https://example.com/a/b/c.html").unwrap();
/// assert_eq!(resolve(&base, "d.css").unwrap().as_str(),
///            "https://example.com/a/b/d.css");
/// assert_eq!(resolve(&base, "/e.css").unwrap().as_str(),
///            "https://example.com/e.css");
/// assert_eq!(resolve(&base, "../f.css").unwrap().as_str(),
///            "https://example.com/a/f.css");
/// assert_eq!(resolve(&base, "https://other.test/g").unwrap().as_str(),
///            "https://other.test/g");
/// ```
pub fn resolve(base: &Url, href: &str) -> Result<Url, NetError> {
    base.join(href)
        .map_err(|e| NetError::InvalidUrl(format!("{href} relative to {base}: {e}")))
}

/// Fetches a resource by URL, following redirects, returning raw bytes plus
/// metadata. Supports `http`, `https`, and `file` schemes.
///
/// - `http`/`https`: a blocking GET via `ureq` (rustls TLS, transparent gzip).
///   A non-2xx status surfaces as [`NetError::HttpStatus`].
/// - `file`: reads the local path the URL points to.
pub fn fetch_resource(url: &Url) -> Result<Resource, NetError> {
    match url.scheme() {
        "http" | "https" => fetch_http(url),
        "file" => fetch_file(url),
        other => Err(NetError::InvalidScheme(format!("{other}: {url}"))),
    }
}

/// Convenience wrapper accepting a string. Parses `s` as an absolute URL and
/// then calls [`fetch_resource`].
pub fn fetch_resource_str(s: &str) -> Result<Resource, NetError> {
    let url = parse_url(s)?;
    fetch_resource(&url)
}

fn fetch_http(url: &Url) -> Result<Resource, NetError> {
    use ureq::ResponseExt;

    let mut response = ureq::get(url.as_str())
        .call()
        .map_err(|e| classify_ureq_error(url.as_str(), e))?;

    let status = response.status().as_u16();
    if !(200..300).contains(&status) {
        return Err(NetError::HttpStatus {
            url: url.to_string(),
            status,
        });
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // Determine the final URL after any redirects. Fall back to the request
    // URL if the redirected URI can't be re-parsed for some reason.
    let final_url = Url::parse(&response.get_uri().to_string()).unwrap_or_else(|_| url.clone());

    let bytes = response
        .body_mut()
        .with_config()
        .limit(BODY_LIMIT)
        .read_to_vec()
        .map_err(|e| NetError::Body(e.to_string()))?;

    Ok(Resource {
        final_url,
        content_type,
        bytes,
    })
}

fn fetch_file(url: &Url) -> Result<Resource, NetError> {
    // `to_file_path` handles percent-decoding and platform path conventions.
    let path = url
        .to_file_path()
        .map_err(|()| NetError::InvalidUrl(format!("not a valid file path: {url}")))?;

    let bytes = std::fs::read(&path).map_err(|e| NetError::Io(format!("{}: {e}", path.display())))?;

    Ok(Resource {
        final_url: url.clone(),
        // Guess a content type from the extension; good enough for the engine.
        content_type: guess_content_type(&path),
        bytes,
    })
}

/// Decodes a [`Resource`]'s bytes into a `String`, best-effort.
///
/// Encoding is chosen in this order:
/// 1. A `charset=...` in the `Content-Type`, if it names a known encoding.
/// 2. A leading byte-order mark (UTF-8/UTF-16 BOM).
/// 3. UTF-8 otherwise.
///
/// Decoding never fails: invalid sequences are replaced with U+FFFD.
pub fn decode_text(resource: &Resource) -> String {
    decode_bytes(&resource.bytes, resource.charset().as_deref())
}

/// Core decoder used by [`decode_text`]: pick an encoding from an explicit
/// charset label / BOM / UTF-8 default and decode lossily.
fn decode_bytes(bytes: &[u8], charset: Option<&str>) -> String {
    // 1. Explicit charset label from the caller (e.g. Content-Type).
    let labeled = charset.and_then(|c| encoding_rs::Encoding::for_label(c.as_bytes()));

    let encoding = match labeled {
        Some(enc) => enc,
        // 2/3. No usable label: let encoding_rs sniff a BOM, defaulting to UTF-8.
        None => {
            let (enc, _bom_len) = encoding_rs::Encoding::for_bom(bytes)
                .unwrap_or((encoding_rs::UTF_8, 0));
            enc
        }
    };

    let (text, _enc_used, _had_errors) = encoding.decode(bytes);
    text.into_owned()
}

/// Performs a blocking fetch and returns the body decoded to text.
///
/// Retained for backwards compatibility with the earlier single-string API and
/// the CLI driver. Accepts an `http`/`https`/`file` URL string. Internally this
/// is [`fetch_resource_str`] followed by [`decode_text`].
pub fn fetch(url: &str) -> Result<String, NetError> {
    let resource = fetch_resource_str(url)?;
    Ok(decode_text(&resource))
}

/// Returns `true` if the `Content-Type` header (if any) names a textual type.
///
/// Recognises the common web text types: anything under `text/*`, plus the
/// `+xml`/`+json` structured suffixes and a few well-known application types.
/// When no `Content-Type` is present this returns `true`, since the engine
/// optimistically treats untyped responses as text.
pub fn is_text_content_type(content_type: Option<&str>) -> bool {
    let ct = match content_type {
        Some(ct) => ct.trim().to_ascii_lowercase(),
        None => return true,
    };
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

/// Extracts a lowercased `charset` parameter from a `Content-Type` value.
///
/// e.g. `text/html; charset=UTF-8` -> `Some("utf-8")`. Surrounding quotes and
/// whitespace are stripped. Returns `None` if there is no `charset` parameter.
pub fn charset_from_content_type(content_type: &str) -> Option<String> {
    // Skip the essence ("text/html"); scan the `; key=value` parameters.
    for param in content_type.split(';').skip(1) {
        let mut kv = param.splitn(2, '=');
        let key = kv.next().unwrap_or("").trim();
        if key.eq_ignore_ascii_case("charset") {
            let value = kv.next().unwrap_or("").trim().trim_matches('"').trim();
            if !value.is_empty() {
                return Some(value.to_ascii_lowercase());
            }
        }
    }
    None
}

/// Guesses a `Content-Type` for a local file from its extension. Only covers
/// the types the engine cares about; unknown extensions yield `None`.
fn guess_content_type(path: &Path) -> Option<String> {
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    let ct = match ext.as_str() {
        "html" | "htm" => "text/html",
        "css" => "text/css",
        "js" | "mjs" => "application/javascript",
        "json" => "application/json",
        "xml" => "application/xml",
        "txt" => "text/plain",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "ttf" => "font/ttf",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        _ => return None,
    };
    Some(ct.to_string())
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
        assert!(!is_url("./http-notes.txt"));
    }

    #[test]
    fn parse_url_rejects_relative() {
        assert!(parse_url("not a url").is_err());
        assert!(parse_url("/relative/path").is_err());
        assert!(parse_url("https://example.com/ok").is_ok());
    }

    #[test]
    fn resolve_relative_references() {
        let base = parse_url("https://example.com/a/b/c.html").unwrap();
        assert_eq!(
            resolve(&base, "d.css").unwrap().as_str(),
            "https://example.com/a/b/d.css"
        );
        assert_eq!(
            resolve(&base, "/e.css").unwrap().as_str(),
            "https://example.com/e.css"
        );
        assert_eq!(
            resolve(&base, "../f.css").unwrap().as_str(),
            "https://example.com/a/f.css"
        );
        assert_eq!(
            resolve(&base, "//other.test/g").unwrap().as_str(),
            "https://other.test/g"
        );
        assert_eq!(
            resolve(&base, "https://abs.test/h").unwrap().as_str(),
            "https://abs.test/h"
        );
    }

    #[test]
    fn resolve_keeps_query_and_fragment() {
        let base = parse_url("https://example.com/dir/page.html?x=1#top").unwrap();
        assert_eq!(
            resolve(&base, "other.html?y=2").unwrap().as_str(),
            "https://example.com/dir/other.html?y=2"
        );
        // A bare fragment keeps the same path.
        assert_eq!(
            resolve(&base, "#bottom").unwrap().as_str(),
            "https://example.com/dir/page.html?x=1#bottom"
        );
    }

    #[test]
    fn charset_extraction() {
        assert_eq!(
            charset_from_content_type("text/html; charset=UTF-8"),
            Some("utf-8".to_string())
        );
        assert_eq!(
            charset_from_content_type("text/html;charset=Shift_JIS"),
            Some("shift_jis".to_string())
        );
        assert_eq!(
            charset_from_content_type("text/plain; charset=\"iso-8859-1\""),
            Some("iso-8859-1".to_string())
        );
        assert_eq!(charset_from_content_type("text/html"), None);
        assert_eq!(charset_from_content_type("application/json; foo=bar"), None);
    }

    #[test]
    fn content_type_text_detection() {
        assert!(is_text_content_type(Some("text/html")));
        assert!(is_text_content_type(Some("text/css; charset=utf-8")));
        assert!(is_text_content_type(Some("TEXT/HTML")));
        assert!(is_text_content_type(Some("application/json")));
        assert!(is_text_content_type(Some("application/xhtml+xml")));
        assert!(is_text_content_type(None));

        assert!(!is_text_content_type(Some("image/png")));
        assert!(!is_text_content_type(Some("application/octet-stream")));
        assert!(!is_text_content_type(Some("font/ttf")));
    }

    #[test]
    fn decode_utf8_default() {
        let bytes = "héllo・世界".as_bytes().to_vec();
        let r = Resource {
            final_url: parse_url("https://example.com/").unwrap(),
            content_type: Some("text/html".to_string()),
            bytes,
        };
        assert_eq!(decode_text(&r), "héllo・世界");
    }

    #[test]
    fn decode_respects_charset_label() {
        // 0xE9 is 'é' in ISO-8859-1 (Latin-1) but invalid lone byte in UTF-8.
        let bytes = vec![b'c', b'a', b'f', 0xE9];
        let r = Resource {
            final_url: parse_url("https://example.com/").unwrap(),
            content_type: Some("text/plain; charset=ISO-8859-1".to_string()),
            bytes,
        };
        assert_eq!(decode_text(&r), "café");
    }

    #[test]
    fn decode_strips_utf8_bom() {
        let mut bytes = vec![0xEF, 0xBB, 0xBF];
        bytes.extend_from_slice("hi".as_bytes());
        let r = Resource {
            final_url: parse_url("https://example.com/").unwrap(),
            content_type: None,
            bytes,
        };
        assert_eq!(decode_text(&r), "hi");
    }

    #[test]
    fn decode_invalid_utf8_is_lossy_not_panic() {
        let bytes = vec![b'a', 0xFF, 0xFE, b'b'];
        let r = Resource {
            final_url: parse_url("https://example.com/").unwrap(),
            content_type: Some("text/html".to_string()),
            bytes,
        };
        let text = decode_text(&r);
        assert!(text.starts_with('a') && text.ends_with('b'));
    }

    #[test]
    fn resource_charset_and_is_text() {
        let r = Resource {
            final_url: parse_url("https://example.com/").unwrap(),
            content_type: Some("text/html; charset=UTF-8".to_string()),
            bytes: Vec::new(),
        };
        assert_eq!(r.charset(), Some("utf-8".to_string()));
        assert!(r.is_text());
    }

    #[test]
    fn fetch_file_url_reads_local_file() {
        // Round-trip a temp file through a file:// URL.
        let dir = std::env::temp_dir();
        let path = dir.join("browser_net_test_file.html");
        std::fs::write(&path, b"<html>file body</html>").unwrap();

        let url = Url::from_file_path(&path).expect("file path -> url");
        let resource = fetch_resource(&url).expect("file fetch should succeed");
        assert_eq!(resource.bytes, b"<html>file body</html>");
        assert_eq!(resource.content_type.as_deref(), Some("text/html"));
        assert_eq!(decode_text(&resource), "<html>file body</html>");

        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn fetch_unsupported_scheme_errors_offline() {
        let url = parse_url("ftp://example.com/x").unwrap();
        let err = fetch_resource(&url).unwrap_err();
        assert!(matches!(err, NetError::InvalidScheme(_)));
    }

    #[test]
    fn fetch_str_rejects_relative_without_network() {
        let err = fetch("/local/path.html").unwrap_err();
        assert!(matches!(err, NetError::InvalidUrl(_)));
    }

    /// Real network fetch. Ignored by default so `cargo test` stays offline.
    #[test]
    #[ignore = "performs a real network request"]
    fn fetch_real_url() {
        let body = fetch("https://example.com").expect("fetch should succeed");
        assert!(body.to_ascii_lowercase().contains("<html"));
    }

    /// Real network fetch via the resource API, exercising redirect + metadata.
    #[test]
    #[ignore = "performs a real network request"]
    fn fetch_resource_real_url() {
        let url = parse_url("https://example.com").unwrap();
        let resource = fetch_resource(&url).expect("fetch should succeed");
        assert!(!resource.bytes.is_empty());
        assert!(resource.is_text());
        let text = decode_text(&resource);
        assert!(text.to_ascii_lowercase().contains("<html"));
    }
}
