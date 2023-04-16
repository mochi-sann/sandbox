import re
fruits_list = "peach:100,apple:200,banana:300,cherry:230,mango:400"
hoge = re.compile(r'cherry:(\d+)')
fuga = hoge.search(fruits_list)
print(fuga.group())
print(fuga.group(1))
