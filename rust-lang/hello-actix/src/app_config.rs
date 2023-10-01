use actix_web::web;

use crate::{
    api::{
        self,
        todo::{create_todo, get_todo_id, get_todos, hello_world},
    },
    manual_hello,
};

pub fn config_app(cfg: &mut web::ServiceConfig) {
    // domain includes: /products/{product_id}/partsproducts/{part_id}
    cfg.service(hello_world).service(
        web::scope("/todos")
            .service(
                web::resource("")
                    .route(web::get().to(get_todos))
                    .route(web::post().to(create_todo)),
            )
            .route("/{id}", web::get().to(get_todo_id))
            .route("/hey", web::get().to(manual_hello)),
    );
}
