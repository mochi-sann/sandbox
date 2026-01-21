use crate::cpu::Cpu;
use crate::mmu::Mmu;
use crate::ppu::Ppu;

pub struct Bus {
    pub cpu: Cpu,
    pub mmu: Mmu,
    pub ppu: Ppu,
}

impl Bus {
    pub fn new() -> Self {
        Self {
            cpu: Cpu::new(),
            mmu: Mmu::new(),
            ppu: Ppu::new(),
        }
    }

    pub fn step(&mut self) {
        // TODO: Implement a single step of the emulator
        self.cpu.step(&mut self.mmu);
        self.ppu.step(4, &self.mmu);
    }
}
