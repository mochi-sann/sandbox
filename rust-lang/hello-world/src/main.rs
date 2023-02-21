#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }

    fn triangle_size(&self) -> u32 {
        self.width * self.height / 2
    }
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
    // otherが自分より大きいかどうか大きかったらtrue 小さかったら false
    fn is_big(&self, other: &Rectangle) -> bool {
        self.area() < other.area()
    }
}

#[derive(Debug)]
enum IpAdressKind {
    V4,
    V6,
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!(
        "The area of the rectangle is {} square pixels.",
        rect1.area()
    );
    println!(
        "The area of the triangle_size is {} square pixels.",
        rect1.triangle_size()
    );
    let rect2 = Rectangle {
        width: 10,
        height: 40,
    };
    let rect3 = Rectangle {
        width: 60,
        height: 45,
    };
    let ip_kind = IpAdressKind::V4;
    println!("{:?}", ip_kind);

    // rect1にrect2ははまり込む？
    println!("Can rect1 hold rect2? {}", rect1.can_hold(&rect2));
    println!("Can rect1 hold rect3? {}", rect1.can_hold(&rect3));

    println!("is big ? {}", rect1.is_big(&rect3));
}
