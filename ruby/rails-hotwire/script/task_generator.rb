#!/usr/bin/env ruby
# frozen_string_literal: true

require "optparse"
require_relative "../config/environment"

# Simple utility to generate sample Task records for local development.
options = {
  count: 10,
  truncate: false,
  dry_run: false,
  seed: nil
}

parser = OptionParser.new do |opts|
  opts.banner = "Usage: bin/rails runner script/task_generator.rb [options]"

  opts.on("-c", "--count N", Integer, "生成するタスク数 (デフォルト: #{options[:count]})") do |count|
    raise OptionParser::InvalidArgument, "count must be positive" if count <= 0

    options[:count] = count
  end

  opts.on("-t", "--truncate", "既存のタスクを削除してから生成する") do
    options[:truncate] = true
  end

  opts.on("-d", "--dry-run", "レコードを作成せず内容だけ表示する") do
    options[:dry_run] = true
  end

  opts.on("-s", "--seed N", Integer, "乱数シードを指定する") do |seed|
    options[:seed] = seed
  end

  opts.on("-h", "--help", "このヘルプを表示する") do
    puts opts
    exit
  end
end

parser.parse!(ARGV)

srand(options[:seed]) if options[:seed]

qualifiers = ["週次", "重要", "緊急", "バックログ", nil]
topics = [
  "仕様レビュー",
  "デプロイ計画",
  "ユーザーインタビューまとめ",
  "QAチェックリスト",
  "開発タスク整理",
  "レトロスペクティブ準備",
  "顧客サクセス連絡",
  "ダッシュボード更新",
  "KPIレポート",
  "サーバーメンテナンス"
]
actions = ["確認する", "仕上げる", "共有する", "更新する", "整理する", "レビューする"]
details = [
  "最新の情報を反映し、関係者へ周知してください。",
  "完了後にコメントで要点を残し、Slackに共有しましょう。",
  "関連ドキュメントを添付し、期限も明記してください。",
  "必要なメンバーへの依頼とスケジュール調整も忘れずに。",
  "リリースノートとの整合性を確認し、差分をまとめてください。",
  "次回のミーティングまでに追加の質問事項を整理しておきましょう。"
]
followups = [
  "期限: 今日中にドラフトを完成させる。",
  "期限: 明日 12:00 までに一次レビューを完了する。",
  "期限: 今週金曜までに最終版を共有する。",
  "期限: 水曜のスタンドアップで進捗を報告する。",
  "期限: スプリント終了前に確認を完了する。"
]

build_task = lambda do
  qualifier = qualifiers.sample
  topic = topics.sample
  action = actions.sample
  title_core = "#{topic}を#{action}"
  title = qualifier ? "#{qualifier}#{title_core}" : title_core
  description = [details.sample, followups.sample].join(" ")

  { title:, description: }
end

records = Array.new(options[:count]) { build_task.call }

if options[:dry_run]
  records.each_with_index do |attrs, index|
    puts "Task ##{index + 1}"
    puts "  Title: #{attrs[:title]}"
    puts "  Description: #{attrs[:description]}"
  end
  exit
end

ApplicationRecord.transaction do
  Task.delete_all if options[:truncate]

  records.each do |attrs|
    Task.create!(attrs)
  end
end

total = Task.count
puts "Generated #{records.length} task(s). 現在のタスク件数: #{total}"
