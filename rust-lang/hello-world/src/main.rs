enum Color {
    Red,
    Blue,
    Green,
    Hex(String),
}
fn main() {
    let red = Color::Hex("#ff00ff".to_string());
    let mut scores = std::collections::HashMap::new();
    scores.insert("Sato", 100);
    scores.insert("Tanaka", 90);
    //"Tanaka"がなかったら100をinsert
    scores.entry("Tanaka").or_insert(100);
    println!("{:?}", scores);
    let ahoge = if false { 10 } else { 20 };
    println!("{}", ahoge)
}
