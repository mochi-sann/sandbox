
import pandas as pd

# CSVファイルの読み込み
df = pd.read_csv('utf-c01.csv', encoding='utf-8')
# print(df)
df = df[["都道府県名", "西暦（年）", "人口（総数）", "人口（男）", "人口（女）"]]
# 2015年のデータを抽出 (都道府県が東京都または大阪府)
df = df.loc[df["西暦（年）"] == 2015]

df = df.loc[df["西暦（年）"] == 2015,
            df["都道府県名"] == "東京都" ]
print(df)
# df.head()
# エクセルファイルの書き込み
df.to_excel('output.xlsx', index=False)
