values = input("数値入力")

list = [int(s) for s in values.split()]
print(list)
sum_list = sum(list)
print(sum_list)

add = lambda a, b: a + b
print(add(200, 300))
