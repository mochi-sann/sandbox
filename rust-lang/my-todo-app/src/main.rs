use std::net::SocketAddr;

use axum::{routing::get, Router};

#[tokio::main]
async fn main() {
    let app = Router::new().route("/", get(root));
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Hello, world!");
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn root() -> &'static str {
    "heeeeeeeeeeeeeeeeeeeelllllllllllllooooooooooo world"
}