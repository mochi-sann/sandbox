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
    pub interrupts_enabled: bool,
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
            interrupts_enabled: false,
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

    fn or(&mut self, value: u8) {
        self.registers.a |= value;
        self.registers.set_z(self.registers.a == 0);
        self.registers.set_n(false);
        self.registers.set_h(false);
        self.registers.set_c(false);
    }

        fn cp(&mut self, value: u8) {
            let result = self.registers.a.wrapping_sub(value);
            self.registers.set_z(result == 0);
            self.registers.set_n(true);
            self.registers.set_h((self.registers.a & 0x0F) < (value & 0x0F));
            self.registers.set_c(self.registers.a < value);
        }
    
        fn and(&mut self, value: u8) {
            self.registers.a &= value;
            self.registers.set_z(self.registers.a == 0);
            self.registers.set_n(false);
            self.registers.set_h(true);
            self.registers.set_c(false);
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
                            0x02 => mmu.write(self.registers.get_bc(), self.registers.a),
                            0x03 => self.registers.set_bc(self.registers.get_bc().wrapping_add(1)),
                            0x04 => self.registers.b = self.inc(self.registers.b),
                            0x05 => self.registers.b = self.dec(self.registers.b),
                            0x06 => self.registers.b = self.read_next_byte(mmu),
                            0x09 => self.add_hl(self.registers.get_bc()),
                            0x0A => self.registers.a = mmu.read(self.registers.get_bc()),
                            0x0B => self.registers.set_bc(self.registers.get_bc().wrapping_sub(1)),
                            0x0C => self.registers.c = self.inc(self.registers.c),
                            0x0D => self.registers.c = self.dec(self.registers.c),
                            0x0E => self.registers.c = self.read_next_byte(mmu),
                            0x11 => {
                                let nn = self.read_next_word(mmu);
                                self.registers.set_de(nn);
                            }
                            0x12 => mmu.write(self.registers.get_de(), self.registers.a),
                            0x13 => self.registers.set_de(self.registers.get_de().wrapping_add(1)),
                            0x14 => self.registers.d = self.inc(self.registers.d),
                            0x15 => self.registers.d = self.dec(self.registers.d),
                            0x16 => self.registers.d = self.read_next_byte(mmu),
                            0x18 => {
                                let e = self.read_next_byte(mmu) as i8;
                                self.registers.pc = self.registers.pc.wrapping_add_signed(e as i16);
                            }
                            0x19 => self.add_hl(self.registers.get_de()),
                            0x1A => self.registers.a = mmu.read(self.registers.get_de()),
                            0x1B => self.registers.set_de(self.registers.get_de().wrapping_sub(1)),
                            0x1C => self.registers.e = self.inc(self.registers.e),
                            0x1D => self.registers.e = self.dec(self.registers.e),
                            0x1E => self.registers.e = self.read_next_byte(mmu),
                            0x20 => {
                                let e = self.read_next_byte(mmu) as i8;
                                if !self.registers.get_z() {
                                    self.registers.pc = self.registers.pc.wrapping_add_signed(e as i16);
                                }
                            }
            0x21 => {
                let nn = self.read_next_word(mmu);
                self.registers.set_hl(nn);
            }
            0x22 => {
                mmu.write(self.registers.get_hl(), self.registers.a);
                self.registers.set_hl(self.registers.get_hl().wrapping_add(1));
            }
            0x23 => self.registers.set_hl(self.registers.get_hl().wrapping_add(1)),
            0x24 => self.registers.h = self.inc(self.registers.h),
            0x25 => self.registers.h = self.dec(self.registers.h),
            0x26 => self.registers.h = self.read_next_byte(mmu),
            0x28 => {
                let e = self.read_next_byte(mmu) as i8;
                if self.registers.get_z() {
                    self.registers.pc = self.registers.pc.wrapping_add_signed(e as i16);
                }
            }
            0x29 => self.add_hl(self.registers.get_hl()),
            0x2A => {
                self.registers.a = mmu.read(self.registers.get_hl());
                self.registers.set_hl(self.registers.get_hl().wrapping_add(1));
            }
            0x2B => self.registers.set_hl(self.registers.get_hl().wrapping_sub(1)),
            0x2C => self.registers.l = self.inc(self.registers.l),
            0x2D => self.registers.l = self.dec(self.registers.l),
            0x2E => self.registers.l = self.read_next_byte(mmu),
            0x30 => {
                let e = self.read_next_byte(mmu) as i8;
                if !self.registers.get_c() {
                    self.registers.pc = self.registers.pc.wrapping_add_signed(e as i16);
                }
            }
            0x31 => {
                self.registers.sp = self.read_next_word(mmu);
            }
            0x32 => {
                mmu.write(self.registers.get_hl(), self.registers.a);
                self.registers.set_hl(self.registers.get_hl().wrapping_sub(1));
            }
            0x33 => self.registers.sp = self.registers.sp.wrapping_add(1),
            0x38 => {
                let e = self.read_next_byte(mmu) as i8;
                if self.registers.get_c() {
                    self.registers.pc = self.registers.pc.wrapping_add_signed(e as i16);
                }
            }
            0x39 => self.add_hl(self.registers.sp),
            0x3A => {
                self.registers.a = mmu.read(self.registers.get_hl());
                self.registers.set_hl(self.registers.get_hl().wrapping_sub(1));
            }
            0x3B => self.registers.sp = self.registers.sp.wrapping_sub(1),
            0x3C => self.registers.a = self.inc(self.registers.a),
            0x3D => self.registers.a = self.dec(self.registers.a),
            0x3E => self.registers.a = self.read_next_byte(mmu),

            // LD r, r'
            0x40 => self.registers.b = self.registers.b,
            0x41 => self.registers.b = self.registers.c,
            0x42 => self.registers.b = self.registers.d,
            0x43 => self.registers.b = self.registers.e,
            0x44 => self.registers.b = self.registers.h,
            0x45 => self.registers.b = self.registers.l,
            0x46 => self.registers.b = mmu.read(self.registers.get_hl()),
            0x47 => self.registers.b = self.registers.a,
            0x48 => self.registers.c = self.registers.b,
            0x49 => self.registers.c = self.registers.c,
            0x4A => self.registers.c = self.registers.d,
            0x4B => self.registers.c = self.registers.e,
            0x4C => self.registers.c = self.registers.h,
            0x4D => self.registers.c = self.registers.l,
            0x4E => self.registers.c = mmu.read(self.registers.get_hl()),
            0x4F => self.registers.c = self.registers.a,
            0x50 => self.registers.d = self.registers.b,
            0x51 => self.registers.d = self.registers.c,
            0x52 => self.registers.d = self.registers.d,
            0x53 => self.registers.d = self.registers.e,
            0x54 => self.registers.d = self.registers.h,
            0x55 => self.registers.d = self.registers.l,
            0x56 => self.registers.d = mmu.read(self.registers.get_hl()),
            0x57 => self.registers.d = self.registers.a,
            0x58 => self.registers.e = self.registers.b,
            0x59 => self.registers.e = self.registers.c,
            0x5A => self.registers.e = self.registers.d,
            0x5B => self.registers.e = self.registers.e,
            0x5C => self.registers.e = self.registers.h,
            0x5D => self.registers.e = self.registers.l,
            0x5E => self.registers.e = mmu.read(self.registers.get_hl()),
            0x5F => self.registers.e = self.registers.a,
            0x60 => self.registers.h = self.registers.b,
            0x61 => self.registers.h = self.registers.c,
            0x62 => self.registers.h = self.registers.d,
            0x63 => self.registers.h = self.registers.e,
            0x64 => self.registers.h = self.registers.h,
            0x65 => self.registers.h = self.registers.l,
            0x66 => self.registers.h = mmu.read(self.registers.get_hl()),
            0x67 => self.registers.h = self.registers.a,
            0x68 => self.registers.l = self.registers.b,
            0x69 => self.registers.l = self.registers.c,
            0x6A => self.registers.l = self.registers.d,
            0x6B => self.registers.l = self.registers.e,
            0x6C => self.registers.l = self.registers.h,
            0x6D => self.registers.l = self.registers.l,
            0x6E => self.registers.l = mmu.read(self.registers.get_hl()),
            0x6F => self.registers.l = self.registers.a,
            0x70 => mmu.write(self.registers.get_hl(), self.registers.b),
            0x71 => mmu.write(self.registers.get_hl(), self.registers.c),
            0x72 => mmu.write(self.registers.get_hl(), self.registers.d),
            0x73 => mmu.write(self.registers.get_hl(), self.registers.e),
            // 0x76 is HALT
            0x77 => mmu.write(self.registers.get_hl(), self.registers.a),
            0x78 => self.registers.a = self.registers.b,
            0x79 => self.registers.a = self.registers.c,
            0x7A => self.registers.a = self.registers.d,
            0x7B => self.registers.a = self.registers.e,
            0x7C => self.registers.a = self.registers.h,
            0x7D => self.registers.a = self.registers.l,
            0x7E => self.registers.a = mmu.read(self.registers.get_hl()),
            0x7F => self.registers.a = self.registers.a,

            0xA0 => self.and(self.registers.b),
            0xA1 => self.and(self.registers.c),
            0xA2 => self.and(self.registers.d),
            0xA3 => self.and(self.registers.e),
            0xA4 => self.and(self.registers.h),
            0xA5 => self.and(self.registers.l),
            0xA6 => {
                let value = mmu.read(self.registers.get_hl());
                self.and(value);
            }
            0xA7 => self.and(self.registers.a),

            0xB0 => self.or(self.registers.b),
            0xB1 => self.or(self.registers.c),
            0xB2 => self.or(self.registers.d),
            0xB3 => self.or(self.registers.e),
            0xB4 => self.or(self.registers.h),
            0xB5 => self.or(self.registers.l),
            0xB6 => {
                let value = mmu.read(self.registers.get_hl());
                self.or(value);
            }
            0xB7 => self.or(self.registers.a),
            0xB8 => self.cp(self.registers.b),
            0xB9 => self.cp(self.registers.c),
            0xBA => self.cp(self.registers.d),
            0xBB => self.cp(self.registers.e),
            0xBC => self.cp(self.registers.h),
            0xBD => self.cp(self.registers.l),
            0xBE => {
                let value = mmu.read(self.registers.get_hl());
                self.cp(value);
            }
            0xBF => self.cp(self.registers.a),

            0xC1 => {
                self.registers.c = mmu.read(self.registers.sp);
                self.registers.sp = self.registers.sp.wrapping_add(1);
                self.registers.b = mmu.read(self.registers.sp);
                self.registers.sp = self.registers.sp.wrapping_add(1);
            }
                        0xC3 => {
                            let nn = self.read_next_word(mmu);
                            self.registers.pc = nn;
                        }
                        0xC4 => {
                            let nn = self.read_next_word(mmu);
                            if !self.registers.get_z() {
                                self.registers.sp = self.registers.sp.wrapping_sub(1);
                                mmu.write(self.registers.sp, (self.registers.pc >> 8) as u8);
                                self.registers.sp = self.registers.sp.wrapping_sub(1);
                                mmu.write(self.registers.sp, (self.registers.pc & 0xFF) as u8);
                                self.registers.pc = nn;
                            }
                        }
                        0xC5 => {
                            self.registers.sp = self.registers.sp.wrapping_sub(1);
                            mmu.write(self.registers.sp, self.registers.b);
                            self.registers.sp = self.registers.sp.wrapping_sub(1);
                            mmu.write(self.registers.sp, self.registers.c);
                        }
                        0xC9 => {
                            let low = mmu.read(self.registers.sp) as u16;
                            self.registers.sp = self.registers.sp.wrapping_add(1);
                            let high = mmu.read(self.registers.sp) as u16;
                            self.registers.sp = self.registers.sp.wrapping_add(1);
                            self.registers.pc = (high << 8) | low;
                        }
                        0xCC => {
                            let nn = self.read_next_word(mmu);
                            if self.registers.get_z() {
                                self.registers.sp = self.registers.sp.wrapping_sub(1);
                                mmu.write(self.registers.sp, (self.registers.pc >> 8) as u8);
                                self.registers.sp = self.registers.sp.wrapping_sub(1);
                                mmu.write(self.registers.sp, (self.registers.pc & 0xFF) as u8);
                                self.registers.pc = nn;
                            }
                        }
                        0xCD => {
                            let nn = self.read_next_word(mmu);
                            self.registers.sp = self.registers.sp.wrapping_sub(1);
                            mmu.write(self.registers.sp, (self.registers.pc >> 8) as u8);
                            self.registers.sp = self.registers.sp.wrapping_sub(1);
                            mmu.write(self.registers.sp, (self.registers.pc & 0xFF) as u8);
                            self.registers.pc = nn;
                        }
                        0xD1 => {
                            self.registers.e = mmu.read(self.registers.sp);
                            self.registers.sp = self.registers.sp.wrapping_add(1);
                            self.registers.d = mmu.read(self.registers.sp);
                            self.registers.sp = self.registers.sp.wrapping_add(1);
                        }
                        0xD4 => {
                            let nn = self.read_next_word(mmu);
                            if !self.registers.get_c() {
                                self.registers.sp = self.registers.sp.wrapping_sub(1);
                                mmu.write(self.registers.sp, (self.registers.pc >> 8) as u8);
                                self.registers.sp = self.registers.sp.wrapping_sub(1);
                                mmu.write(self.registers.sp, (self.registers.pc & 0xFF) as u8);
                                self.registers.pc = nn;
                            }
                        }
                        0xD5 => {
                            self.registers.sp = self.registers.sp.wrapping_sub(1);
                            mmu.write(self.registers.sp, self.registers.d);
                            self.registers.sp = self.registers.sp.wrapping_sub(1);
                            mmu.write(self.registers.sp, self.registers.e);
                        }
                        0xDC => {
                            let nn = self.read_next_word(mmu);
                            if self.registers.get_c() {
                                self.registers.sp = self.registers.sp.wrapping_sub(1);
                                mmu.write(self.registers.sp, (self.registers.pc >> 8) as u8);
                                self.registers.sp = self.registers.sp.wrapping_sub(1);
                                mmu.write(self.registers.sp, (self.registers.pc & 0xFF) as u8);
                                self.registers.pc = nn;
                            }
                        }
                        0xE0 => {
                            let n = self.read_next_byte(mmu) as u16;
                            mmu.write(0xFF00 + n, self.registers.a);
                        }
            
            0xE1 => {
                self.registers.l = mmu.read(self.registers.sp);
                self.registers.sp = self.registers.sp.wrapping_add(1);
                self.registers.h = mmu.read(self.registers.sp);
                self.registers.sp = self.registers.sp.wrapping_add(1);
            }
            0xE5 => {
                self.registers.sp = self.registers.sp.wrapping_sub(1);
                mmu.write(self.registers.sp, self.registers.h);
                self.registers.sp = self.registers.sp.wrapping_sub(1);
                mmu.write(self.registers.sp, self.registers.l);
            }
            0xE6 => {
                let value = self.read_next_byte(mmu);
                self.and(value);
            }
            0xEA => {
                let nn = self.read_next_word(mmu);
                mmu.write(nn, self.registers.a);
            }
            0xF0 => {
                let n = self.read_next_byte(mmu) as u16;
                self.registers.a = mmu.read(0xFF00 + n);
            }
            0xF1 => {
                self.registers.f = mmu.read(self.registers.sp) & 0xF0;
                self.registers.sp = self.registers.sp.wrapping_add(1);
                self.registers.a = mmu.read(self.registers.sp);
                self.registers.sp = self.registers.sp.wrapping_add(1);
            }
            0xF3 => self.interrupts_enabled = false,
            0xF5 => {
                self.registers.sp = self.registers.sp.wrapping_sub(1);
                mmu.write(self.registers.sp, self.registers.a);
                self.registers.sp = self.registers.sp.wrapping_sub(1);
                mmu.write(self.registers.sp, self.registers.f);
            }
            0xF6 => {
                let value = self.read_next_byte(mmu);
                self.or(value);
            }
            0xFB => self.interrupts_enabled = true,
            0xFA => {
                let nn = self.read_next_word(mmu);
                self.registers.a = mmu.read(nn);
            }
            0xFE => {
                let value = self.read_next_byte(mmu);
                self.cp(value);
            }

            _ => panic!("Unknown opcode: {:#04x}", opcode),
        }
    }
}

