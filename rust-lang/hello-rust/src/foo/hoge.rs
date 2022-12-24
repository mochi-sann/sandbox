pub fn foo_hoge_hoge(value: &str) -> String {
    return format!("foo_hoge_hoge is {}", value);
}
#[cfg(test)]
mod tests {
    use crate::foo::foo_hoge_hoge;

    #[test]
    fn it_works() {
        assert_eq!(foo_hoge_hoge("hello world"), "foo_hoge_hoge is hello world");
    }
}
