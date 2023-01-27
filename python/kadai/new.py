import csv
from statistics import mean
import statistics

# with open('total_fertility_rate.csv') as f:
#     reader = csv.reader(f)
#     l = [row for row in reader]
#     start = l[0].index('1980')
#     end = l[0].index('1989') + 1
#     print(start, end)
#     print(l[0][start:end])
#     print("出生率の平均値 : ", statistics.mean(list(map(float,  l[1][start:end]))))
#
# with open('total_fertility_rate.csv') as f:
#     reader = csv.reader(f)
#     l = [row for row in reader]
#     start = l[0].index('1970')
#     end = l[0].index('1999') + 1
#     print(start, end)
#     print(l[0][start:end])
#     print("出生率の最大値 : ", max(list(map(float,  l[1][start:end]))))


male_csv = open('male_1944_2014.csv', 'r')
female_csv = open('female_1944_2014.csv', 'r')
reader_male = csv.reader(male_csv)
male_csv_load = [row for row in reader_male]

reader_female = csv.reader(female_csv)
famele_csv_load = [row for row in reader_female]
# print(male_csv_load, famele_csv_load)

start = male_csv_load[0].index('30 - 34')
end = male_csv_load[0].index('35 - 39') + 1
print(start, end)

for i, value in enumerate(male_csv_load):

    if (value[0] == '2002'):
        fa = famele_csv_load[i][start:end]
        ma = value[start:end]
        total = fa + ma
        print(total)
        total = list(map(int, total))
        print(sum(total))


start = male_csv_load[0].index('10 - 14')
print(start)

end = male_csv_load[0].index('15 - 19') + 1
ten_list = []
for i, value in enumerate(male_csv_load):

    if (i == 0):
        continue
    fa = famele_csv_load[i][start:end]
    ma = value[start:end]
    total = fa + ma
    print("total", total)
    total = map(int, total)
    ten_list += [sum(total)]

print(ten_list)
ten_list_max = max(ten_list)
ten_list_max_index = ten_list.index(ten_list_max)
print(ten_list_max, ten_list_max_index)

print(male_csv_load[ten_list_max_index][0])
