use actix_web::{
    get, middleware::Logger, post, web, App, Either, HttpRequest, HttpResponse, HttpServer,
    Responder,
};

mod api;
use api::todo::{hello_user, hello_world, get_todos};
const PORT: u16 = 8080;

#[get("/")]
async fn hello(req: HttpRequest) -> impl Responder {
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

// access logs are printed with the INFO level so ensure it is enabled by default
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "actix_web=info");

    env_logger::init();

    log::info!("starting HTTP server at http://localhost:{}", PORT);
    HttpServer::new(|| {
        App::new()
            .wrap(Logger::default())
            .service(hello_world)
            .service(hello_user)
            .service(hello)
            .service(get_todos)
            .service(echo)
            .route("/hey", web::get().to(manual_hello))
            .default_service(web::route().to(default_handler))
    })
    .bind(("127.0.0.1", PORT))?
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
