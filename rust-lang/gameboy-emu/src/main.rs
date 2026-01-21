use std::env;
use std::fs::File;
use std::io::Read;

use pixels::{Pixels, SurfaceTexture};
use winit::dpi::LogicalSize;
use winit::event::{Event, VirtualKeyCode};
use winit::event_loop::{ControlFlow, EventLoop};
use winit::window::WindowBuilder;
use winit_input_helper::WinitInputHelper;

mod bus;
mod cpu;
mod mmu;
mod ppu;

use bus::Bus;

const WIDTH: u32 = 160;
const HEIGHT: u32 = 144;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() != 2 {
        eprintln!("Usage: {} <path_to_rom>", args[0]);
        return;
    }

    let rom_path = &args[1];
    let mut file = match File::open(rom_path) {
        Ok(file) => file,
        Err(e) => {
            eprintln!("Failed to open ROM file: {}", e);
            return;
        }
    };

    let mut rom = Vec::new();
    if let Err(e) = file.read_to_end(&mut rom) {
        eprintln!("Failed to read ROM file: {}", e);
        return;
    }

    let mut bus = Bus::new();
    bus.mmu.load_rom(rom);

    let event_loop = EventLoop::new();
    let mut input = WinitInputHelper::new();
    let window = {
        let size = LogicalSize::new(WIDTH as f64, HEIGHT as f64);
        WindowBuilder::new()
            .with_title("Gameboy Emulator")
            .with_inner_size(size)
            .with_min_inner_size(size)
            .build(&event_loop)
            .unwrap()
    };

    let mut pixels = {
        let window_size = window.inner_size();
        let surface_texture = SurfaceTexture::new(window_size.width, window_size.height, &window);
        Pixels::new(WIDTH, HEIGHT, surface_texture).unwrap()
    };

    event_loop.run(move |event, _, control_flow| {
        if let Event::RedrawRequested(_) = event {
            pixels.render().unwrap();
        }

        if input.update(&event) {
            if input.key_pressed(VirtualKeyCode::Escape) || input.close_requested() {
                *control_flow = ControlFlow::Exit;
                return;
            }

            if let Some(size) = input.window_resized() {
                pixels.resize_surface(size.width, size.height).unwrap();
            }

            // Run the emulator until a frame is ready
            loop {
                bus.step();
                if bus.ppu.vblank {
                    bus.ppu.vblank = false;
                    break;
                }
            }
            
            let fb = &bus.ppu.framebuffer;
            pixels.frame_mut().copy_from_slice(fb);
            window.request_redraw();
        }
    });
}
