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

## フロントエンド開発フロー

Task一覧ページは React + TypeScript で実装されています。開発を始める前に Node の依存関係をインストールしてください。

```
npm install
```

開発サーバーは `bin/dev` で Rails と esbuild のウォッチャーを同時起動します。

```
bin/dev
```

本番ビルドや CI では以下でアセットを生成できます。

```
npm run build
```

React のエントリポイントは `app/javascript/react` 配下にあります。Task 一覧は Stimulus コントローラ (`task_list_controller.ts`) を通じて Turbo と共存する形でマウントされます。API 通信は Rails 側の JSON エンドポイント (`tasks#index/create/update/destroy/toggle`) を利用します。

## テスト

バックエンドの JSON API は Minitest のリクエストテスト (`test/controllers/tasks_controller_test.rb`) でカバーしています。`bin/rails test` で実行してください。

フロントエンドのユニットテスト環境は今後 Jest + Testing Library を導入予定です。それまではブラウザで以下の動作確認を行ってください。

1. `/tasks` にアクセスし、タスク一覧とステータスバッジが表示されることを確認する
2. 新規タスクを追加し、一覧に即時反映されることを確認する
3. 絞り込み・検索・ページネーションが正しく動作することを確認する
4. タスクの完了/未完了を切り替え、状態が更新されることを確認する
5. 編集・削除操作が成功し、トースト/アラートが表示されることを確認する
