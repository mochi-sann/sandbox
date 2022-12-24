mod hoge;
pub use crate::foo::hoge::foo_hoge_hoge;
mod ninety;
pub use crate::foo::ninety::ninety_nine;

pub fn foo_hoge() {
    println!("hogehohgoeh");
}
