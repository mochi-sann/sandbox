use actix_web::{get, post, web, Error, HttpRequest, HttpResponse, Responder};
use sqlx::PgPool;

use crate::model::{NewTodo, Todos};

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct User {
    name: String,
    age: u8,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct NotFoundBody {
    error_status: String,
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
pub async fn get_todos(pool: web::Data<PgPool>) -> web::Json<Vec<Todos>> {
    let todos = Todos::all(&pool).await.unwrap();
    web::Json(todos)
}

pub async fn create_todo(pool: web::Data<PgPool>, new_todo: web::Json<NewTodo>) -> impl Responder {
    let new_todo = new_todo.into_inner();

    let res = Todos::create(new_todo, &pool).await;
    match res {
        Ok(_) => HttpResponse::Ok().body("Todo created"),
        Err(_) => HttpResponse::InternalServerError().body("Something went wrong"),
    }
}
pub async fn get_todo_id(pool: web::Data<PgPool>, id: web::Path<i32>) -> impl Responder {
    let todo = Todos::find_id(id.into_inner(), &pool).await;

    match todo {
        Ok(todo) => HttpResponse::Ok().json(todo),
        Err(_) => HttpResponse::NotFound().body("Not found"),
    }
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
        let user = User {
            name: "John".to_string(),
            age: 18,
        };
        let body = String::from_utf8(body.to_vec()).unwrap();
        assert_eq!(body, user);

        Ok(())
    }
}
