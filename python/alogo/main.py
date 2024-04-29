N , M = map(int, input().split())
r = 0
for i in range(N):
    for j in range(M):
        r += i + j
print(r)
