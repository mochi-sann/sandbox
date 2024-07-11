use std::io;

fn prime_factorization(mut n: u64) -> Vec<u64> {
    let mut factors = Vec::new();
    let mut divisor = 2;

    while n > 1 {
        if n % divisor == 0 {
            factors.push(divisor);
            n /= divisor;
        } else {
            divisor += 1;
        }
    }

    factors
}

fn main() {
    // let n: u64 = input.trim().parse().expect("有効な数値を入力してください");
    for n in 1000..1000000 {
        let factors = prime_factorization(n);

        println!("{}の素因数分解結果：", n);
        if factors.is_empty() {
            println!("{}は素数です", n);
        } else {
            let result = factors
                .iter()
                .map(|&x| x.to_string())
                .collect::<Vec<String>>()
                .join(" × ");
            println!("{}", result);
        }
    }
}
