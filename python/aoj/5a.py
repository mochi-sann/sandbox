while True:
    H, W = map(int, input().split())
    if H == 0 and W == 0:
        break
    for i in range(H):
        for iw in range(W):
            print("#", end="")
        print("", end="\n")
    print()
