import json

pokemon_json_open = open('pokemon.json', 'r')
pokemon_json_load = json.load(pokemon_json_open)

pokemon_json_load["hoge-hoge:1q"]
