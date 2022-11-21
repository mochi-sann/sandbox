// use std::fmt::Debug;
//
// struct User {
//     user_name: String,
//     email: String,
//     sign_in_count: u64,
//     active: bool,
// }
//
// fn build_user(email: String, user_name: String) -> User {
//     User {
//         email,
//         user_name,
//         active: true,
//         sign_in_count: 1,
//     }
// }
// fn main() {
//     let new_user = User {
//         email: "moyurusuto@gmail.com".to_string(),
//         active: false,
//         user_name: String::from("hogehoe"),
//         sign_in_count: 399,
//     };
//
//     println!("The result is {:?}", new_user.user_name);
// }
extern "C" {
    fn abs(x: i32) -> i32; // C言語のabc()ライブラリを定義
}

fn main() {
    unsafe {
        println!("{}", abs(-123));
    }
}
