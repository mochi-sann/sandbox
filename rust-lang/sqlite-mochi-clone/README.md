# sqlite-mochi-clone

SQLの処理の流れを学ぶためにRustで作った、小さな永続化データベースです。SQLiteのファイル形式とは互換性がありません。

入力されたSQLは、次の順で処理されます。

1. `lexer` が文字列をトークンへ分割する
2. `parser` がトークンからAST（抽象構文木）を作る
3. `engine` がASTを検証し、行を検索・変更する
4. `storage` が変更後のデータを独自バイナリ形式で保存する

## 起動

```console
$ cargo run -- my.db
MochiDB 0.1.0 — enter .help for help
mochi> CREATE TABLE users (id INTEGER NOT NULL, name TEXT);
Table created.
mochi> INSERT INTO users VALUES (1, 'Mochi');
1 row(s) affected.
mochi> SELECT * FROM users;
id | name
---+------
1  | Mochi
1 row(s).
mochi> .exit
```

データベースファイルを省略すると、カレントディレクトリの `mochi.db` を使います。SQLファイルを一括実行する場合は次のように指定します。

```console
cargo run -- my.db --file setup.sql
```

## 対応するSQL

```sql
CREATE TABLE users (id INTEGER NOT NULL, name TEXT);
INSERT INTO users (id, name) VALUES (1, 'Mochi');
SELECT id, name FROM users WHERE id >= 1 AND name IS NOT NULL;
UPDATE users SET name = 'Ann' WHERE id = 1;
DELETE FROM users WHERE id = 1;
```

- 型: `INTEGER`、`TEXT`、`NULL`
- 比較: `=`、`!=`、`<>`、`<`、`<=`、`>`、`>=`
- 条件: `AND`、`OR`、`NOT`、括弧、`IS NULL`、`IS NOT NULL`
- REPLコマンド: `.help`、`.tables`、`.schema [TABLE]`、`.exit`

キーワードとテーブル・列名はASCIIの大文字小文字を区別しません。文字列はシングルクォートで囲み、クォート自体は `''` と書きます。

## 意図的に未対応の機能

SQLite形式との互換性、B-tree、インデックス、JOIN、集約、ORDER BY、トランザクション、同時接続、主キー・外部キー制約は未実装です。現在は更新文ごとにデータベース全体を一時ファイルへ書き、成功後に置き換えます。

## 開発時の確認

```console
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```
