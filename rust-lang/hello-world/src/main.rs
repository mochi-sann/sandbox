pub trait Geometry {
    fn area(&self) -> f64;
    fn name(&self) -> &str {
        return "Geometry";
    }
}

struct Rectangle {
    width: u32,
    height: u32,
}

impl Geometry for Rectangle {
    fn area(&self) -> f64 {
        self.width as f64 * self.height as f64
    }
    fn name(&self) -> &str {
        return "Rectangle";
    }
}

struct Triangle {
    bottom: u32,
    height: u32,
}

impl Geometry for Triangle {
    fn area(&self) -> f64 {
        self.bottom as f64 * self.height as f64 * 0.5
    }
    fn name(&self) -> &str {
        return "Triangle";
    }
}

struct NewCont {
    bottom: u32,
    height: u32,
    population: u32,
}
impl Geometry for NewCont {
    fn area(&self) -> f64 {
        self.bottom as f64 * self.height as f64 * 0.5
    }
    fn name(&self) -> &str {
        return "Triangle";
    }
}

fn main() {
    let a = Rectangle {
        width: 10,
        height: 20,
    };
    let b = Triangle {
        bottom: 20,
        height: 5,
    };
    println!("{} area={}", a.name(), a.area());
    println!("{} area={}", b.name(), b.area());
}
