while True:
    inputtxt = input()
    if inputtxt == "-":
        break
    num = int(input())
    for i in range(num):
        h = int(input())
        inputtxt = inputtxt[h:len(inputtxt)] + inputtxt[0: h]
    print(inputtxt)
