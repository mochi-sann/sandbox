use crate::mmu::Mmu;

pub struct Registers {
    pub a: u8,
    pub f: u8,
    pub b: u8,
    pub c: u8,
    pub d: u8,
    pub e: u8,
    pub h: u8,
    pub l: u8,
    pub pc: u16,
    pub sp: u16,
}

pub struct Cpu {
    pub registers: Registers,
}

impl Registers {
    pub fn new() -> Self {
        Self {
            a: 0,
            f: 0,
            b: 0,
            c: 0,
            d: 0,
            e: 0,
            h: 0,
            l: 0,
            pc: 0,
            sp: 0,
        }
    }

    pub fn get_af(&self) -> u16 {
        (self.a as u16) << 8 | self.f as u16
    }

    pub fn set_af(&mut self, value: u16) {
        self.a = (value >> 8) as u8;
        self.f = (value & 0x00F0) as u8;
    }

    pub fn get_bc(&self) -> u16 {
        (self.b as u16) << 8 | self.c as u16
    }

    pub fn set_bc(&mut self, value: u16) {
        self.b = (value >> 8) as u8;
        self.c = (value & 0x00FF) as u8;
    }

    pub fn get_de(&self) -> u16 {
        (self.d as u16) << 8 | self.e as u16
    }

    pub fn set_de(&mut self, value: u16) {
        self.d = (value >> 8) as u8;
        self.e = (value & 0x00FF) as u8;
    }

    pub fn get_hl(&self) -> u16 {
        (self.h as u16) << 8 | self.l as u16
    }

    pub fn set_hl(&mut self, value: u16) {
        self.h = (value >> 8) as u8;
        self.l = (value & 0x00FF) as u8;
    }

    pub fn get_z(&self) -> bool {
        (self.f & 0b1000_0000) != 0
    }

    pub fn set_z(&mut self, value: bool) {
        if value {
            self.f |= 0b1000_0000;
        } else {
            self.f &= 0b0111_1111;
        }
    }

    pub fn get_n(&self) -> bool {
        (self.f & 0b0100_0000) != 0
    }

    pub fn set_n(&mut self, value: bool) {
        if value {
            self.f |= 0b0100_0000;
        } else {
            self.f &= 0b1011_1111;
        }
    }

    pub fn get_h(&self) -> bool {
        (self.f & 0b0010_0000) != 0
    }

    pub fn set_h(&mut self, value: bool) {
        if value {
            self.f |= 0b0010_0000;
        } else {
            self.f &= 0b1101_1111;
        }
    }

    pub fn get_c(&self) -> bool {
        (self.f & 0b0001_0000) != 0
    }

    pub fn set_c(&mut self, value: bool) {
        if value {
            self.f |= 0b0001_0000;
        } else {
            self.f &= 0b1110_1111;
        }
    }
}

impl Cpu {
    pub fn new() -> Self {
        Self {
            registers: Registers::new(),
        }
    }

    fn read_next_byte(&mut self, mmu: &mut Mmu) -> u8 {
        let byte = mmu.read(self.registers.pc);
        self.registers.pc = self.registers.pc.wrapping_add(1);
        byte
    }

    fn read_next_word(&mut self, mmu: &mut Mmu) -> u16 {
        let low = self.read_next_byte(mmu) as u16;
        let high = self.read_next_byte(mmu) as u16;
        (high << 8) | low
    }

    fn inc(&mut self, value: u8) -> u8 {
        let result = value.wrapping_add(1);
        self.registers.set_z(result == 0);
        self.registers.set_n(false);
        self.registers.set_h((value & 0x0F) + 1 > 0x0F);
        result
    }

    fn dec(&mut self, value: u8) -> u8 {
        let result = value.wrapping_sub(1);
        self.registers.set_z(result == 0);
        self.registers.set_n(true);
        self.registers.set_h((value & 0x0F) == 0);
        result
    }

    fn add_hl(&mut self, value: u16) {
        let hl = self.registers.get_hl();
        let result = hl.wrapping_add(value);
        self.registers.set_n(false);
        self.registers.set_h((hl & 0x0FFF) + (value & 0x0FFF) > 0x0FFF);
        self.registers.set_c(result < hl);
        self.registers.set_hl(result);
    }

    pub fn step(&mut self, mmu: &mut Mmu) {
        // 1. Fetch instruction
        let opcode = mmu.read(self.registers.pc);
        self.registers.pc = self.registers.pc.wrapping_add(1);

        // 2. Decode and execute instruction
        match opcode {
            0x00 => { /* NOP */ }
            0x01 => {
                let nn = self.read_next_word(mmu);
                self.registers.set_bc(nn);
            }
            0x04 => self.registers.b = self.inc(self.registers.b),
            0x05 => self.registers.b = self.dec(self.registers.b),
            0x06 => self.registers.b = self.read_next_byte(mmu),
            0x09 => self.add_hl(self.registers.get_bc()),
            0x0C => self.registers.c = self.inc(self.registers.c),
            0x0D => self.registers.c = self.dec(self.registers.c),
            0x0E => self.registers.c = self.read_next_byte(mmu),
            0x11 => {
                let nn = self.read_next_word(mmu);
                self.registers.set_de(nn);
            }
            0x14 => self.registers.d = self.inc(self.registers.d),
            0x15 => self.registers.d = self.dec(self.registers.d),
            0x16 => self.registers.d = self.read_next_byte(mmu),
            0x19 => self.add_hl(self.registers.get_de()),
            0x1C => self.registers.e = self.inc(self.registers.e),
            0x1D => self.registers.e = self.dec(self.registers.e),
            0x1E => self.registers.e = self.read_next_byte(mmu),
            0x21 => {
                let nn = self.read_next_word(mmu);
                self.registers.set_hl(nn);
            }
            0x24 => self.registers.h = self.inc(self.registers.h),
            0x25 => self.registers.h = self.dec(self.registers.h),
            0x26 => self.registers.h = self.read_next_byte(mmu),
            0x29 => self.add_hl(self.registers.get_hl()),
            0x2C => self.registers.l = self.inc(self.registers.l),
            0x2D => self.registers.l = self.dec(self.registers.l),
            0x2E => self.registers.l = self.read_next_byte(mmu),
            0x31 => {
                self.registers.sp = self.read_next_word(mmu);
            }
            0x39 => self.add_hl(self.registers.sp),
            0x3C => self.registers.a = self.inc(self.registers.a),
            0x3D => self.registers.a = self.dec(self.registers.a),

            0x46 => self.registers.b = mmu.read(self.registers.get_hl()),
            0x4E => self.registers.c = mmu.read(self.registers.get_hl()),
            0x56 => self.registers.d = mmu.read(self.registers.get_hl()),
            0x5E => self.registers.e = mmu.read(self.registers.get_hl()),
            0x66 => self.registers.h = mmu.read(self.registers.get_hl()),
            0x6E => self.registers.l = mmu.read(self.registers.get_hl()),
            0x70 => mmu.write(self.registers.get_hl(), self.registers.b),
            0x71 => mmu.write(self.registers.get_hl(), self.registers.c),
            0x72 => mmu.write(self.registers.get_hl(), self.registers.d),
            0x73 => mmu.write(self.registers.get_hl(), self.registers.e),
            0x74 => mmu.write(self.registers.get_hl(), self.registers.h),
            0x75 => mmu.write(self.registers.get_hl(), self.registers.l),
            0x77 => mmu.write(self.registers.get_hl(), self.registers.a),
            0x7E => self.registers.a = mmu.read(self.registers.get_hl()),

            0xC3 => {
                let nn = self.read_next_word(mmu);
                self.registers.pc = nn;
            }
            0xC9 => {
                let low = mmu.read(self.registers.sp) as u16;
                self.registers.sp = self.registers.sp.wrapping_add(1);
                let high = mmu.read(self.registers.sp) as u16;
                self.registers.sp = self.registers.sp.wrapping_add(1);
                self.registers.pc = (high << 8) | low;
            }

            _ => panic!("Unknown opcode: {:#04x}", opcode),
        }
    }
}

