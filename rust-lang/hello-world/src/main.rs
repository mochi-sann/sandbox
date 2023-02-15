use warp::Filter;
mod foo;

use foo::repeat_str::repeat_str;

mod parent {
    pub mod child {
        use super::privert_child;

        pub fn print_hoge() {
            privert_child::print_hoge_privert();
        }
    }

    mod privert_child {
        pub fn print_hoge_privert() {
            println!("hogehoge!!");
        }
    }
}

#[tokio::main]
async fn main() {
    // GET /hello/warp => 200 OK with body "Hello, warp!"

    let hello = warp::path::end().map(|| format!("Hello, ! , {}", repeat_str("hello!", 10)));

    println!("Server running at http://localhsot:3000");

    use parent::child::print_hoge;
    print_hoge();
    crate::parent::child::print_hoge();
    foo::bar::baz();

    warp::serve(hello).run(([0, 0, 0, 0], 3000)).await;
}
