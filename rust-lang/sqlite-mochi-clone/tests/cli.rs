use std::{
    fs,
    path::PathBuf,
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

fn test_path(extension: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    std::env::temp_dir().join(format!(
        "mochidb-cli-{}-{nonce}.{extension}",
        std::process::id()
    ))
}

#[test]
fn executes_a_sql_file_and_persists_results() {
    let database = test_path("db");
    let script = test_path("sql");
    fs::write(
        &script,
        "CREATE TABLE users (id INTEGER NOT NULL, name TEXT);\n\
         INSERT INTO users VALUES (1, 'Mochi');\n\
         SELECT * FROM users;",
    )
    .unwrap();

    let output = Command::new(env!("CARGO_BIN_EXE_sqlite-mochi-clone"))
        .arg(&database)
        .arg("--file")
        .arg(&script)
        .output()
        .unwrap();
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(stdout.contains("1  | Mochi"));

    let query = test_path("sql");
    fs::write(&query, "SELECT name FROM users;").unwrap();
    let reopened = Command::new(env!("CARGO_BIN_EXE_sqlite-mochi-clone"))
        .arg(&database)
        .arg("--file")
        .arg(&query)
        .output()
        .unwrap();
    assert!(reopened.status.success());
    assert!(
        String::from_utf8(reopened.stdout)
            .unwrap()
            .contains("Mochi")
    );

    fs::remove_file(database).unwrap();
    fs::remove_file(script).unwrap();
    fs::remove_file(query).unwrap();
}

#[test]
fn exits_with_failure_on_the_first_script_error() {
    let database = test_path("db");
    let script = test_path("sql");
    fs::write(
        &script,
        "SELECT * FROM missing; CREATE TABLE skipped (id INTEGER);",
    )
    .unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_sqlite-mochi-clone"))
        .arg(&database)
        .arg("--file")
        .arg(&script)
        .output()
        .unwrap();
    assert!(!output.status.success());
    assert!(
        String::from_utf8(output.stderr)
            .unwrap()
            .contains("unknown table 'missing'")
    );
    assert!(!database.exists());
    fs::remove_file(script).unwrap();
}
