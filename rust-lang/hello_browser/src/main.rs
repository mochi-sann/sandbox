mod browser;
mod dom;
mod error;
mod layout;
mod net;
mod parse;
mod render;
mod style;
mod ui;

use std::num::NonZeroU32;

use browser::Browser;
use render::tiny_skia_renderer::{Renderer, TinySkiaRenderer};
use softbuffer::{Context, Surface};
use tracing::error;
use ui::chrome::{ChromeAction, ChromeState, CHROME_HEIGHT};
use winit::dpi::LogicalSize;
use winit::event::{ElementState, Event, Ime, MouseButton, MouseScrollDelta, WindowEvent};
use winit::event_loop::{ControlFlow, EventLoopBuilder};
use winit::keyboard::{Key, NamedKey};
use winit::window::WindowBuilder;

fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().with_target(false).init();

    let mut event_loop_builder = EventLoopBuilder::new();
    #[cfg(target_os = "linux")]
    {
        use winit::platform::x11::EventLoopBuilderExtX11;

        // softbuffer + Wayland の不安定ケース回避のため、明示指定がなければ X11 を優先する。
        if std::env::var("HELLO_BROWSER_BACKEND")
            .map(|v| v.eq_ignore_ascii_case("x11"))
            .unwrap_or(true)
        {
            event_loop_builder.with_x11();
        }
    }
    let event_loop = event_loop_builder.build()?;
    event_loop.set_control_flow(ControlFlow::Wait);
    let window = WindowBuilder::new()
        .with_title("hello_browser")
        .with_inner_size(LogicalSize::new(1024.0, 768.0))
        .build(&event_loop)?;

    let context = Context::new(&window).map_err(|err| anyhow::anyhow!(err.to_string()))?;
    let mut surface =
        Surface::new(&context, &window).map_err(|err| anyhow::anyhow!(err.to_string()))?;

    let mut browser = Browser::new()?;
    let mut renderer = TinySkiaRenderer::new();
    let mut chrome = ChromeState::new();

    let initial = std::env::args().nth(1).unwrap_or_else(|| "https://example.com/".to_string());
    let size = window.inner_size();
    browser.navigate(&initial, size.width as f32);
    chrome.sync_url(&browser.current_url_string());
    window.request_redraw();

    let mut mouse_pos = (0.0f32, 0.0f32);

    event_loop.run(|event, elwt| match event {
        Event::WindowEvent { event, .. } => match event {
            WindowEvent::CloseRequested => elwt.exit(),
            WindowEvent::Resized(new_size) => {
                if let (Some(w), Some(h)) = (
                    NonZeroU32::new(new_size.width.max(1)),
                    NonZeroU32::new(new_size.height.max(1)),
                ) {
                    if let Err(err) = surface.resize(w, h) {
                        error!("surface resize failed: {err}");
                        elwt.exit();
                    }
                }
                browser.relayout(new_size.width as f32);
                window.request_redraw();
            }
            WindowEvent::CursorMoved { position, .. } => {
                mouse_pos = (position.x as f32, position.y as f32);
            }
            WindowEvent::MouseInput {
                state: ElementState::Pressed,
                button: MouseButton::Left,
                ..
            } => {
                if let Some(action) = chrome.on_mouse_down(mouse_pos.0, mouse_pos.1, window.inner_size().width as f32) {
                    apply_action(action, &mut browser, &mut chrome, window.inner_size().width as f32);
                    window.request_redraw();
                }
            }
            WindowEvent::MouseWheel { delta, .. } => {
                let scroll = match delta {
                    MouseScrollDelta::LineDelta(_, y) => -y * 32.0,
                    MouseScrollDelta::PixelDelta(pos) => -pos.y as f32,
                };
                let viewport_h = (window.inner_size().height as f32 - CHROME_HEIGHT).max(1.0);
                browser.scroll_by(scroll, viewport_h);
                window.request_redraw();
            }
            WindowEvent::Ime(Ime::Commit(text)) => {
                chrome.on_text(&text);
                window.request_redraw();
            }
            WindowEvent::KeyboardInput { event, .. } if event.state == ElementState::Pressed => {
                match event.logical_key {
                    Key::Named(NamedKey::Enter) => {
                        if let Some(action) = chrome.on_enter() {
                            apply_action(action, &mut browser, &mut chrome, window.inner_size().width as f32);
                        }
                    }
                    Key::Named(NamedKey::Backspace) => chrome.on_backspace(),
                    _ => {}
                }
                window.request_redraw();
            }
            WindowEvent::RedrawRequested => {
                let size = window.inner_size();
                let frame = renderer.render(
                    &browser.state.layout,
                    &chrome,
                    size.width.max(1),
                    size.height.max(1),
                    browser.state.scroll_y,
                );

                if let (Some(w), Some(h)) = (NonZeroU32::new(frame.width), NonZeroU32::new(frame.height)) {
                    if let Err(err) = surface.resize(w, h) {
                        error!("surface resize failed before present: {err}");
                        elwt.exit();
                        return;
                    }
                }

                match surface.buffer_mut() {
                    Ok(mut buffer) => {
                        if buffer.len() == frame.pixels.len() {
                            buffer.copy_from_slice(&frame.pixels);
                        }
                        if let Err(err) = buffer.present() {
                            error!("present failed: {err}");
                            elwt.exit();
                        }
                    }
                    Err(err) => {
                        error!("buffer acquire failed: {err}");
                        elwt.exit();
                    }
                }
            }
            _ => {}
        },
        _ => {}
    })?;

    Ok(())
}

fn apply_action(action: ChromeAction, browser: &mut Browser, chrome: &mut ChromeState, width: f32) {
    match action {
        ChromeAction::Navigate(url) => browser.navigate(&url, width),
        ChromeAction::Back => browser.back(width),
        ChromeAction::Forward => browser.forward(width),
        ChromeAction::Reload => browser.reload(width),
    }
    chrome.sync_url(&browser.current_url_string());
}
