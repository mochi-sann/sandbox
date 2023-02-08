use std::fmt::{Display, Formatter};

struct Fraction(u32, u32);

impl Fraction {
    // numerator : 分子  , denominator  分母
    fn new(numerator: u32, denominator: u32) -> Self {
        let gcf_value = Self::gcf(numerator, denominator);
        Self(numerator / gcf_value, denominator / gcf_value)
    }

    // 最大公約数を計算
    fn gcf(value1: u32, value2: u32) -> u32 {
        let (mut a, mut b) = if value1 > value2 {
            (value1, value2);
        } else {
            (value1, value2);
        };

        let mut r = a % b;
        while r != 0 {
            a = b;
            b = r;
            r = a % b;
        }
        b
    }
}

impl Display for Fraction {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}/{}", &self.0, &self.1)
    }
}

fn main() {
    let a = Fraction::new(8, 18);
    println!("{}", a)
}
