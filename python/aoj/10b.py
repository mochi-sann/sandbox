import math
a, b, c = map(int, input().split())

rad = math.radians(c)
S = (a * b * math.sin(rad)) * 0.5

height = S * 2 / a

# bc = math.sin(rad) * a
b1 = math.sqrt(a ** 2 - height ** 2)
b2 = b - b1

bc = math.sqrt(a**2+b**2-2*a*b*math.cos(rad))

L = a + b + bc
print("{:.10f}".format(S))
print("{:.10f}".format(L))
print("{:.10f}".format(height))
