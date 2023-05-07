use std::io;

fn prime_factors(mut n: u64) -> Vec<u64> {
    let mut factors: Vec<u64> = Vec::new();
    let mut i = 2;
    while i * i <= n {
        while n % i == 0 {
            factors.push(i);
            n /= i;
        }
        i += 1;
    }
    if n > 1 {
        factors.push(n);
    }
    factors
}
fn main() {
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    let n: u64 = input.trim().parse().unwrap();

    let factors = prime_factors(n);
    print!("{:?} ", factors);
}
