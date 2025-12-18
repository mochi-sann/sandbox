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



if __name__ == "__main__":
    main()
