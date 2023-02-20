use clap::Parser;
use std::{fs::read_to_string, path::PathBuf};

#[derive(Parser)]
struct Cli {
    pattern: String,
    path: PathBuf,
}
fn main() {
    let args = Cli::parse();
    // let file_result = read_to_string(&args.path);
    let contetnt = match read_to_string(&args.path) {
        Ok(content) => content,
        Err(error) => panic!("ファイルは存在しません: {:?} : {:?}", &args.path, error),
    };

    for line in contetnt.lines() {
        // println!("{}", line);
        if line.contains(&args.pattern) {
            println!("{}", line);
        }
    }
}
