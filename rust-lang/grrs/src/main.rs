use clap::Parser;
use std::{fs::read_to_string, path::PathBuf};

#[derive(Parser)]
struct Cli {
    pattern: String,
    path: PathBuf,
}
fn main() {
    let args = Cli::parse();
    let contetnt = read_to_string(&args.path).expect("could not read file ");

    for line in contetnt.lines() {
        // println!("{}", line);
        if line.contains(&args.pattern) {
            println!("{}", line);
        }
    }
}
