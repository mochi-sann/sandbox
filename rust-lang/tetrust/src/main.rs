mod block;
mod draw;
mod gen_stage_arry;
use std::{
    sync::{Arc, Mutex},
    thread,
    time::{self, Duration},
};

use crate::{
    block::{is_collision, BlockKind, Position, BLOCKS, FIELD_HEIGHT, FIELD_WIDTH},
    draw::draw,
};

use getch_rs::{Getch, Key};
fn main() {
    let field = Arc::new(Mutex::new([
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
    ]));

    let pos = Arc::new(Mutex::new(Position { x: 4, y: 0 })); // Arcを使ってスレッド間で共有する

    println!("\x1b[2J\x1b[H\x1b[?25l"); // コンソールをクリアして、カーソルを非表示にする

    draw(&field.lock().unwrap(), &pos.lock().unwrap()); // フィールドを描画

    // 自然落下処理
    {
        let pos = Arc::clone(&pos);
        let _ = thread::spawn(move || {
            loop {
                // 1秒間スリーブする
                thread::sleep(time::Duration::from_millis(1000));
                // 自然落下
                let mut pos = pos.lock().unwrap();
                let new_pos = Position {
                    x: pos.x,
                    y: pos.y + 1,
                };
                if !is_collision(&field.lock().unwrap(), &new_pos, BlockKind::I) {
                    // posの座標を更新
                    *pos = new_pos;
                }
                // フィールドを描画
                draw(&field.lock().unwrap(), &pos);
            }
        });
    }

    let g = Getch::new();

    loop {
        match g.getch() {
            // q を押したらループから出る
            // Ok(Key::Up) => {
            //     break;
            // }
            Ok(Key::Down) => {
                let mut pos = pos.lock().unwrap();

                let new_pos = Position {
                    y: pos.y + 1,
                    x: pos.x,
                };
                if !is_collision(&field.lock().unwrap(), &new_pos, BlockKind::I) {
                    *pos = new_pos;
                }
                draw(&field.lock().unwrap(), &pos);
                println!("down ");
            }
            Ok(Key::Left) => {
                let mut pos = pos.lock().unwrap();
                let new_pos = Position {
                    y: pos.y,
                    x: pos.x - 1,
                };
                if !is_collision(&field.lock().unwrap(), &new_pos, BlockKind::I) {
                    *pos = new_pos;
                }
                draw(&field.lock().unwrap(), &pos);
                println!("left ");
            }
            Ok(Key::Right) => {
                let mut pos = pos.lock().unwrap();
                let new_pos = Position {
                    y: pos.y,
                    x: pos.x + 1,
                };
                let clone_filed = Arc::clone(&field);
                if !is_collision(&clone_filed.lock().unwrap(), &new_pos, BlockKind::I) {
                    *pos = new_pos;
                }
                draw(&field.lock().unwrap(), &pos);
            }
            Ok(Key::Char('q')) => {
                // カーソルを再表示
                println!("\x1b[?25h");
                break;
            }

            _ => (),
        }
    }

    // println!("\x1b[?25h"); // カーソルを表示に戻す
}
