n = int(input())
l = list(map(int, input().split()))

l.reverse()

for i, elm in enumerate(l):
    if i > 0:
        print(" ", end="")  # i が 0 より大きいとき、つまり最初の要素ではないとき空白を出力
    print(elm, end="")

print()
