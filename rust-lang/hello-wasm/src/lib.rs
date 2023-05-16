use wasm_bindgen::prelude::*;
#[wasm_bindgen]
pub fn sums(value: i32) -> i32 {
    let mut a: i32 = 0;
    for i in 1..value + 1 {
        a += i;
    }
    a
}
// write tests
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works_10() {
        assert_eq!(sums(10), 55);
    }
    #[test]
    fn it_works_100() {
        assert_eq!(sums(100), 5050);
    }
}
