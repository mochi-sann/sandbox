/// x回文字列をループする関数
/// # example
///
/// ```
/// let result = repeat_str("hello", 3);
/// assert_eq!(result, "hellohellohello");
/// ```
pub fn repeat_str(s: &str, x: u32) -> String {
    let mut result = String::new();
    // loop 0 to x
    for _ in 0..x {
        result.push_str(s);
    }
    return result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_x_str() {
        assert_eq!(repeat_str("hello", 3), "hellohellohello");
    }
    #[test]
    fn test_x_str_10() {
        assert_eq!(
            repeat_str("hello!", 10),
            "hello!hello!hello!hello!hello!hello!hello!hello!hello!hello!"
        );
    }

    #[test]
    #[should_panic] // この関数はパニックする
    fn test_x_str_panic() {
        assert_eq!(
            repeat_str("hello!", 10),
            "!hello!hello!hello!hello!hello!hello!hello!hello!hello!hello!"
        );
    }
}
