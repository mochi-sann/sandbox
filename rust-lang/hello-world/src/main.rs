/**
 * fizz_buzz rust in if
 * */
fn fizz_buzz(value: i32) -> String {
    let result = if value % 15 == 0 {
        return "FizzBuzz".to_string();
    } else if value % 5 == 0 {
        return "Buzz".to_string();
    } else if value % 3 == 0 {
        return "Fizz".to_string();
    } else {
        value.to_string()
    };
    return result;
}
/**
 * fizz_buzz_mutch rust in match
 * */
fn fizz_buzz_mutch(value: i32) -> String {
    let result = match value {
        value if value % 15 == 0 => "fizz-buzz".to_string(),
        value if value % 5 == 0 => "buzz".to_string(),
        value if value % 3 == 0 => "fizz".to_string(),
        _ => value.to_string(),
    };
    return result;
}
fn main() {
    let mut cont = 0 ;
    loop {
        cont +=1 ;
        {}
    }
}
