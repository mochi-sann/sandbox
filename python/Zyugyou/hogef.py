

def get_sum_price(buy_list):
    item_list = [("apple", 100), ("banana", 50), ("orange", 80)]
    sum_price = 0
    for name, price in buy_list:
        for name2, price2 in item_list:
            if name == name2:
                sum_price += price * price2
    return sum_price


print(get_sum_price([("apple",  10), ("banana", 4)]))
