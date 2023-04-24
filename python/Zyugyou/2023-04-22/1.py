import re

sample_text = "a22dc1111111111"
reg_str = r'[aA]\d{2}[dD][cC]\d{4}'
phone_num_regex = re.compile(reg_str)
mo = phone_num_regex.search(sample_text)
if mo != None:
    print(mo.group())
else:
    print("見つからない")
