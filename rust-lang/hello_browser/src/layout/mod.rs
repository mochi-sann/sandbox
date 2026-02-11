use crate::dom::types::NodeType;
use crate::style::{AlignItems, Display, FlexDirection, FlexWrap, JustifyContent, StyleNode};

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

#[derive(Debug, Clone, Copy)]
struct FlexItem {
    basis: f32,
    grow: f32,
    shrink: f32,
}

#[derive(Debug, Clone)]
struct FlexLine {
    indices: Vec<usize>,
    sizes: Vec<f32>,
    main_sum: f32,
}

fn build_flex_items(children: &[&StyleNode], available_main: f32) -> Vec<FlexItem> {
    let fallback_basis = (available_main / children.len().max(1) as f32).max(40.0);
    children
        .iter()
        .map(|child| FlexItem {
            basis: child
                .computed
                .flex_basis
                .or(child.computed.width)
                .unwrap_or(fallback_basis)
                .max(1.0),
            grow: child.computed.flex_grow.max(0.0),
            shrink: child.computed.flex_shrink.max(0.0),
        })
        .collect()
}

fn build_row_lines(items: &[FlexItem], available_width: f32, wrap: FlexWrap) -> Vec<FlexLine> {
    let mut lines = Vec::new();
    let mut current = FlexLine {
        indices: Vec::new(),
        sizes: Vec::new(),
        main_sum: 0.0,
    };

    for (idx, item) in items.iter().enumerate() {
        let would_overflow = !current.indices.is_empty() && current.main_sum + item.basis > available_width;
        if wrap == FlexWrap::Wrap && would_overflow {
            lines.push(current);
            current = FlexLine {
                indices: Vec::new(),
                sizes: Vec::new(),
                main_sum: 0.0,
            };
        }
        current.indices.push(idx);
        current.sizes.push(item.basis);
        current.main_sum += item.basis;
    }

    if !current.indices.is_empty() {
        lines.push(current);
    }

    if lines.is_empty() {
        lines.push(FlexLine {
            indices: vec![0],
            sizes: vec![available_width.max(1.0)],
            main_sum: available_width.max(1.0),
        });
    }

    lines
}

fn build_column_lines(items: &[FlexItem], available_height: f32, wrap: FlexWrap) -> Vec<FlexLine> {
    let mut lines = Vec::new();
    let mut current = FlexLine {
        indices: Vec::new(),
        sizes: Vec::new(),
        main_sum: 0.0,
    };

    for (idx, item) in items.iter().enumerate() {
        let would_overflow = !current.indices.is_empty() && current.main_sum + item.basis > available_height;
        if wrap == FlexWrap::Wrap && would_overflow {
            lines.push(current);
            current = FlexLine {
                indices: Vec::new(),
                sizes: Vec::new(),
                main_sum: 0.0,
            };
        }
        current.indices.push(idx);
        current.sizes.push(item.basis);
        current.main_sum += item.basis;
    }

    if !current.indices.is_empty() {
        lines.push(current);
    }

    if lines.is_empty() {
        lines.push(FlexLine {
            indices: vec![0],
            sizes: vec![available_height.max(1.0)],
            main_sum: available_height.max(1.0),
        });
    }

    lines
}

fn distribute_main_sizes(line: &mut FlexLine, items: &[FlexItem], available_main: f32) {
    let mut sum: f32 = line.sizes.iter().sum();
    if available_main > sum {
        let extra = available_main - sum;
        let total_grow: f32 = line.indices.iter().map(|idx| items[*idx].grow).sum();
        if total_grow > 0.0 {
            for (i, idx) in line.indices.iter().enumerate() {
                let share = extra * (items[*idx].grow / total_grow);
                line.sizes[i] += share;
            }
        }
    } else if sum > available_main {
        let deficit = sum - available_main;
        let weighted_total: f32 = line
            .indices
            .iter()
            .enumerate()
            .map(|(i, idx)| items[*idx].shrink * line.sizes[i])
            .sum();
        if weighted_total > 0.0 {
            for (i, idx) in line.indices.iter().enumerate() {
                let weight = items[*idx].shrink * line.sizes[i];
                let reduce = deficit * (weight / weighted_total);
                line.sizes[i] = (line.sizes[i] - reduce).max(1.0);
            }
        } else {
            let scale = available_main / sum;
            for size in &mut line.sizes {
                *size = (*size * scale).max(1.0);
            }
        }
    }

    sum = line.sizes.iter().sum();
    line.main_sum = sum;
}

fn layout_flex_row(
    container: &StyleNode,
    children: &[&StyleNode],
    x: f32,
    y: f32,
    width: f32,
    commands: &mut Vec<DrawCommand>,
) -> f32 {
    let items = build_flex_items(children, width);
    let mut lines = build_row_lines(&items, width, container.computed.flex_wrap);
    for line in &mut lines {
        distribute_main_sizes(line, &items, width);
    }

    let mut cursor_y = y;
    for line in lines {
        let free_w = (width - line.main_sum).max(0.0);
        let (start_x, gap) = match container.computed.justify_content {
            JustifyContent::FlexStart => (x, 0.0),
            JustifyContent::Center => (x + free_w / 2.0, 0.0),
            JustifyContent::SpaceBetween if line.indices.len() > 1 => {
                (x, free_w / (line.indices.len() - 1) as f32)
            }
            _ => (x, 0.0),
        };

        let mut measured_h = Vec::with_capacity(line.indices.len());
        let mut measure_x = start_x;
        for (pos, idx) in line.indices.iter().enumerate() {
            let w = line.sizes[pos];
            measured_h.push(measure_node(children[*idx], measure_x, cursor_y, w));
            measure_x += w + gap;
        }
        let line_h = measured_h.into_iter().fold(0.0f32, f32::max);

        let mut draw_x = start_x;
        for (pos, idx) in line.indices.iter().enumerate() {
            let w = line.sizes[pos];
            let measured = measure_node(children[*idx], draw_x, cursor_y, w);
            let child_y = match container.computed.align_items {
                AlignItems::FlexStart | AlignItems::Stretch => cursor_y,
                AlignItems::Center => cursor_y + (line_h - measured).max(0.0) / 2.0,
            };
            let _ = layout_node(children[*idx], draw_x, child_y, w, commands);
            draw_x += w + gap;
        }
        cursor_y += line_h;
    }

    (cursor_y - y).max(container.computed.font_size_px * 0.8)
}

fn layout_flex_column(
    container: &StyleNode,
    children: &[&StyleNode],
    x: f32,
    y: f32,
    width: f32,
    commands: &mut Vec<DrawCommand>,
) -> f32 {
    let target_h = container.computed.height.unwrap_or(f32::INFINITY);
    let items = build_flex_items(children, target_h.min(10_000.0));
    let mut lines = build_column_lines(&items, target_h, container.computed.flex_wrap);
    for line in &mut lines {
        let available_main = if target_h.is_finite() {
            target_h
        } else {
            line.main_sum
        };
        distribute_main_sizes(line, &items, available_main);
    }
    let used_main = lines
        .iter()
        .map(|line| line.main_sum)
        .fold(0.0f32, f32::max);

    let mut cursor_x = x;
    let mut max_used_x = x;
    for line in lines {
        let free_h = (target_h - line.main_sum).max(0.0);
        let (start_y, gap) = match container.computed.justify_content {
            JustifyContent::FlexStart => (y, 0.0),
            JustifyContent::Center => (y + free_h / 2.0, 0.0),
            JustifyContent::SpaceBetween if line.indices.len() > 1 => {
                (y, free_h / (line.indices.len() - 1) as f32)
            }
            _ => (y, 0.0),
        };

        let mut max_col_w = 0.0f32;
        let mut draw_y = start_y;
        for (pos, idx) in line.indices.iter().enumerate() {
            let item_h = line.sizes[pos];
            let mut child_w = children[*idx]
                .computed
                .width
                .or(children[*idx].computed.flex_basis)
                .unwrap_or(width)
                .max(1.0)
                .min(width);
            if matches!(container.computed.align_items, AlignItems::Stretch) {
                child_w = width;
            }
            max_col_w = max_col_w.max(child_w);
            let child_x = match container.computed.align_items {
                AlignItems::FlexStart | AlignItems::Stretch => cursor_x,
                AlignItems::Center => cursor_x + (width - child_w).max(0.0) / 2.0,
            };
            let _ = layout_node(children[*idx], child_x, draw_y, child_w, commands);
            draw_y += item_h + gap;
        }
        cursor_x += max_col_w;
        max_used_x = max_used_x.max(cursor_x);
    }

    if max_used_x <= x {
        container.computed.font_size_px * 0.8
    } else {
        used_main.max(container.computed.font_size_px * 0.8)
    }
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

    #[test]
    fn flex_grow_distributes_extra_width() {
        let parser = CssParserAdapter;
        let css = parser
            .parse_stylesheet(
                "div{display:flex;} .a{flex-basis:100px;flex-grow:1;} .b{flex-basis:100px;flex-grow:3;}",
            )
            .expect("css parse should succeed");

        let p1 = DomNode::element(
            "p".to_string(),
            [("class".to_string(), "a".to_string())].into_iter().collect(),
            vec![DomNode::text("first".to_string())],
        );
        let p2 = DomNode::element(
            "p".to_string(),
            [("class".to_string(), "b".to_string())].into_iter().collect(),
            vec![DomNode::text("second".to_string())],
        );
        let root = DomNode::element("div".to_string(), Default::default(), vec![p1, p2]);

        let styled = style_tree(&root, &css);
        let layout = build_layout(&styled, 600.0);
        let (x1, x2) = text_x_positions(&layout);
        assert!(x2 - x1 > 180.0);
    }

    #[test]
    fn flex_wrap_moves_items_to_next_line() {
        let parser = CssParserAdapter;
        let css = parser
            .parse_stylesheet("div{display:flex;flex-wrap:wrap;} p{flex-basis:180px;}")
            .expect("css parse should succeed");

        let p1 = DomNode::element("p".to_string(), Default::default(), vec![DomNode::text("one".to_string())]);
        let p2 = DomNode::element("p".to_string(), Default::default(), vec![DomNode::text("two".to_string())]);
        let p3 = DomNode::element("p".to_string(), Default::default(), vec![DomNode::text("three".to_string())]);
        let root = DomNode::element("div".to_string(), Default::default(), vec![p1, p2, p3]);

        let styled = style_tree(&root, &css);
        let layout = build_layout(&styled, 320.0);
        let ys = text_y_positions(&layout);
        assert!(ys[2] > ys[1]);
    }

    fn text_x_positions(layout: &super::LayoutTree) -> (f32, f32) {
        let mut xs = Vec::new();
        for cmd in &layout.commands {
            if let DrawCommand::Text { x, .. } = cmd {
                xs.push(*x);
            }
        }
        xs.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        (xs[0], xs[xs.len() - 1])
    }

    fn text_y_positions(layout: &super::LayoutTree) -> Vec<f32> {
        let mut ys = Vec::new();
        for cmd in &layout.commands {
            if let DrawCommand::Text { y, .. } = cmd {
                ys.push(*y);
            }
        }
        ys.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        ys
    }
}
