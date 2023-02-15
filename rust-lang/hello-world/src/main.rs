use std::{error, fmt};

#[derive(Debug)]
enum ApiError {
    InternalServerError(String),
    NotFound,
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ApiError::InternalServerError(msg) => write!(f, "Internal Server Error: {}", msg),
            ApiError::NotFound => write!(f, "Not Found"),
        }
    }
}
fn mayve_fail() -> Result<(), Box<dyn error::Error>> {
    let x = 1;
    let y = 0;
    if y == 0 {
        return Err("y is zero".into());
    }
    let z = x / y;
    Ok(())
}

fn main() -> Result<(), Box<dyn error::Error>> {
    let l = mayve_fail()?;
    Ok(())
}
