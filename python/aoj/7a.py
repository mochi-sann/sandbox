while True:
    m, f, r = map(int, input().split())
    ans = ""
    if m == -1 and f == -1 and r == -1:
        break
    if m == -1 or f == -1:
        ans = "F"
    elif m + f >= 80:
        ans = "A"
    elif m + f >= 65:
        ans = "B"
    elif m + f >= 50:
        ans = "C"
    elif m + f >= 30 and r >= 50:
        ans = "C"
    elif m + f >= 30:
        ans = "D"
    else:
        ans = "F"
    print(ans)
