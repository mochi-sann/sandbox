pub struct Mmu {
    rom: Vec<u8>,
    vram: [u8; 8192],
    wram: [u8; 8192],
    hram: [u8; 127],
}

impl Mmu {
    pub fn new() -> Self {
        Self {
            rom: Vec::new(),
            vram: [0; 8192],
            wram: [0; 8192],
            hram: [0; 127],
        }
    }

    pub fn load_rom(&mut self, rom: Vec<u8>) {
        self.rom = rom;
    }

    pub fn read(&self, addr: u16) -> u8 {
        match addr {
            0x0000..=0x7FFF => self.rom[addr as usize],
            0x8000..=0x9FFF => self.vram[(addr - 0x8000) as usize],
            0xC000..=0xDFFF => self.wram[(addr - 0xC000) as usize],
            0xE000..=0xFDFF => self.wram[(addr - 0xE000) as usize], // Echo RAM
            0xFF80..=0xFFFE => self.hram[(addr - 0xFF80) as usize],
            _ => {
                // For now, just return 0 for unhandled memory regions
                0
            }
        }
    }

    pub fn write(&mut self, addr: u16, value: u8) {
        match addr {
            0x8000..=0x9FFF => self.vram[(addr - 0x8000) as usize] = value,
            0xC000..=0xDFFF => self.wram[(addr - 0xC000) as usize] = value,
            0xE000..=0xFDFF => self.wram[(addr - 0xE000) as usize] = value, // Echo RAM
            0xFF80..=0xFFFE => self.hram[(addr - 0xFF80) as usize] = value,
            _ => {
                // For now, do nothing for unhandled memory regions
            }
        }
    }
}

