while True:
    H, W = map(int, input().split())
    if H == 0 and W == 0:
        break
    for i in range(H):
        for iw in range(W):
            if (iw % 2 == 0 and i % 2 == 0) or (iw % 2 == 1 and i % 2 == 1):
                print("#", end="")
            else:
                print(".", end="")

        print("", end="\n")
    print()
