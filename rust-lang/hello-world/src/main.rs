fn main() {
    // enum IpAddrKind {
    //     V4,
    //     V6,
    // }
    #[derive(Debug)]
    enum IpAddrKind {
        V4(u8, u8, u8, u8),
        V6(String),
    }

    struct IpAddr {
        kind: IpAddrKind,
        address: String,
    }

    let home = IpAddr {
        kind: IpAddrKind::V4(1, 1, 1, 1),
        address: String::from("127.0.0.1"),
    };

    let loopback = IpAddr {
        kind: IpAddrKind::V6("hoge".to_string()),
        address: String::from("::1"),
    };
    println!("{:?}", home.kind);

    println!("{:?}", value_in_cents(Coin::Dime));
}

enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter,
}

fn value_in_cents(coin: Coin) -> u32 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}
