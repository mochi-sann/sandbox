def get_bigger(a, b):
    return max(a, b)


print(get_bigger(1, 2))


def get_list_even(list):
    even_list = []
    for num in list:
        if num % 2 == 0:
            even_list.append(num)

    return even_list


print(get_list_even([1, 2, 3, 4, 5, 6]))


def get_miniest_num(a, b, c):
    return min(a, b, c)


print(get_miniest_num(1, 2, 3))


# 2つの文字列のリストを渡して共通の文字列があるリストを返す関数
def get_common_string(list1, list2):
    common_list = []
    for str1 in list1:
        for str2 in list2:
            if str1 == str2:
                common_list.append(str1)

    return common_list


print(get_common_string(['a', 'b', 'c'], ['a', 'd', 'e']))


def get_second_bigger_num(list):
    list.sort()

    return list[-2]


print(get_second_bigger_num([1, 2, 3, 4, 5, 6]))
