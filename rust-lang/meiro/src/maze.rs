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
    pub fn get_directions(&self, x: usize, y: usize) -> Vec<Direction> {
        let mut directions: Vec<Direction> = Vec::new();
        if x > 2 && self.tile[y][x - 2] == TileType::Wall {
            directions.push(Direction::Left);
        }
        if x < MAP_WIDTH - 2 && self.tile[y][x + 2] == TileType::Wall {
            directions.push(Direction::Right);
        }
        if y > 2 && self.tile[y - 2][x] == TileType::Wall {
            directions.push(Direction::Up);
        }
        if y < MAP_HEIGHT - 2 && self.tile[y + 2][x] == TileType::Wall {
            directions.push(Direction::Down);
        }
        directions
    }

    pub fn dig(&mut self, x: usize, y: usize) {
        let mut x = x as usize;
        let mut y = y as usize;
        self.tile[y][x] = TileType::Floor;
        loop {
            let directions: Vec<Direction> = self.get_directions(x, y);
            // println!("directions {:?}", directions);
            // println!("stack {:?}", self.stack);
            if directions.is_empty() {
                if let Some((x, y)) = self.stack.pop() {
                    // println!("stack 2 {:?}", self.stack);
                    // println!("pop {:?}", (x, y));
                    self.dig(x, y);
                }
                // if self.stack.is_empty() {
                //     self.set_tile(x, y, TileType::Goal)
                // }

                return;
            } else {
                self.stack.push((x, y));
            }
            let dir = directions[rand::random::<usize>() % directions.len()];
            println!("dir {:?}", dir);
            if dir == Direction::Left {
                self.set_tile(x - 2, y, TileType::Floor);
                self.set_tile(x - 1, y, TileType::Floor);
                x -= 2;
            } else if dir == Direction::Right {
                self.set_tile(x + 2, y, TileType::Floor);
                self.set_tile(x + 1, y, TileType::Floor);
                x += 2;
            } else if dir == Direction::Up {
                self.set_tile(x, y - 2, TileType::Floor);
                self.set_tile(x, y - 1, TileType::Floor);
                y -= 2;
            } else if dir == Direction::Down {
                self.set_tile(x, y + 2, TileType::Floor);
                self.set_tile(x, y + 1, TileType::Floor);
                y += 2;
            }

            // self.render()
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
                    TileType::Floor => print!("  "),
                    TileType::Goal => print!("G."),
                    TileType::Start => print!("S."),
                }
            }
            println!();
        }
    }
}
