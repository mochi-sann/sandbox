s = input()
n = int(input())
for i in range(n):
    lis = list(map(str, input().split()))
    a = int(lis[1])
    b = int(lis[2]) +1 
    if lis[0] == "replace":
        s = s[0:a] + lis[3] + s[b: len(s)]

    elif lis[0] == "reverse":
        rev = s[a:b][::-1]
        s = s[0:a] + rev + s[b: len(s)]
    elif lis[0] == "print":
        print(s[a:b])
