use crate::dom::types::NodeType;
use crate::style::{AlignItems, Display, FlexDirection, JustifyContent, StyleNode};

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
    if node.computed.display == Display::None {
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
    let style = &node.computed;
    let margin = style.margin;
    let padding = style.padding;
    let border = style.border_width;

    let border_x = x + margin.left;
    let border_y = y + margin.top;

    let mut border_w = (width - margin.left - margin.right).max(0.0);
    if let Some(fixed_w) = style.width {
        border_w = border_w.min(fixed_w.max(0.0));
    }

    let content_x = border_x + border.left + padding.left;
    let content_w = (border_w - border.left - border.right - padding.left - padding.right).max(1.0);
    let content_y = border_y + border.top + padding.top;

    let auto_content_h = match style.display {
        Display::Inline => layout_inline_children(node, content_x, content_y, content_w, commands),
        Display::Flex => layout_flex_children(node, content_x, content_y, content_w, commands),
        _ => layout_block_children(node, content_x, content_y, content_w, commands),
    };

    let content_h = style.height.unwrap_or(auto_content_h).max(0.0);
    let border_h = border.top + padding.top + content_h + padding.bottom + border.bottom;

    if let Some(bg) = style.background_color {
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

    let border_draw = style.border_max();
    if border_draw > 0.0 {
        commands.push(DrawCommand::StrokeRect {
            rect: Rect {
                x: border_x,
                y: border_y,
                width: border_w,
                height: border_h,
            },
            color: style.border_color,
            width: border_draw,
        });
    }

    margin.top + border_h + margin.bottom
}

fn layout_block_children(node: &StyleNode, x: f32, y: f32, width: f32, commands: &mut Vec<DrawCommand>) -> f32 {
    if node.children.is_empty() {
        return node.computed.font_size_px * 0.8;
    }

    let mut cursor = y;
    for child in &node.children {
        cursor += layout_node(child, x, cursor, width, commands);
    }
    (cursor - y).max(0.0)
}

fn layout_inline_children(node: &StyleNode, x: f32, y: f32, width: f32, commands: &mut Vec<DrawCommand>) -> f32 {
    let mut combined = String::new();
    for child in &node.children {
        if let NodeType::Text(text) = &child.node.node_type {
            if !combined.is_empty() {
                combined.push(' ');
            }
            combined.push_str(text.trim());
        }
    }

    if combined.is_empty() {
        node.computed.font_size_px * 0.8
    } else {
        layout_text(&combined, node, x, y, width, commands)
    }
}

fn layout_flex_children(node: &StyleNode, x: f32, y: f32, width: f32, commands: &mut Vec<DrawCommand>) -> f32 {
    let children = node
        .children
        .iter()
        .filter(|child| child.computed.display != Display::None)
        .collect::<Vec<_>>();

    if children.is_empty() {
        return node.computed.font_size_px * 0.8;
    }

    match node.computed.flex_direction {
        FlexDirection::Row => layout_flex_row(node, &children, x, y, width, commands),
        FlexDirection::Column => layout_flex_column(node, &children, x, y, width, commands),
    }
}

fn layout_flex_row(
    container: &StyleNode,
    children: &[&StyleNode],
    x: f32,
    y: f32,
    width: f32,
    commands: &mut Vec<DrawCommand>,
) -> f32 {
    let mut widths = children
        .iter()
        .map(|child| {
            child
                .computed
                .width
                .unwrap_or((width / children.len() as f32).max(40.0))
                .max(1.0)
        })
        .collect::<Vec<_>>();

    let total_w: f32 = widths.iter().sum();
    if total_w > width {
        let scale = width / total_w;
        for w in &mut widths {
            *w *= scale;
        }
    }

    let total_w: f32 = widths.iter().sum();
    let free_w = (width - total_w).max(0.0);

    let (start_x, gap) = match container.computed.justify_content {
        JustifyContent::FlexStart => (x, 0.0),
        JustifyContent::Center => (x + free_w / 2.0, 0.0),
        JustifyContent::SpaceBetween if children.len() > 1 => (x, free_w / (children.len() - 1) as f32),
        _ => (x, 0.0),
    };

    let mut measured_h = Vec::with_capacity(children.len());
    for (idx, child) in children.iter().enumerate() {
        let h = measure_node(child, start_x + widths[..idx].iter().sum::<f32>() + gap * idx as f32, y, widths[idx]);
        measured_h.push(h);
    }
    let content_h = measured_h.into_iter().fold(0.0f32, f32::max);

    let mut cursor_x = start_x;
    for (idx, child) in children.iter().enumerate() {
        let measured = measure_node(child, cursor_x, y, widths[idx]);
        let child_y = match container.computed.align_items {
            AlignItems::FlexStart | AlignItems::Stretch => y,
            AlignItems::Center => y + (content_h - measured).max(0.0) / 2.0,
        };
        let _ = layout_node(child, cursor_x, child_y, widths[idx], commands);
        cursor_x += widths[idx] + gap;
    }

    content_h.max(container.computed.font_size_px * 0.8)
}

fn layout_flex_column(
    container: &StyleNode,
    children: &[&StyleNode],
    x: f32,
    y: f32,
    width: f32,
    commands: &mut Vec<DrawCommand>,
) -> f32 {
    let measured_h = children
        .iter()
        .map(|child| {
            let w = child.computed.width.unwrap_or(width).max(1.0).min(width);
            measure_node(child, x, y, w)
        })
        .collect::<Vec<_>>();

    let total_h: f32 = measured_h.iter().sum();
    let target_h = container.computed.height.unwrap_or(total_h).max(total_h);
    let free_h = (target_h - total_h).max(0.0);

    let (start_y, gap) = match container.computed.justify_content {
        JustifyContent::FlexStart => (y, 0.0),
        JustifyContent::Center => (y + free_h / 2.0, 0.0),
        JustifyContent::SpaceBetween if children.len() > 1 => (y, free_h / (children.len() - 1) as f32),
        _ => (y, 0.0),
    };

    let mut cursor_y = start_y;
    for (idx, child) in children.iter().enumerate() {
        let child_h = measured_h[idx];
        let mut child_w = child.computed.width.unwrap_or(width).max(1.0).min(width);
        if matches!(container.computed.align_items, AlignItems::Stretch) {
            child_w = width;
        }

        let child_x = match container.computed.align_items {
            AlignItems::FlexStart | AlignItems::Stretch => x,
            AlignItems::Center => x + (width - child_w).max(0.0) / 2.0,
        };

        let _ = layout_node(child, child_x, cursor_y, child_w, commands);
        cursor_y += child_h + gap;
    }

    target_h.max(cursor_y - y)
}

fn measure_node(node: &StyleNode, x: f32, y: f32, width: f32) -> f32 {
    let mut scratch = Vec::new();
    layout_node(node, x, y, width, &mut scratch)
}

fn layout_text(text: &str, node: &StyleNode, x: f32, y: f32, width: f32, commands: &mut Vec<DrawCommand>) -> f32 {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return 0.0;
    }

    let size = node.computed.font_size_px;
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
                color: node.computed.color,
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
            color: node.computed.color,
        });
        cursor_y += line_h;
    }

    cursor_y - y
}

#[cfg(test)]
mod tests {
    use super::{DrawCommand, build_layout};
    use crate::dom::types::DomNode;
    use crate::parse::cssparser_adapter::{CssParser, CssParserAdapter};
    use crate::style::style_tree;

    #[test]
    fn flex_row_produces_draw_commands() {
        let parser = CssParserAdapter;
        let css = parser
            .parse_stylesheet("div{display:flex;} p{width:120px;}")
            .expect("css parse should succeed");

        let p1 = DomNode::element("p".to_string(), Default::default(), vec![DomNode::text("a".to_string())]);
        let p2 = DomNode::element("p".to_string(), Default::default(), vec![DomNode::text("b".to_string())]);
        let root = DomNode::element("div".to_string(), Default::default(), vec![p1, p2]);

        let styled = style_tree(&root, &css);
        let layout = build_layout(&styled, 500.0);
        assert!(layout.commands.iter().any(|cmd| matches!(cmd, DrawCommand::Text { .. })));
    }
}
