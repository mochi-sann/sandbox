# 商品リストの作成
product_list = {"apple": 100, "banana": 50, "orange": 80}

# 買い物かごリストの入力
cart_list = []
while True:
    product_name = input("商品名を入力してください（終了する場合は「q」を入力）：")
    if product_name == "q":
        break
    quantity = int(input("数量を入力してください："))
    cart_list.append((product_name, quantity))

# 購入商品一覧と合計金額を表示
total_price = 0
print("購入商品一覧：")
for product_name, quantity in cart_list:
    price = product_list[product_name] * quantity
    total_price += price
    print(f"{product_name} x {quantity}: {price}円")

print(f"合計金額：{total_price}円")
