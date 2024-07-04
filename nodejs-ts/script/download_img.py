import json 
import requests

def get_image(file_url  , filename):
    urlData = requests.get(file_url).content

    with open(f"./out/{filename}" ,mode='wb') as f: # wb でバイト型を書き込める
        f.write(urlData)

emoji_json = open("emoji.json")
emojis = json.load(emoji_json)

print(emojis)
for e in emojis:
    print(e["url"])
    extension = e["url"].split('.')[-1]
    get_image(e["url"] ,f"{e["name"]}.{extension}")

