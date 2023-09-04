use chrono::{DateTime, Local};
use std::time::Duration;

use tokio::time::sleep;

async fn await_fn() {
    let start_time = Local::now();
    println!("start {}", start_time);

    sleep(Duration::from_nanos(2)).await;
    let end_time: DateTime<Local> = Local::now();

    println!("end {}", end_time);
    let diff_time = end_time - start_time;
    println!("diff fn {}", diff_time);
}

#[tokio::main]
async fn main() {
    await_fn().await;
}
