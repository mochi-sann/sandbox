n = int(input())


pa = 0
pb = 0
for i in range(n):
    a, b = map(str, input().split())
    if a < b:
        pb += 3
    elif a > b:
        pa += 3
    else:
        pa += 1
        pb += 1
print(f"{pa} {pb}")
