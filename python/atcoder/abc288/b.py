N, K = map(int, input().split())
l = []

for i in range(K):
    new_text = input()

    l.append(new_text)
l.sort()

for i in range(K):
    print(l[i])
