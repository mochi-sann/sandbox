use actix_web::{get, HttpRequest, HttpResponse, Responder};


#[derive(serde::Serialize, serde::Deserialize, Debug)]
struct User {
    name: String,
    age: u8,
}

#[get("/hello_world")]
pub async fn hello_world(req: HttpRequest) -> impl Responder {
    println!("REQ: {req:?}");
    HttpResponse::Ok().body("Hello world!")
}

#[get("/hello_user")]
pub async fn hello_user(req: HttpRequest) -> impl Responder {
    println!("REQ: {req:?}");
    let user = User {
        name: "John".to_string(),
        age: 18,
    };
    HttpResponse::Ok().json(user)
}
