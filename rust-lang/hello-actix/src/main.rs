use std::env;

use actix_web::{
    get, middleware::Logger, post, web::{self, Data}, App, HttpRequest, HttpResponse, HttpServer, Responder,
};

mod api;
mod db;
mod model;
use api::todo::{get_todos, hello_user, hello_world};
use dotenv::dotenv;
use sqlx::PgPool;

#[get("/")]
async fn hello(_req: HttpRequest) -> impl Responder {
    HttpResponse::Ok().body("Hello world!")
}

#[post("/echo")]
async fn echo(req_body: String) -> impl Responder {
    HttpResponse::Ok().body(req_body)
}

async fn manual_hello() -> impl Responder {
    HttpResponse::Ok().body("Hey there!")
}

async fn default_handler() -> impl Responder {
    HttpResponse::NotFound().body("404 Not Found")
}

// get port from env or default to 8080
fn get_port() -> u16 {
    dotenv().ok();
    let port = env::var("PORT");
    match port {
        Ok(p) => p.parse::<u16>().unwrap(),
        Err(_) => 8000,
    }
}
// access logs are printed with the INFO level so ensure it is enabled by default
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    let port = get_port();
    std::env::set_var("RUST_LOG", "actix_web=info");
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to create pool");

    env_logger::init();

    log::info!("starting HTTP server at http://localhost:{}", port);
    HttpServer::new(move || {
        App::new()
            .app_data(Data::new(pool.clone()))
            .wrap(Logger::default())
            .service(hello_world)
            .service(hello_user)
            .service(hello)
            .service(get_todos)
            .service(echo)
            .route("/hey", web::get().to(manual_hello))
            .default_service(web::route().to(default_handler))
    })
    .bind(("127.0.0.1", port))?
    .run()
    .await
}
#[cfg(test)]
mod tests {
    use actix_web::{body::to_bytes, dev::Service, http, test, App, Error};

    use super::*;

    #[actix_web::test]
    async fn test_index() -> Result<(), Error> {
        let app = test::init_service(App::new().service(hello)).await;

        let req = test::TestRequest::get().uri("/").to_request();
        let resp = app.call(req).await.unwrap();
        assert_eq!(resp.status(), http::StatusCode::OK);

        let body = to_bytes(resp.into_body()).await?;
        assert_eq!(body, "Hello world!");

        Ok(())
    }
}
