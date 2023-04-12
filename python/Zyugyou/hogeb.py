
people = [
    {"name": "山田", "height": 170},
    {"name": "田中", "height": 180},
    {"name": "鈴木", "height": 165},
    {"name": "佐藤", "height": 175},
    {"name": "高橋", "height": 185}
]


def average_height(people):
    total_height = 0
    for person in people:
        total_height += person["height"]
    return total_height / len(people)


avg = average_height(people)
for i in people:
    if i["height"] >= avg:
        print(i["name"] + " : " + str(i["height"]))
