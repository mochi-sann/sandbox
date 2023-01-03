n = int(input())
cards = [[0 for i in range(13)] for j in range(4)]
type_card = {"S": 0, "H": 1, "C": 2, "D": 3}


def get_swap_dict(d):
    return {v: k for k, v in d.items()}


s_type_card = get_swap_dict(type_card)

for i in range(n):

    t, r = input().split()
    r = int(r)

    t_n = type_card[t]
    cards[t_n][r - 1] = 1

for i in range(4):
    for j in range(13):
        if cards[i][j] == 0:
            print("{0} {1}".format(s_type_card[i], j + 1))
