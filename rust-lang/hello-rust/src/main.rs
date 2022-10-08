fn prim_number(num: i32) -> bool {
    let hoge: i32 = num;
    let mut is_prime_number: bool = true;
    for number in 2..hoge {
        // println!("{}", number);
        if hoge % number == 0 {
            is_prime_number = false;
            break;
        }
    }
    return is_prime_number;
}

fn main() {
    for num in 2..100 {
        if prim_number(num) {
            println!("{} は素数です", num);
        } else {
            println!("{} は素数ではありません", num);
        }
    }
}
