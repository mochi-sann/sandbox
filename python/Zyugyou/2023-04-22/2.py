
import re

# アクセスログから日付と時刻を取得するための正規表現
pattern = re.compile(
    r'\[(\d{2})/(\w+)/(\d{4}):(\d{2}:\d{2}:\d{2})\s+\+\d{4}\]')
log = None
# アクセスログを読み込む
with open('./access.log', 'r') as f:
    log = f.readlines()

# アクセス頻度をカウントするディクショナリ
freq = {}

# アクセスログを一行ずつ処理する
for line in log:
    # 日付と時刻を取得する
    match = pattern.search(line)
    if match is None:
        continue
    day = match.group(1)
    month = match.group(2)
    year = match.group(3)
    time = match.group(4)

    # 2021/03/20かつ10時から16時の範囲に該当するアクセスのみをカウントする
    if year == '2021' and month == 'Mar' and day == '20' and '10:00:00' <= time <= '16:59:59':
        hour = time[0:2]
        if hour not in freq:
            freq[hour] = 0
        freq[hour] += 1

# アクセス頻度を表示する
for hour in range(10, 17):
    hour_str = str(hour).zfill(2)
    print(f'{hour_str}:00 - {hour_str}:59: {freq.get(hour_str, 0)}')
