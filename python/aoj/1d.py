s = int(input())

hour = s // 3600
sec = s % 60

min = (s - sec) / 60
print(f"{hour}:{min}:{sec}")
