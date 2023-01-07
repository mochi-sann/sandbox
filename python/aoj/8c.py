tbl = [0 for i in range(ord('z'))]

while True:
    try:
        str = input()
        for s in str:
            s = s.lower()
            num = ord(s)
            # print("num - ord('a')", num - ord('a'), ord(s) , s)
            tbl[num - ord('a')] += 1
    except EOFError:
        break


for i in range(ord('z') - ord('a') + 1):
    print(f"{chr(ord('a') + i)} : {tbl[i]}")
