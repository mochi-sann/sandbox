use rand::Rng;

const N: u128 = 100_000_00;

fn random_float(rng: &mut impl Rng, a: f64, b: f64) -> f64 {
    rng.gen_range(a..b)
}

fn get_rand(rng: &mut impl Rng) -> f64 {
    random_float(rng, -1.0, 1.0)
}

fn main() {
    let mut rng = rand::thread_rng();

    let mut inside_count: u128 = 0;

    for _ in 0..N {
        let x = get_rand(&mut rng);
        let y = get_rand(&mut rng);

        // JS版と同じく距離を計算
        let kyori = (x * x + y * y).sqrt();
        if kyori <= 1.0 {
            inside_count += 1;
        }
    }

    let pi_est = 4.0 * (inside_count as f64) / (N as f64);
    println!("{pi_est}");
}
