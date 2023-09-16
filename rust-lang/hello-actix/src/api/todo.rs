use actix_web::{get, web, HttpRequest, HttpResponse, Responder};

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct User {
    name: String,
    age: u8,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Todo {
    id: u64,
    text: String,
    completed: bool,
}

#[get("/hello_world")]
pub async fn hello_world(_req: HttpRequest) -> impl Responder {
    HttpResponse::Ok().body("Hello world!")
}

#[get("/hello_user")]
pub async fn hello_user(_req: HttpRequest) -> web::Json<User> {
    let user = User {
        name: "John".to_string(),
        age: 18,
    };
    web::Json(user)
}
#[get("/todos")]
pub async fn get_todos(_req: HttpRequest) -> web::Json<Vec<Todo>> {
    let todos = vec![Todo {
        text: "hoge".to_string(),
        id: 1,
        completed: true,
    }];
    web::Json(todos)
}
#[cfg(test)]
mod tests {
    use actix_web::{body::to_bytes, dev::Service, http, test, App, Error};

    use super::*;

    #[actix_web::test]
    async fn test_index() -> Result<(), Error> {
        let app = test::init_service(App::new().service(hello_user)).await;

        let req = test::TestRequest::get().uri("/hello_user").to_request();
        let resp = app.call(req).await.unwrap();
        assert_eq!(resp.status(), http::StatusCode::OK);

        let body = to_bytes(resp.into_body()).await?;
        assert_eq!(body, "Hello world!");

        Ok(())
    }
}
