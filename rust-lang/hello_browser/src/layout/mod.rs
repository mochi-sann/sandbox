use crate::dom::types::NodeType;
use crate::style::StyleNode;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}

impl Color {
    pub const BLACK: Self = Self::new(20, 20, 24, 255);
    pub const WHITE: Self = Self::new(250, 250, 250, 255);
    pub const GRAY: Self = Self::new(160, 160, 170, 255);

    pub const fn new(r: u8, g: u8, b: u8, a: u8) -> Self {
        Self { r, g, b, a }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Clone)]
pub enum DrawCommand {
    FillRect { rect: Rect, color: Color },
    StrokeRect { rect: Rect, color: Color, width: f32 },
    Text {
        x: f32,
        y: f32,
        text: String,
        size_px: f32,
        color: Color,
    },
}

#[derive(Debug, Clone, Default)]
pub struct LayoutTree {
    pub commands: Vec<DrawCommand>,
    pub content_height: f32,
}

pub fn build_layout(root: &StyleNode, viewport_width: f32) -> LayoutTree {
    let mut commands = Vec::new();
    let used = layout_node(root, 0.0, 0.0, viewport_width.max(1.0), &mut commands);
    LayoutTree {
        commands,
        content_height: used.max(0.0),
    }
}

fn layout_node(node: &StyleNode, x: f32, y: f32, width: f32, commands: &mut Vec<DrawCommand>) -> f32 {
    if node.display_none() {
        return 0.0;
    }

    match &node.node.node_type {
        NodeType::Text(text) => layout_text(text, node, x, y, width, commands),
        NodeType::Document => {
            let mut cursor = y;
            for child in &node.children {
                cursor += layout_node(child, x, cursor, width, commands);
            }
            cursor - y
        }
        NodeType::Element(_) => layout_element(node, x, y, width, commands),
    }
}

fn layout_element(node: &StyleNode, x: f32, y: f32, width: f32, commands: &mut Vec<DrawCommand>) -> f32 {
    let margin = node.spacing_px("margin");
    let padding = node.spacing_px("padding");
    let border = node.spacing_px("border-width");

    let border_x = x + margin;
    let border_y = y + margin;
    let border_w = (width - margin * 2.0).max(0.0);

    let content_x = border_x + border;
    let content_w = (border_w - border * 2.0).max(0.0);

    let mut cursor = border_y + border + padding;
    let text_mode = matches!(
        node.value("display"),
        Some(v) if v.eq_ignore_ascii_case("inline")
    );

    if text_mode {
        let mut combined = String::new();
        for child in &node.children {
            if let NodeType::Text(text) = &child.node.node_type {
                if !combined.is_empty() {
                    combined.push(' ');
                }
                combined.push_str(text.trim());
            }
        }
        cursor += layout_text(&combined, node, content_x + padding, cursor, content_w, commands);
    } else {
        for child in &node.children {
            cursor += layout_node(child, content_x + padding, cursor, (content_w - padding * 2.0).max(0.0), commands);
        }
    }

    if node.children.is_empty() {
        cursor += node.font_size_px() * 0.6;
    }

    let border_h = (cursor - border_y + border + padding).max(0.0);

    if let Some(bg) = node.background_color() {
        commands.push(DrawCommand::FillRect {
            rect: Rect {
                x: border_x,
                y: border_y,
                width: border_w,
                height: border_h,
            },
            color: bg,
        });
    }

    if border > 0.0 {
        commands.push(DrawCommand::StrokeRect {
            rect: Rect {
                x: border_x,
                y: border_y,
                width: border_w,
                height: border_h,
            },
            color: node.border_color(),
            width: border,
        });
    }

    border_h + margin
}

fn layout_text(text: &str, node: &StyleNode, x: f32, y: f32, width: f32, commands: &mut Vec<DrawCommand>) -> f32 {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return 0.0;
    }

    let size = node.font_size_px();
    let line_h = (size * 1.3).max(10.0);
    let char_w = (size * 0.6).max(4.0);
    let max_chars = ((width / char_w).floor() as usize).max(1);

    let mut line = String::new();
    let mut cursor_y = y;

    for word in trimmed.split_whitespace() {
        let next_len = if line.is_empty() {
            word.chars().count()
        } else {
            line.chars().count() + 1 + word.chars().count()
        };

        if next_len > max_chars && !line.is_empty() {
            commands.push(DrawCommand::Text {
                x,
                y: cursor_y,
                text: line.clone(),
                size_px: size,
                color: node.color(),
            });
            line.clear();
            cursor_y += line_h;
        }

        if !line.is_empty() {
            line.push(' ');
        }
        line.push_str(word);
    }

    if !line.is_empty() {
        commands.push(DrawCommand::Text {
            x,
            y: cursor_y,
            text: line,
            size_px: size,
            color: node.color(),
        });
        cursor_y += line_h;
    }

    cursor_y - y
}
