use std::{env, net::SocketAddr};

use axum::{
    routing::{get, post},
    Router,
};

mod api;

#[tokio::main]
async fn main() {
    // ログレベルの初期化
    let log_level = env::var("RUST_LOG").unwrap_or("info".to_string());
    env::set_var("RUST_LOG", log_level);
    tracing_subscriber::fmt::init();

    let app = Router::new()
        .route("/", get(root))
        .route("/users", post(api::user::create_user));

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::debug!("Listening on {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn root() -> &'static str {
    "hello world\nhello world"
}
