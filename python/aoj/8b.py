
s = ""
while True:
    s = str(input())

    if s == "0":
        break
    sum = 0
    for d in s:
        sum += int(d)
    print(sum)
