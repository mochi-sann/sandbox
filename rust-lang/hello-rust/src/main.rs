fn print_coordinates(&(x, y): &(i32, i32)) {
    println!("location: ({},{})", x, y);
}

fn main() {
    let point = (3, 5);
    print_coordinates(&point);
}
