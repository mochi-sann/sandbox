use crate::maze::Maze;

mod maze;
#[derive(Debug, Copy, Clone, PartialEq)]
enum TileType {
    Wall,
    Floor,
    Start, // スタート地点
    Goal,  // ゴール地点
}
#[derive(Debug, Copy, Clone, PartialEq)]
enum Direction {
    Up,
    Down,
    Left,
    Right,
}
const MAP_WIDTH: usize = 51;
const MAP_HEIGHT: usize = 51;
fn main() {
    let mut maze = Maze::new();
    maze.dig(1, 1);
    maze.set_start(1, 1);

    maze.render()
    // println!("Hello, world!");
    // // 二次元配列を作成
    // #[allow(unused_mut)]
    // let mut map = [[TileType::Floor; MAP_WIDTH]; MAP_HEIGHT];
    // //端は壁にする
    // for x in 0..MAP_WIDTH {
    //     map[0][x] = TileType::Wall;
    //     map[MAP_HEIGHT - 1][x] = TileType::Wall;
    // }
    // // 配列の中を壁にする
    // for y in 0..MAP_HEIGHT {
    //     map[y][0] = TileType::Wall;
    //     map[y][MAP_WIDTH - 1] = TileType::Wall;
    // }

    // println!("{:?}", map);
}
