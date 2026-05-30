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
use winit::dpi::PhysicalPosition;
use winit::event::{ElementState, MouseButton, WindowEvent};
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::keyboard::{Key, NamedKey};
use winit::window::{Window, WindowId};

use browser_net::Url;
use browser_paint::{paint_address_bar, pixmap_to_u32, Canvas};

/// Height of the address-bar toolbar (browser chrome) drawn above the page, in
/// physical pixels.
const TOOLBAR_H: u32 = 40;

pub mod nav;

pub use nav::{
    collect_links, hit_test, hit_test_links, render, url_from_input, BrowserState, LinkArea,
    LoadError, Page, DEFAULT_UA_CSS,
};

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
    let event_loop = build_event_loop().map_err(backend_hint)?;
    event_loop.set_control_flow(ControlFlow::Wait);

    let mut app = App::new(canvas);
    event_loop.run_app(&mut app).map_err(backend_hint)?;
    Ok(())
}

/// Prints a troubleshooting hint for the common display-backend failure — an X11
/// "Broken pipe" caused by a `DISPLAY` pointing at an unreachable X server —
/// before propagating `err`.
fn backend_hint(err: impl Into<Box<dyn Error>>) -> Box<dyn Error> {
    eprintln!(
        "hint: a 'Broken pipe' / display error usually means DISPLAY points at an \
         unreachable X server. Try `WINIT_UNIX_BACKEND=wayland ...` or `DISPLAY=:0 ...`."
    );
    err.into()
}

/// Builds the winit event loop, preferring the Wayland backend when one is
/// available.
///
/// winit otherwise selects X11 whenever `DISPLAY` is set. Under WSLg (and some
/// remote setups) `DISPLAY` can point at an unreachable X server, so the X11
/// backend fails with a "Broken pipe" error even though a working Wayland
/// compositor is present. When a Wayland display is available and the user has
/// not explicitly forced a backend via `WINIT_UNIX_BACKEND`, we therefore ask
/// winit to use Wayland. On pure-X11 sessions no Wayland socket exists, so winit
/// keeps its default X11 behavior.
fn build_event_loop() -> Result<EventLoop<()>, Box<dyn Error>> {
    let mut builder = EventLoop::builder();

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        use winit::platform::wayland::EventLoopBuilderExtWayland;

        let backend_forced = std::env::var_os("WINIT_UNIX_BACKEND").is_some();
        if wayland_available() && !backend_forced {
            builder.with_wayland();
        }
    }

    Ok(builder.build()?)
}

/// Whether a Wayland display is available, ensuring `WAYLAND_DISPLAY` is set when
/// so.
///
/// Returns `true` when `WAYLAND_DISPLAY` is already set, or — for environments
/// (notably WSLg) whose interactive shell does not export it — when the default
/// `wayland-0` compositor socket exists under `XDG_RUNTIME_DIR`. In that latter
/// case it also sets `WAYLAND_DISPLAY=wayland-0`, because `wayland-client` will
/// not connect without the variable even when the socket is present. This runs
/// on the main thread before the event loop starts (no other threads yet), so
/// the process-global env mutation is safe.
#[cfg(all(unix, not(target_os = "macos")))]
fn wayland_available() -> bool {
    use std::path::{Path, PathBuf};

    if std::env::var_os("WAYLAND_DISPLAY").is_some_and(|v| !v.is_empty()) {
        return true;
    }

    // Look for a compositor socket. `wayland-client` accepts an absolute path in
    // `WAYLAND_DISPLAY`, so once we find one we point straight at it regardless of
    // `XDG_RUNTIME_DIR`.
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Some(dir) = std::env::var_os("XDG_RUNTIME_DIR") {
        candidates.push(Path::new(&dir).join("wayland-0"));
    }
    // WSLg's well-known socket, for shells that export neither WAYLAND_DISPLAY
    // nor a usable XDG_RUNTIME_DIR.
    candidates.push(PathBuf::from("/mnt/wslg/runtime-dir/wayland-0"));

    for sock in candidates {
        if sock.exists() {
            std::env::set_var("WAYLAND_DISPLAY", &sock);
            return true;
        }
    }
    false
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

/// Opens a navigable browser window starting at `start`, blocking until the
/// window is closed.
///
/// This is the interactive entry point (as opposed to [`run`], which just shows
/// a static [`Canvas`]). It loads `start` through the full pipeline, displays the
/// painted page, and re-navigates when the user clicks a hyperlink. Supported
/// input:
///
/// - left mouse click on an `<a href>` follows that link (relative hrefs are
///   resolved against the current page URL);
/// - <kbd>Backspace</kbd> / <kbd>Alt+Left</kbd> goes back in history;
/// - mouse wheel scrolls the document vertically;
/// - <kbd>Esc</kbd> or the close button quits.
///
/// Must be called from the main thread of a process with display-server access;
/// never invoked from tests.
pub fn run_browser(start: Url, width: u32, height: u32) -> Result<(), Box<dyn Error>> {
    let event_loop = build_event_loop().map_err(backend_hint)?;
    event_loop.set_control_flow(ControlFlow::Wait);

    let mut app = NavApp::new(start, width, height);
    event_loop.run_app(&mut app).map_err(backend_hint)?;
    Ok(())
}

/// State for the interactive browser window: the session, the current rendered
/// page, the window/surface, and transient input state (cursor + scroll).
struct NavApp {
    /// Navigation session (current URL + history).
    state: BrowserState,
    /// The URL to load once the window is first shown.
    pending: Option<Url>,
    /// The page currently displayed (painted pixmap + link map), if loaded.
    page: Option<Page>,
    /// Viewport width in CSS px (also the layout width).
    width: u32,
    /// Viewport height in CSS px.
    height: u32,
    /// Vertical scroll offset in document px (0 = top).
    scroll_y: f32,
    /// The editable address-bar text (the URL shown in the toolbar).
    address: String,
    /// Whether the address bar has keyboard focus (is being edited).
    editing: bool,
    /// Last known cursor position, in physical window pixels.
    cursor: PhysicalPosition<f64>,
    /// The window, created on `resumed`.
    window: Option<Rc<Window>>,
    /// The softbuffer surface bound to the window.
    surface: Option<softbuffer::Surface<Rc<Window>, Rc<Window>>>,
}

impl NavApp {
    fn new(start: Url, width: u32, height: u32) -> NavApp {
        NavApp {
            address: start.as_str().to_string(),
            state: BrowserState::new(),
            pending: Some(start),
            page: None,
            width,
            height,
            scroll_y: 0.0,
            editing: false,
            cursor: PhysicalPosition::new(0.0, 0.0),
            window: None,
            surface: None,
        }
    }

    /// Requests a repaint of the window, if one exists.
    fn request_redraw(&self) {
        if let Some(window) = &self.window {
            window.request_redraw();
        }
    }

    /// Navigates to whatever the user has typed into the address bar. The input
    /// is resolved the same way a clicked link is: an absolute URL goes there
    /// directly, anything else is resolved against the current page.
    fn commit_address(&mut self) {
        let input = self.address.trim().to_string();
        if input.is_empty() {
            return;
        }
        match self.state.resolve_target(&input) {
            Ok(url) => {
                self.editing = false;
                self.navigate(url);
            }
            Err(e) => eprintln!("error: invalid address '{input}': {e}"),
        }
    }

    /// Abandons an in-progress edit, restoring the address bar to the current
    /// page's URL.
    fn cancel_editing(&mut self) {
        self.editing = false;
        if let Some(url) = &self.state.current_url {
            self.address = url.as_str().to_string();
        }
        self.request_redraw();
    }

    /// Loads `url` into the current page, logging any error (so a bad link does
    /// not crash the window). Resets the scroll position on success.
    fn navigate(&mut self, url: Url) {
        match self.state.load(url, self.width, self.height) {
            Ok(page) => {
                println!("Loaded {}", page.url);
                self.scroll_y = 0.0;
                // Reflect the loaded URL in the address bar (unless the user is
                // mid-edit) and clear any stale editing state.
                if !self.editing {
                    self.address = page.url.as_str().to_string();
                }
                self.page = Some(page);
                self.request_redraw();
            }
            Err(e) => eprintln!("error: failed to load page: {e}"),
        }
    }

    /// Handles a left-button click at the current cursor position.
    ///
    /// A click inside the toolbar focuses the address bar for editing; a click
    /// below it is mapped to document coordinates (accounting for the toolbar
    /// offset and scroll) and, if it hits a link, resolves and navigates to it.
    fn handle_click(&mut self) {
        let cy = self.cursor.y as f32;

        // Click in the toolbar: focus the address bar.
        if cy < TOOLBAR_H as f32 {
            self.editing = true;
            self.request_redraw();
            return;
        }

        // Click in the page area: leave edit mode and hit-test links.
        if self.editing {
            self.cancel_editing();
        }
        let doc_x = self.cursor.x as f32;
        let doc_y = (cy - TOOLBAR_H as f32) + self.scroll_y;

        let href = self
            .page
            .as_ref()
            .and_then(|p| hit_test_links(&p.links, doc_x, doc_y).map(str::to_string));

        if let Some(href) = href {
            match self.state.resolve_target(&href) {
                Ok(url) => {
                    println!("Following link {href} -> {url}");
                    self.navigate(url);
                }
                Err(e) => eprintln!("error: cannot resolve link '{href}': {e}"),
            }
        }
    }

    /// Goes back one entry in history (re-loading the previous page), if any.
    fn go_back(&mut self) {
        // `back` makes the previous URL current; clear `current_url` first so the
        // subsequent `load` records history correctly (it pushes the displaced
        // current). We pop, then load the popped URL fresh.
        if let Some(prev) = self.state.back() {
            // `back` already set current_url to `prev`; take it out so load's
            // history bookkeeping does not re-push it.
            self.state.current_url = None;
            self.navigate(prev);
        }
    }

    /// Scrolls vertically by `delta` document px, clamping to the document.
    fn scroll_by(&mut self, delta: f32) {
        let max = self
            .page
            .as_ref()
            .map(|p| (p.doc_height - self.height as f32).max(0.0))
            .unwrap_or(0.0);
        self.scroll_y = (self.scroll_y + delta).clamp(0.0, max);
        if let Some(window) = &self.window {
            window.request_redraw();
        }
    }

    /// Blits the current page's pixmap into the window surface, offset by the
    /// scroll position, clearing the rest to white.
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

        buffer.fill(0x00FF_FFFF);

        let win_w = win_w.get() as usize;
        let win_h = win_h.get() as usize;
        let toolbar_h = (TOOLBAR_H as usize).min(win_h);

        // 1. Page content, blitted into the area below the toolbar (offset by the
        //    toolbar height and the scroll position).
        if let Some(page) = &self.page {
            let pm_w = page.pixmap.width() as usize;
            let pm_h = page.pixmap.height() as usize;
            let pixels = pixmap_to_u32(&page.pixmap);
            let scroll = self.scroll_y.max(0.0) as usize;
            let copy_w = win_w.min(pm_w);

            for y in toolbar_h..win_h {
                let src_y = (y - toolbar_h) + scroll;
                if src_y >= pm_h {
                    break;
                }
                let src_row = src_y * pm_w;
                let dst_row = y * win_w;
                buffer[dst_row..dst_row + copy_w]
                    .copy_from_slice(&pixels[src_row..src_row + copy_w]);
            }
        }

        // 2. Address-bar toolbar, fixed at the top (drawn last so it overlays).
        if toolbar_h > 0 {
            let bar = paint_address_bar(win_w, toolbar_h, &self.address, self.editing);
            let bar_px = pixmap_to_u32(&bar);
            let bar_w = bar.width() as usize;
            let copy_w = win_w.min(bar_w);
            for y in 0..toolbar_h {
                let src_row = y * bar_w;
                let dst_row = y * win_w;
                buffer[dst_row..dst_row + copy_w]
                    .copy_from_slice(&bar_px[src_row..src_row + copy_w]);
            }
        }

        if let Err(e) = buffer.present() {
            eprintln!("error: failed to present buffer: {e}");
        }
    }
}

impl ApplicationHandler for NavApp {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.window.is_some() {
            return;
        }

        let attributes = Window::default_attributes()
            .with_title("browser")
            .with_inner_size(winit::dpi::LogicalSize::new(
                self.width as f64,
                // Add the toolbar height so the page keeps its requested
                // viewport size below the address bar.
                (self.height + TOOLBAR_H) as f64,
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

        // Load the initial page now that we have a window to redraw.
        if let Some(url) = self.pending.take() {
            self.navigate(url);
        }
    }

    fn window_event(
        &mut self,
        event_loop: &ActiveEventLoop,
        _window_id: WindowId,
        event: WindowEvent,
    ) {
        match event {
            WindowEvent::CloseRequested => event_loop.exit(),
            WindowEvent::KeyboardInput { event, .. } if event.state.is_pressed() => {
                if self.editing {
                    // Address-bar editing mode.
                    match &event.logical_key {
                        Key::Named(NamedKey::Escape) => self.cancel_editing(),
                        Key::Named(NamedKey::Enter) => self.commit_address(),
                        Key::Named(NamedKey::Backspace) => {
                            self.address.pop();
                            self.request_redraw();
                        }
                        _ => {
                            // Insert any printable text the key produced.
                            if let Some(text) = &event.text {
                                let before = self.address.len();
                                self.address
                                    .extend(text.chars().filter(|c| !c.is_control()));
                                if self.address.len() != before {
                                    self.request_redraw();
                                }
                            }
                        }
                    }
                } else {
                    // Page navigation mode.
                    match event.logical_key {
                        Key::Named(NamedKey::Escape) => event_loop.exit(),
                        Key::Named(NamedKey::Backspace) | Key::Named(NamedKey::BrowserBack) => {
                            self.go_back();
                        }
                        _ => {}
                    }
                }
            }
            WindowEvent::CursorMoved { position, .. } => {
                self.cursor = position;
            }
            WindowEvent::MouseInput {
                state: ElementState::Pressed,
                button: MouseButton::Left,
                ..
            } => {
                self.handle_click();
            }
            WindowEvent::MouseWheel { delta, .. } => {
                use winit::event::MouseScrollDelta;
                let dy = match delta {
                    // One wheel notch scrolls a few lines.
                    MouseScrollDelta::LineDelta(_, y) => -y * 40.0,
                    MouseScrollDelta::PixelDelta(p) => -(p.y as f32),
                };
                self.scroll_by(dy);
            }
            WindowEvent::RedrawRequested => {
                self.redraw();
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use browser_css::Color;

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
