l = input()
a, b, c = map(int, l.split())


if a < b and b < c:
    print("Yes")
else:
    print("No")
