import json

json_file = open('types.json', 'r')

load_json_file = json.load(json_file)

name = "Rock"
serrched_pokemon = list(
    filter(lambda item: item["english"] == name, load_json_file))


if (len(serrched_pokemon) == 0):

    print(f"{name} は存在しません")
else:
    print("name : ", serrched_pokemon[0]["japanese"])

name = "はがね"

serrched_pokemon = list(
    filter(lambda item: item["japanese"] == name, load_json_file))


if (len(serrched_pokemon) == 0):

    print(f"{name} は存在しません")
else:
    print("name : ", serrched_pokemon[0]["english"])
