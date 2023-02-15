use warp::Filter;

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

    let hello = warp::path::end().map(|| format!("Hello, ! , {}", x_str("hello ! ", 10)));

    println!("Server running at http://localhsot:3000");
    parent::child::print_hoge();

    warp::serve(hello).run(([0, 0, 0, 0], 3000)).await;
}

// x回文字列をループする関数
fn x_str(s: &str, x: usize) -> String {
    let mut result = String::new();
    // loop 0 to x
    for _ in 0..x {
        result.push_str(s);
    }
    result
}

#[cfg(test)]

mod tests {
    use super::*;

    #[test]
    fn test_x_str() {
        assert_eq!(x_str("hello", 3), "hellohellohello");
    }
    #[test]
    fn test_x_str_10() {
        assert_eq!(
            x_str("hello!", 10),
            "hello!hello!hello!hello!hello!hello!hello!hello!hello!hello!"
        );
    }

    #[test]
    #[should_panic] // この関数はパニックする
    fn test_x_str_panic() {
        assert_eq!(
            x_str("hello!", 10),
            "!hello!hello!hello!hello!hello!hello!hello!hello!hello!hello!"
        );
    }
}
