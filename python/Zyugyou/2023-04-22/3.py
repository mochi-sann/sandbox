import re

# アクセスログからOSの種類を取得するための正規表現
# ユーザーエージェントの情報から判断する
pattern = re.compile(
    r'(\((Windows|Macintosh|Linux|Android|iOS)\s+(\d+\.\d+)[^)]*\))')
log 
log3
log4
# アクセスログを3日と4日に分割して読み込む
with open('access.log', 'r') as f:
    log = f.readlines()
    log3 = [line for line in log if '/03/' in line]
    log4 = [line for line in log if '/04/' in line]

# OSをカウントするディクショナリ
count3 = {'Windows': 0, 'Macintosh': 0, 'Linux': 0, 'Android': 0, 'iOS': 0}
count4 = {'Windows': 0, 'Macintosh': 0, 'Linux': 0, 'Android': 0, 'iOS': 0}

# 3日のアクセスログを処理する
for line in log3:
    match = pattern.search(line)
    if match is None:
        continue
    os = match.group(2)
    count3[os] += 1

# 4日のアクセスログを処理する
for line in log4:
    match = pattern.search(line)
    if match is None:
        continue
    os = match.group(2)
    count4[os] += 1

# OSの割合を計算する
total3 = sum(count3.values())
total4 = sum(count4.values())
ratio3 = {os: count3[os] / total3 for os in count3}
ratio4 = {os: count4[os] / total4 for os in count4}

# OSの割合を表示する
print('3日のOSの割合:')
for os in ratio3:
    print(f'{os}: {round(ratio3[os], 3)} ({count3[os]}件)')
print('4日のOSの割合:')
for os in ratio4:
    print(f'{os}: {round(ratio4[os], 3)} ({count4[os]}件)')
