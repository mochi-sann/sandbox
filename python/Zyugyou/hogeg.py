def get_tax_price(price, tax=0.1):
    return int(price * tax)


print(get_tax_price(1000))
print(get_tax_price(1000, 0.666))

