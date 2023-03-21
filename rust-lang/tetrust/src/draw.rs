use crate::block::{Field, Position, FIELD_HEIGHT, FIELD_WIDTH, BLOCKS, BlockKind};
pub fn draw(field: &Field, pos: &Position) {
    let mut field_buf = field.clone();
    for y in 0..4 {
        for x in 0..4 {
            if BLOCKS[BlockKind::I as usize][y][x] == 1 {
                field_buf[y + pos.y][x + pos.x] = 1;
            }
        }
    }
    println!("\x1b[H");
    for y in 0..FIELD_HEIGHT {
        for x in 0..FIELD_WIDTH {
            if field_buf[y][x] == 0 {
                print!(" .");
            } else {
                print!("[]");
            }
        }
        println!()
    }
}
