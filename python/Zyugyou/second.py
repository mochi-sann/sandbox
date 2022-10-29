def inputTN():
    Number = int(input("数字"))
    txt = input("名前")
    return (txt, Number)


list = [inputTN(), inputTN(), inputTN(), inputTN(), inputTN()]

list[::2]

for key in list[::2]:
    if key[1] <= 30:
        print(key[0])
