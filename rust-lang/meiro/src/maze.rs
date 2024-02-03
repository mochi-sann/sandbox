use crate::{Direction, TileType, MAP_HEIGHT, MAP_WIDTH};

pub struct Maze {
    tile: [[TileType; MAP_WIDTH]; MAP_HEIGHT],
    stack: Vec<(usize, usize)>,
}
// const directions: [(isize, isize); 4] = [(-1, 0), (1, 0), (0, -1), (0, 1)];

impl Maze {
    pub fn new() -> Maze {
        Maze {
            tile: [[TileType::Wall; MAP_WIDTH]; MAP_HEIGHT],
            stack: Vec::new(),
        }
    }

    pub fn dig(&mut self, x: usize, y: usize) {
        let mut postions: (usize, usize) = (x, y);
        self.tile[y][x] = TileType::Floor;
        let mut directions: Vec<Direction> = Vec::new();
        if self.tile[y][x - 2] == TileType::Wall {
            directions.push(Direction::Left);
        }
        if self.tile[y][x + 2] == TileType::Wall {
            directions.push(Direction::Right);
        }
        if self.tile[y - 2][x] == TileType::Wall {
            directions.push(Direction::Up);
        }
        if self.tile[y + 2][x] == TileType::Wall {
            directions.push(Direction::Down);
        }
        println!("directions {:?}", directions);
        if directions.is_empty() {
            return;
        }
        let dir = directions[rand::random::<usize>() % directions.len()];
        if dir == Direction::Left {
            self.set_tile(x - 2, y, TileType::Floor);
            self.set_tile(x - 1, y, TileType::Floor);
            self.dig(x - 2, y);
        } else if dir == Direction::Right {
            self.set_tile(x + 2, y, TileType::Floor);
            self.set_tile(x + 1, y, TileType::Floor);
            self.dig(x + 2, y);
        } else if dir == Direction::Up {
            self.set_tile(x, y - 2, TileType::Floor);
            self.set_tile(x, y - 1, TileType::Floor);
            self.dig(x, y - 2);
        } else if dir == Direction::Down {
            self.set_tile(x, y + 2, TileType::Floor);
            self.set_tile(x, y + 1, TileType::Floor);
            self.dig(x, y + 2);
        }
    }
    pub fn set_tile(&mut self, x: usize, y: usize, tile: TileType) {
        self.tile[y][x] = tile;
    }
    pub fn get_tile(&self, x: usize, y: usize) -> TileType {
        self.tile[y][x]
    }
    pub fn render(&self) {
        for y in 0..MAP_HEIGHT {
            for x in 0..MAP_WIDTH {
                match self.tile[y][x] {
                    TileType::Wall => print!("##"),
                    TileType::Floor => print!(". "),
                }
            }
            println!();
        }
    }
}
