def dm_sending_decision(age: int) -> str:
    if age < 20:
        return 'DMを送付しない'
    elif 30 > age and age >= 20:
        return 'ビール系居酒屋'
    elif 40 > age and age>=  30 :
        return '日本酒,焼酎系居酒屋'
    elif 50 > age and age >= 40:
        return '高級酒系居酒屋'
    else :
        return 'DMを送付しない'
def main():
    age = int(input("Enter your age: "))
    print(dm_sending_decision(age))
    
    print(dm_sending_decision(19))
    print(dm_sending_decision(20))
    print(dm_sending_decision(21))
    print(dm_sending_decision(29))
    print(dm_sending_decision(30))
    print(dm_sending_decision(31))
    print(dm_sending_decision(39))
    print(dm_sending_decision(40))
    print(dm_sending_decision(41))
    print(dm_sending_decision(49))
    print(dm_sending_decision(50))
    print(dm_sending_decision(51))



if __name__ == "__main__":
    main()
