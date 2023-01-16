a, b = map(int, input().split())
if (b % 2 == 0):
    b = b
else:
    b = b - 1

if b / 2 == a:
    print("Yes")
else:
    print("No")
