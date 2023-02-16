use axum::Json;
use hyper::StatusCode;
use serde::{Deserialize, Serialize};

pub async fn create_user(
    // this argument tells axum to parse the request body
    // as JSON into a `CreateUser` type
    Json(payload): Json<CreateUser>,
) -> (StatusCode, Json<User>) {
    // insert your application logic here
    let user = User {
        id: 1000,
        username: payload.username,
    };

    // this will be converted into a JSON response
    // with a status code of `201 Created`
    (StatusCode::CREATED, Json(user))
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct CreateUser {
    pub username: String,
}

// the output to our `create_user` handler
#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct User {
    pub id: u64,
    pub username: String,
}

pub async fn user_list() -> (StatusCode, Json<Vec<User>>) {
    //10人のuser
    let users = (0..100)
        .map(|id| User {
            id: id + 1 as u64,
            username: format!("user{}", id + 1),
        })
        .collect();

    return (StatusCode::OK, Json(users));
}
