use std::f64::consts::{PI, TAU};

use crate::foo::foo_hoge;
use crate::foo::foo_hoge_hoge;
mod foo;

fn main() {
    println!("{}", PI);
    println!("{}", TAU);
    println!("{}", foo_hoge_hoge("hello world"));
    foo_hoge()
}
