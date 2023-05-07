use std::io;

fn prime_factors(mut n: u64) -> Vec<(u64, u64)> {
    let mut factors: Vec<(u64, u64)> = Vec::new();
    let mut i = 2;
    let mut count = 0;
    while i * i <= n {
        if n % i == 0 {
            if i == factors.last().map(|&x| x.0).unwrap_or(0) {
                count += 1;
                let idx = factors.len() - 1;
                factors[idx].1 = count;
            } else {
                count = 1;
                factors.push((i, count));
            }
            n /= i;
        } else {
            i += 1;
        }
    }
    if n > 1 {
        factors.push((n, 1));
    }
    factors
}


fn main() {
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    let n: u64 = input.trim().parse().unwrap();
  
    let factors = prime_factors(n);
    for (factor, count) in factors {
        if count == 1 {
            print!("{} ", factor);
        } else {
            print!("{}^{} ", factor, count);
        }
    }
}
