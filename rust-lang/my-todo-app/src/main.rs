use std::{env, net::SocketAddr};

use axum::{
    routing::{get, post, Route},
    Router,
};
use thiserror::Error;

mod api;


#[tokio::main]
async fn main() {
    // ログレベルの初期化
    let log_level = env::var("RUST_LOG").unwrap_or("info".to_string());
    env::set_var("RUST_LOG", log_level);
    tracing_subscriber::fmt::init();

    let app = create_app();

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::debug!("Listening on {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

fn create_app() -> Router {
    return Router::new()
        .route("/", get(root))
        .route("/users", post(api::user::create_user))
        .route("/users", get(api::user::user_list));
}

async fn root() -> &'static str {
    "hello world\nhello world"
}

//** pont 1 **

#[cfg(test)]

mod test {
    use crate::api::user::User;
    use axum::{
        body::Body,
        http::{header, Method, Request},
    };
    use tower::ServiceExt;

    use super::*;

    #[tokio::test]
    async fn test_root_shold_return_hello_world() {
        let req = Request::builder().uri("/").body(Body::empty()).unwrap();

        let res = create_app().oneshot(req).await.unwrap();
        let byets = hyper::body::to_bytes(res.into_body()).await.unwrap();
        let body: String = String::from_utf8(byets.to_vec()).unwrap();

        assert_eq!(body, "hello world\nhello world");
    }

    #[tokio::test]
    async fn test_return_user_data() {
        let req = Request::builder()
            .uri("/users")
            .method(Method::POST)
            .header(header::CONTENT_TYPE, mime::APPLICATION_JSON.as_ref())
            .body(Body::from(r#"{"username": "test_user"}"#))
            .unwrap();

        let res = create_app().oneshot(req).await.unwrap();
        let byets = hyper::body::to_bytes(res.into_body()).await.unwrap();
        let body: String = String::from_utf8(byets.to_vec()).unwrap();
        let user: User = serde_json::from_str(&body).expect("cannot cover User instance ");
        assert_eq!(
            user,
            User {
                id: 1000,
                username: "test_user".to_string()
            }
        );
        //ステータスコードをテスト
    }
}
