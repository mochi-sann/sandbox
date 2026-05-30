//! Native window display of a rendered [`Canvas`].
//!
//! In addition to writing a PNG, the engine can show its rasterized output in a
//! native window. This module uses [`winit`] (0.30 `ApplicationHandler` API) to
//! create the window and run the event loop, and [`softbuffer`] (0.4) to push a
//! CPU-side pixel buffer to that window.
//!
//! The pixel conversion is split out into [`canvas_to_buffer`] so it can be unit
//! tested without ever opening a window (opening a window would block / require a
//! display server and is therefore never done in tests).
//!
//! softbuffer expects each pixel as a `u32` in `0x00RRGGBB` order (the top byte
//! is ignored). The [`Canvas`] stores `Color { r, g, b, a }`; the alpha channel
//! is dropped because the canvas is already fully composited and opaque.

use std::error::Error;
use std::num::NonZeroU32;
use std::rc::Rc;

use winit::application::ApplicationHandler;
use winit::event::WindowEvent;
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::keyboard::{Key, NamedKey};
use winit::window::{Window, WindowId};

use crate::painting::Canvas;

/// Converts a [`Canvas`] into a softbuffer-compatible `u32` pixel buffer.
///
/// Each output pixel packs the canvas color as `0x00RRGGBB`, which is the layout
/// softbuffer reads (the high byte is ignored). The alpha channel is discarded:
/// the canvas is already composited onto an opaque background.
///
/// The returned vector has exactly `canvas.width * canvas.height` elements, in
/// the same row-major order as [`Canvas::pixels`].
pub fn canvas_to_buffer(canvas: &Canvas) -> Vec<u32> {
    canvas
        .pixels
        .iter()
        .map(|c| {
            let r = c.r as u32;
            let g = c.g as u32;
            let b = c.b as u32;
            (r << 16) | (g << 8) | b
        })
        .collect()
}

/// Opens a native window and displays `canvas`, blocking until the window is
/// closed (close button or the <kbd>Esc</kbd> key).
///
/// This runs a winit event loop and therefore must only be called from the main
/// thread of a process that has access to a display server. It is never invoked
/// from tests.
pub fn run(canvas: Canvas) -> Result<(), Box<dyn Error>> {
    let event_loop = build_event_loop()?;
    event_loop.set_control_flow(ControlFlow::Wait);

    let mut app = App::new(canvas);
    event_loop.run_app(&mut app)?;
    Ok(())
}

/// Builds the winit event loop, preferring the Wayland backend when one is
/// available.
///
/// winit otherwise selects X11 whenever `DISPLAY` is set. Under WSLg (and some
/// remote setups) `DISPLAY` can point at an unreachable X server, so the X11
/// backend fails with a "Broken pipe" error even though a working Wayland
/// compositor is present. When `WAYLAND_DISPLAY` is set and the user has not
/// explicitly forced a backend via `WINIT_UNIX_BACKEND`, we therefore ask winit
/// to use Wayland. On pure-X11 sessions `WAYLAND_DISPLAY` is unset, so winit
/// keeps its default X11 behavior.
fn build_event_loop() -> Result<EventLoop<()>, Box<dyn Error>> {
    let mut builder = EventLoop::builder();

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        use winit::platform::wayland::EventLoopBuilderExtWayland;

        let backend_forced = std::env::var_os("WINIT_UNIX_BACKEND").is_some();
        let wayland_available = std::env::var_os("WAYLAND_DISPLAY").is_some_and(|v| !v.is_empty());
        if wayland_available && !backend_forced {
            builder.with_wayland();
        }
    }

    Ok(builder.build()?)
}

/// winit application state. The window and softbuffer surface are created lazily
/// in [`ApplicationHandler::resumed`], as required by the 0.30 API.
struct App {
    /// The rendered canvas to display.
    canvas: Canvas,
    /// Pre-converted softbuffer pixel buffer (computed once).
    buffer: Vec<u32>,
    /// The window, created on `resumed`.
    window: Option<Rc<Window>>,
    /// The softbuffer surface bound to the window.
    surface: Option<softbuffer::Surface<Rc<Window>, Rc<Window>>>,
}

impl App {
    fn new(canvas: Canvas) -> App {
        let buffer = canvas_to_buffer(&canvas);
        App {
            canvas,
            buffer,
            window: None,
            surface: None,
        }
    }
}

impl ApplicationHandler for App {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.window.is_some() {
            return;
        }

        let attributes = Window::default_attributes()
            .with_title("browser")
            .with_inner_size(winit::dpi::LogicalSize::new(
                self.canvas.width as f64,
                self.canvas.height as f64,
            ));

        let window = match event_loop.create_window(attributes) {
            Ok(w) => Rc::new(w),
            Err(e) => {
                eprintln!("error: failed to create window: {e}");
                event_loop.exit();
                return;
            }
        };

        let context = match softbuffer::Context::new(window.clone()) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("error: failed to create softbuffer context: {e}");
                event_loop.exit();
                return;
            }
        };
        let surface = match softbuffer::Surface::new(&context, window.clone()) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("error: failed to create softbuffer surface: {e}");
                event_loop.exit();
                return;
            }
        };

        self.window = Some(window);
        self.surface = Some(surface);
    }

    fn window_event(
        &mut self,
        event_loop: &ActiveEventLoop,
        _window_id: WindowId,
        event: WindowEvent,
    ) {
        match event {
            WindowEvent::CloseRequested => event_loop.exit(),
            WindowEvent::KeyboardInput { event, .. }
                if event.state.is_pressed()
                    && event.logical_key == Key::Named(NamedKey::Escape) =>
            {
                event_loop.exit();
            }
            WindowEvent::RedrawRequested => {
                self.redraw();
            }
            _ => {}
        }
    }
}

impl App {
    /// Resizes the surface to the window and blits the canvas pixels.
    ///
    /// The softbuffer surface must match the window size, but our pixel buffer is
    /// fixed at the canvas size. We copy row-by-row, clipping to whichever extent
    /// is smaller so the canvas is shown top-left without scaling.
    fn redraw(&mut self) {
        let (Some(window), Some(surface)) = (self.window.as_ref(), self.surface.as_mut()) else {
            return;
        };

        let size = window.inner_size();
        let (Some(win_w), Some(win_h)) =
            (NonZeroU32::new(size.width), NonZeroU32::new(size.height))
        else {
            return;
        };

        if let Err(e) = surface.resize(win_w, win_h) {
            eprintln!("error: failed to resize surface: {e}");
            return;
        }

        let mut buffer = match surface.buffer_mut() {
            Ok(b) => b,
            Err(e) => {
                eprintln!("error: failed to acquire surface buffer: {e}");
                return;
            }
        };

        let win_w = win_w.get() as usize;
        let win_h = win_h.get() as usize;
        let copy_w = win_w.min(self.canvas.width);
        let copy_h = win_h.min(self.canvas.height);

        // Clear to white, then copy the canvas region into the top-left.
        buffer.fill(0x00FF_FFFF);
        for y in 0..copy_h {
            let src_row = y * self.canvas.width;
            let dst_row = y * win_w;
            buffer[dst_row..dst_row + copy_w]
                .copy_from_slice(&self.buffer[src_row..src_row + copy_w]);
        }

        if let Err(e) = buffer.present() {
            eprintln!("error: failed to present buffer: {e}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::css::Color;

    fn canvas_from(colors: Vec<Color>, width: usize, height: usize) -> Canvas {
        Canvas {
            pixels: colors,
            width,
            height,
        }
    }

    #[test]
    fn buffer_has_one_u32_per_pixel() {
        let canvas = canvas_from(
            vec![
                Color {
                    r: 0,
                    g: 0,
                    b: 0,
                    a: 255,
                };
                6
            ],
            3,
            2,
        );
        let buffer = canvas_to_buffer(&canvas);
        assert_eq!(buffer.len(), 6);
    }

    #[test]
    fn colors_pack_as_0x00rrggbb_dropping_alpha() {
        let canvas = canvas_from(
            vec![
                Color {
                    r: 0x12,
                    g: 0x34,
                    b: 0x56,
                    a: 0x00, // alpha must be ignored
                },
                Color {
                    r: 255,
                    g: 255,
                    b: 255,
                    a: 255,
                },
                Color {
                    r: 0,
                    g: 0,
                    b: 0,
                    a: 255,
                },
            ],
            3,
            1,
        );
        let buffer = canvas_to_buffer(&canvas);
        assert_eq!(buffer[0], 0x0012_3456);
        assert_eq!(buffer[1], 0x00FF_FFFF);
        assert_eq!(buffer[2], 0x0000_0000);
    }
}
