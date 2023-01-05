while True:
    n, x = map(int, input().split())
    ans = 0

    if n == 0 and x == 0:
        break
    for i in range(1, n + 1):
        for j in range(1, n + 1):
            for k in range(1, n + 1):
                if (i < j and j < k and i < k) and (i + j + k == x):
                    ans += 1
    print(int(ans))
