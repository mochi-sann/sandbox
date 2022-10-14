fn prim_number(num: i32) -> bool {
    let hoge: i32 = num;
    let mut is_prime_number: bool = true;
    for number in 2..hoge / 2 {
        // println!("{}", number);
        if hoge % number == 0 {
            is_prime_number = false;
            break;
        }
    }
    return is_prime_number;
}

fn main() {
    // io::stdin()
    //     .read_line(&mut guess)
    //     .expect("行の読み込みに失敗しました"); // 行の読み込みに失敗しました
    // println!(" input : {}", guess);
    // let stri: String = String::from(guess);
    // let serche_number: i32 = stri.parse().unwrap();
    //
    for num in 2..100 {
        if prim_number(num) {
            print!("{} ", num);
        } else {
            print!("");
            // println!("{} は素数ではありません", num);
        }
    }
}
