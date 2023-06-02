// ブロックの種類
#[derive(Clone, Copy)]
pub enum BlockKind {
    I,
    O,
    S,
    Z,
    J,
    L,
    T,
}

pub const FIELD_WIDTH: usize = 11 + 2;
pub const FIELD_HEIGHT: usize = 20 + 1;
pub type Field = [[usize; FIELD_WIDTH]; FIELD_HEIGHT];

// ブロックの形状
pub type BlockShape = [[usize; 4]; 4];
pub const BLOCKS: [BlockShape; 7] = [
    // Iブロック
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    // Oブロック
    [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
    // Sブロック
    [[0, 0, 0, 0], [0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0]],
    // Zブロック
    [[0, 0, 0, 0], [1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
    // Jブロック
    [[0, 0, 0, 0], [1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0]],
    // Lブロック
    [[0, 0, 0, 0], [0, 0, 1, 0], [1, 1, 1, 0], [0, 0, 0, 0]],
    // Tブロック
    [[0, 0, 0, 0], [0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0]],
];
pub struct Potision {
    pub x: usize,
    pub y: usize,
}

pub fn clear_console() {
    print!("{}[2J", 27 as char);
}
pub fn move_cursor_top() {
    print!("{}[0;0H", 27 as char);
}

pub fn show_cursor() {
    println!("\x1b[?25h");
}
