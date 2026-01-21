use crate::mmu::Mmu;

enum PpuMode {
    OamScan,  // Mode 2
    Drawing,  // Mode 3
    HBlank,   // Mode 0
    VBlank,   // Mode 1
}

pub struct Ppu {
    mode: PpuMode,
    line_cycles: u16,
    line: u8,
    pub framebuffer: Vec<u8>,
    pub vblank: bool,
}

impl Ppu {
    const OAM_SCAN_CYCLES: u16 = 80;
    const DRAWING_CYCLES: u16 = 172;
    const HBLANK_CYCLES: u16 = 204;
    const CYCLES_PER_LINE: u16 = 456;
    const VBLANK_LINES: u8 = 10;
    const SCREEN_WIDTH: u8 = 160;
    const SCREEN_HEIGHT: u8 = 144;
    const TOTAL_LINES: u8 = Self::SCREEN_HEIGHT + Self::VBLANK_LINES;

    pub fn new() -> Self {
        Self {
            mode: PpuMode::OamScan,
            line_cycles: 0,
            line: 0,
            framebuffer: vec![0; (Self::SCREEN_WIDTH as usize) * (Self::SCREEN_HEIGHT as usize) * 4],
            vblank: false,
        }
    }

    fn render_scanline(&mut self, mmu: &Mmu) {
        let y = self.line;
        let tile_map_base = 0x9800; // For now, use the first tile map

        for x in 0..Self::SCREEN_WIDTH {
            let tile_x = (x / 8) as u16;
            let tile_y = (y / 8) as u16;
            let tile_map_index = tile_y * 32 + tile_x;
            let tile_index = mmu.read(tile_map_base + tile_map_index) as u16;

            let tile_data_base = 0x8000;
            let tile_address = tile_data_base + tile_index * 16;

            let line_in_tile = (y % 8) as u16;
            let byte1 = mmu.read(tile_address + line_in_tile * 2);
            let byte2 = mmu.read(tile_address + line_in_tile * 2 + 1);

            let bit_index = 7 - (x % 8);
            let bit1 = (byte1 >> bit_index) & 1;
            let bit2 = (byte2 >> bit_index) & 1;
            let color_index = (bit2 << 1) | bit1;

            let color = match color_index {
                0 => [255, 255, 255, 255], // White
                1 => [192, 192, 192, 255], // Light Gray
                2 => [96, 96, 96, 255],    // Dark Gray
                3 => [0, 0, 0, 255],       // Black
                _ => unreachable!(),
            };

            let fb_index = (y as usize) * (Self::SCREEN_WIDTH as usize) * 4 + (x as usize) * 4;
            self.framebuffer[fb_index..fb_index + 4].copy_from_slice(&color);
        }
    }

    pub fn step(&mut self, cycles: u8, mmu: &Mmu) {
        self.line_cycles += cycles as u16;

        match self.mode {
            PpuMode::OamScan => {
                if self.line_cycles >= Self::OAM_SCAN_CYCLES {
                    self.line_cycles -= Self::OAM_SCAN_CYCLES;
                    self.mode = PpuMode::Drawing;
                }
            }
            PpuMode::Drawing => {
                if self.line_cycles >= Self::DRAWING_CYCLES {
                    self.line_cycles -= Self::DRAWING_CYCLES;
                    self.mode = PpuMode::HBlank;
                    self.render_scanline(mmu);
                }
            }
            PpuMode::HBlank => {
                if self.line_cycles >= Self::HBLANK_CYCLES {
                    self.line_cycles -= Self::HBLANK_CYCLES;
                    self.line += 1;

                    if self.line == Self::SCREEN_HEIGHT {
                        self.mode = PpuMode::VBlank;
                        self.vblank = true;
                        // TODO: Trigger VBlank interrupt
                    } else {
                        self.mode = PpuMode::OamScan;
                    }
                }
            }
            PpuMode::VBlank => {
                if self.line_cycles >= Self::CYCLES_PER_LINE {
                    self.line_cycles -= Self::CYCLES_PER_LINE;
                    self.line += 1;

                    if self.line == Self::TOTAL_LINES {
                        self.line = 0;
                        self.mode = PpuMode::OamScan;
                    }
                }
            }
        }
    }
}

