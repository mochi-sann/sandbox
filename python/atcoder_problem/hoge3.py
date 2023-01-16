S = input()

lenthe = len(S)

ans = 0
ksd = ""
sinsuu = "123456789ABCDEFGHIGKMNLOPQRSTUVWXWZ"


def base_10(num_n, n):
    num_10 = 0
    for s in str(num_n):
        num_10 *= n
        num_10 += int(s)
    return num_10


for i in range(lenthe):
    keta = lenthe - i
    s = S[i]
    if (s == "\n"):
        break
    # print("s", s)
    number = ord(s) - 65
    ket = sinsuu[number]
    #
    # print(number)
    ksd += ket

print(base_10(ksd, 25))
