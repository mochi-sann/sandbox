W = input()


cnt = 0
while True:
    words = input().split()
    if words[0] == "END_OF_TEXT":
        break
    for s in words:
        if s.lower() == W.lower():
            cnt += 1

print(cnt)
