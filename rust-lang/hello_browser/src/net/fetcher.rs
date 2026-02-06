use std::fs;

use reqwest::blocking::Client;
use url::Url;

use crate::error::{BrowserError, Result};

#[derive(Debug, Clone)]
pub struct Resource {
    pub final_url: Url,
    pub body: String,
    pub content_type: String,
}

pub trait DocumentFetcher {
    fn fetch(&self, url: &Url) -> Result<Resource>;
}

pub struct NetFetcher {
    client: Client,
}

impl NetFetcher {
    pub fn new() -> Result<Self> {
        let client = Client::builder()
            .user_agent("hello_browser/0.1")
            .build()
            .map_err(|err| BrowserError::Network(err.to_string()))?;
        Ok(Self { client })
    }
}

impl DocumentFetcher for NetFetcher {
    fn fetch(&self, url: &Url) -> Result<Resource> {
        match url.scheme() {
            "file" => {
                let path = url
                    .to_file_path()
                    .map_err(|_| BrowserError::Network("invalid file:// URL".to_string()))?;
                let body = fs::read_to_string(path)?;
                Ok(Resource {
                    final_url: url.clone(),
                    body,
                    content_type: "text/html".to_string(),
                })
            }
            "http" | "https" => {
                let resp = self
                    .client
                    .get(url.clone())
                    .send()
                    .map_err(|err| BrowserError::Network(err.to_string()))?;
                let final_url = resp.url().clone();
                let content_type = resp
                    .headers()
                    .get(reqwest::header::CONTENT_TYPE)
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("text/html")
                    .to_string();
                let body = resp
                    .text()
                    .map_err(|err| BrowserError::Network(err.to_string()))?;
                Ok(Resource {
                    final_url,
                    body,
                    content_type,
                })
            }
            other => Err(BrowserError::Network(format!("unsupported scheme: {other}"))),
        }
    }
}
