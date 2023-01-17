import json
import statistics
from typing import overload
# import numpy as np


pokemon_json_open = open('pokemon.json', 'r')
pokemon_json_load = json.load(pokemon_json_open)


# # search_id = int(input("検索するID : "))
# # serrched_pokemon = list(
# #     filter(lambda item: item['id'] == search_id, pokemon_json_load))
# #
# # print(serrched_pokemon[0]["name"]["japanese"])
# search_name = input("日本語でポケモンお名前を入力 : ")
#
# serrched_pokemon = list(
#     filter(lambda item: item["name"]["japanese"] == search_name, pokemon_json_load))
#
#
# if (len(serrched_pokemon) == 0):
#
#     print(f"{search_name} は存在しません")
# else:
#     print(serrched_pokemon[0]["name"]["english"])

# def get_attack(value):
#     return value["base"]["Attack"]
#
#
# new_pokemon_list = sorted(pokemon_json_load, reverse=True,  key=get_attack)
# print(new_pokemon_list[0]["name"]["japanese"])
# print(new_pokemon_list[1]["name"]["japanese"])
# print(new_pokemon_list[2]["name"]["japanese"])

# def get_speed(value):
#     return value["base"]["Speed"]
#
#
# new_pokemon_list = sorted(pokemon_json_load, reverse=False,  key=get_speed)
# print(new_pokemon_list[0]["name"]["japanese"])
# print(new_pokemon_list[1]["name"]["japanese"])
# print(new_pokemon_list[2]["name"]["japanese"])
# cnt = 0
# for i in pokemon_json_load:
#     pk_type = i["type"]
#     if "Fire" in pk_type and "Flying" in pk_type:
#
#         cnt += 1
#
# print(f"火(Fire)と飛翔(Flying)の属性を持ったポケモンの数を表示 : {cnt}")


# def get_speed(value):
#     return value["vase"]["Speed"]
#
#
# pokemon_speeds = [[d['base']["Speed"] for d in pokemon_json_load]
#
#                   ]
# # print(pokemon_speeds)
#
# pokemon_avg_speed = statistics.mean(pokemon_speeds[0])
# print(pokemon_avg_speed)
#
# for i in pokemon_json_load:
#     pk_type = i["type"]
#     if "Water" in pk_type and i["base"]["Speed"] >= pokemon_avg_speed:
#         # print("採用 i["name"]["japanese"]")
#         print("採用   : {:1}".format(i["name"]["japanese"]))
#     else:
#         print("不採用 : {:1}".format(i["name"]["japanese"]))

pokemon_defense = [[d['base']["Defense"] for d in pokemon_json_load]]
pokemon_avg_defense = statistics.median(pokemon_defense[0])

print(pokemon_avg_defense)
for i in pokemon_json_load:
    pk_type = i["type"]
    if "Electric" in pk_type and i["base"]["Defense"] >= pokemon_avg_defense:
        # print("採用 i["name"]["japanese"]")
        print("採用   : {:1}".format(i["name"]["japanese"]))
    # else:
    #     print("不採用 : {:1}".format(i["name"]["japanese"]))
