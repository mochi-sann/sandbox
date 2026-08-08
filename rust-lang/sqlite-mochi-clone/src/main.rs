use std::{env, fs, io, path::PathBuf, process::ExitCode};

use sqlite_mochi_clone::{Database, DbError, Result, shell};

struct Options {
    database: PathBuf,
    sql_file: Option<PathBuf>,
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("Error: {error}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<()> {
    let Some(options) = parse_args()? else {
        return Ok(());
    };
    let mut database = Database::open(&options.database)?;
    if let Some(path) = options.sql_file {
        let sql = fs::read_to_string(path)?;
        let stdout = io::stdout();
        shell::execute_sql(&mut database, &sql, &mut stdout.lock())
    } else {
        shell::run_repl(&mut database, io::stdin().lock(), io::stdout().lock())
    }
}

fn parse_args() -> Result<Option<Options>> {
    let mut database = None;
    let mut sql_file = None;
    let mut args = env::args().skip(1);
    while let Some(argument) = args.next() {
        match argument.as_str() {
            "-h" | "--help" => {
                print_help();
                return Ok(None);
            }
            "-f" | "--file" => {
                let path = args.next().ok_or_else(|| {
                    DbError::Constraint(format!("{argument} requires a file path"))
                })?;
                if sql_file.replace(PathBuf::from(path)).is_some() {
                    return Err(DbError::Constraint(
                        "the SQL file may only be specified once".into(),
                    ));
                }
            }
            value if value.starts_with('-') => {
                return Err(DbError::Constraint(format!("unknown option '{value}'")));
            }
            value => {
                if database.replace(PathBuf::from(value)).is_some() {
                    return Err(DbError::Constraint(
                        "only one database file may be specified".into(),
                    ));
                }
            }
        }
    }
    Ok(Some(Options {
        database: database.unwrap_or_else(|| PathBuf::from("mochi.db")),
        sql_file,
    }))
}

fn print_help() {
    println!(
        "sqlite-mochi-clone - a small SQL database for learning\n\n\
         Usage: sqlite-mochi-clone [DATABASE] [OPTIONS]\n\n\
         Options:\n  -f, --file FILE  Execute SQL from FILE and exit\n  -h, --help       Print this help"
    );
}
