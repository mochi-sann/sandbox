# Gemini Code Assistant Context

This file provides context for the Gemini code assistant to understand the project and provide more relevant and accurate assistance.

## Project Overview

This project is a Gameboy emulator written in Rust. It aims to emulate the original Gameboy hardware, including the CPU, PPU, and memory architecture.

The project is structured into several modules:
- `cpu`: The Gameboy's Sharp LR35902 CPU.
- `mmu`: The Memory Management Unit, which handles the memory map.
- `ppu`: The Picture Processing Unit, which handles rendering graphics.
- `bus`: The bus that connects all the components.

The emulator uses the `pixels` and `winit` crates for creating a window and rendering the framebuffer.

## Building and Running

To build and run the emulator, use the following command:

```bash
cargo run -- <path_to_rom>
```

Replace `<path_to_rom>` with the path to a Gameboy ROM file.

## Development Conventions

The project follows standard Rust conventions. Code is formatted with `rustfmt`.

The development process is iterative:
1. Run the emulator with a test ROM.
2. Identify the first unimplemented opcode that causes a panic.
3. Implement the opcode in `src/cpu.rs`.
4. Repeat.
