n, m = map(int, input().split())

tbl = [[0 for i in range(m)] for j in range(n)]
tbl2 = [0 for i in range(m)]

for i in range(n):
    for j in range(m):
        l = list(map(int, input().split()))
