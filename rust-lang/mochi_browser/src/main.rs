use html5ever::parse_document;
use html5ever::tendril::TendrilSink;
use markup5ever_rcdom::{NodeData, RcDom, SerializableHandle};

fn print_dom(handle: &SerializableHandle, indent: usize) {
    let node = handle;
    let indent_str = " ".repeat(indent);

    match node.data {
        NodeData::Element { ref name, .. } => {
            println!("{}Element: {}", indent_str, name.local);
        }
        NodeData::Text { ref contents } => {
            let text = contents.borrow();
            if !text.trim().is_empty() {
                println!("{}Text: '{}'", indent_str, text.trim());
            }
        }
        _ => {}
    }

    for child in node.children.borrow().iter() {
        print_dom(child, indent + 2);
    }
}

fn main() {
    println!("Hello, world!");
    let html = r#"
    <!DOCTYPE html>
    <html>
        <head><title>Test</title></head>
        <body>
            <h1>Hello World</h1>
            <p>This is a paragraph.</p>
        </body>
    </html>
    "#;

    let dom = parse_document(RcDom::default(), Default::default())
        .from_utf8()
        .read_from(&mut html.as_bytes())
        .unwrap();
    println!("Parsed DOM successfully!");
}
