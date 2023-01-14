import math
x1, y1, x2, y2 = map(float, input().split())

x = abs(x2-x1)
y = abs(y2-y1)

sum_xy = x ** 2 + y ** 2
sq = math.sqrt(sum_xy)

print("{:.8f}".format(sq))

