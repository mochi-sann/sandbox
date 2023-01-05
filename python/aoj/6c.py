num = int(input())

tbl = [[[0 for i in range(10)] for j in range(3)] for k in range(4)]

for i in range(num):
    b, f, r, v = map(int, input().split())
    tbl[b - 1][f - 1][r - 1] += v


for i in range(4):
    for j in range(3):
        for k in range(10):
            print(" ", end="")  # i が 0 より大きいとき、つまり最初の要素ではないとき空白を出力
            print(tbl[i][j][k], end="")
        print("")
    if i != 3:
        print("####################")
