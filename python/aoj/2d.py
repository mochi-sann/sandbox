l = input()

W, H, x, y, r = map(int, l.split())
# // 下
if 0 <= x - r and x + r <= W and 0 <= y - r and y + r <= H:
    print("Yes")
else:
    print("No")
