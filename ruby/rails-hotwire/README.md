# README

This README would normally document whatever steps are necessary to get the
application up and running.

Things you may want to cover:

* Ruby version

* System dependencies

* Configuration

* Database creation

* Database initialization

* How to run the test suite

* Services (job queues, cache servers, search engines, etc.)

* Deployment instructions

* ...

## タスクジェネレーターの使い方

開発中にダミーのタスクデータを生成したい場合は、以下のスクリプトを利用できます。

```
bin/rails runner script/task_generator.rb [オプション]
```

利用可能なオプション:

- `--count N` (`-c N`): 生成するタスク件数 (デフォルト 10)
- `--truncate` (`-t`): 既存のタスクを削除してから生成
- `--dry-run` (`-d`): レコードを作成せず内容だけ出力
- `--seed N` (`-s N`): 乱数シードを指定して結果を固定
- `--help` (`-h`): ヘルプを表示

例:

```
bin/rails runner script/task_generator.rb --count 20 --truncate
bin/rails runner script/task_generator.rb --dry-run --count 5
bin/rails runner script/task_generator.rb --count 15 --seed 42
```
