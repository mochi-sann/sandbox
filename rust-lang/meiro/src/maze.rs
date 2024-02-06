use crate::{Direction, TileType, MAP_HEIGHT, MAP_WIDTH};

pub struct Maze {
    tile: [[TileType; MAP_WIDTH]; MAP_HEIGHT],
    stack: Vec<(usize, usize)>,
    x: usize,
    y: usize,
}
// const directions: [(isize, isize); 4] = [(-1, 0), (1, 0), (0, -1), (0, 1)];

impl Maze {
    pub fn new(x: usize, y: usize) -> Maze {
        Maze {
            tile: [[TileType::Wall; MAP_WIDTH]; MAP_HEIGHT],
            stack: Vec::new(),
            x,
            y,
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
                // println!("stack {:?}", self.stack);
                self.stack.reverse();
                if self.stack.len() == 0 {
                    self.set_tile(x, y, TileType::Goal);
                    // self.render();
                    return;
                }
                if let Some((x, y)) = self.stack.pop() {
                    // println!("stack 2 {:?}", self.stack);
                    // println!("pop {:?}", (x, y));
                    self.dig(x, y);
                }

                return;
            } else {
                self.stack.push((x, y));
            }
            let dir = directions[rand::random::<usize>() % directions.len()];
            // println!("dir {:?}", dir);
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
    pub fn player_move(&mut self, x: usize, y: usize, dir: Direction) -> (usize, usize) {
        let mut x = x as isize;
        let mut y = y as isize;
        if dir == Direction::Left {
            x -= 1;
        } else if dir == Direction::Right {
            x += 1;
        } else if dir == Direction::Up {
            y -= 1;
        } else if dir == Direction::Down {
            y += 1;
        }
        (x as usize, y as usize)
    }
    pub fn player(&mut self, x: usize, y: usize, dir: Direction) -> (usize, usize) {
        let (x, y) = self.player_move(x, y, dir);
        if self.get_tile(x, y) == TileType::Floor {
            (x, y)
        } else {
            (x, y)
        }
    }
    pub fn set_tile(&mut self, x: usize, y: usize, tile: TileType) {
        self.tile[y][x] = tile;
    }
    pub fn set_start(&mut self, x: usize, y: usize) {
        self.set_tile(x, y, TileType::Start);
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
