// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!(
        "hello world !!!!!!!!!!!!!!!!!, {}! You've been greeted from Rust!",
        name
    )
}
#[tauri::command]
fn get_file_list(get_dir_path: String) -> Vec<String> {
    let mut file_list: Vec<String> = Vec::new();
    let paths = fs::read_dir(get_dir_path).unwrap();
    for path in paths {
        let path = path.unwrap().path();
        let file_name = path.file_name().unwrap().to_str().unwrap().to_string();
        println!("{}", file_name);
        file_list.push(file_name);
    }
    file_list
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![get_file_list])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
