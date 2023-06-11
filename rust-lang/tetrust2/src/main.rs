mod settins;
use settins::{clear_console, move_cursor_top, show_cursor, BlockKind, Field, Potision, BLOCKS , FIELD_HEIGHT , FIELD_WIDTH};
use std::{thread, time};

fn is_collision(field: &Field, pos: &Potision, block: BlockKind) -> bool {
    for y in 0..4 {
        for x in 0..4 {
            if BLOCKS[block as usize][y][x] == 1 {
                if field[pos.y + y][pos.x + x] != 0 {
                    return true;
                }
            }
        }
    }
    false
}

fn main() {
    let field = [
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];
    let mut pos: Potision = Potision { x: 4, y: 0 };
    clear_console();

    for _ in 0..30 {
        let mut field_buf = field;
        if !is_collision(&field_buf, &pos, BlockKind::I) {
            pos.y += 1;
        }

        for y in 0..4 {
            for x in 0..4 {
                if BLOCKS[BlockKind::I as usize][y][x] == 1 {
                    field_buf[pos.y + y][pos.x + x] = 1;
                }
            }
        }
        move_cursor_top();
        for i in 0..FIELD_HEIGHT {
            for j in 0..FIELD_WIDTH {
                if field_buf[i][j] == 1 {
                    print!("[]");
                } else {
                    print!(" .");
                }
            }
            println!();
        }
        thread::sleep(time::Duration::from_millis(500));
    }
    show_cursor();
}
