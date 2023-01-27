file = open('proxy.log', 'r')
logfile = file.read()
split_lof_file = logfile.splitlines()
for i in split_lof_file:
    if '2016-06-21' in i:
        print(i)


cnt = 0
for i in split_lof_file:
    if '192.168.0.2' in i:
        cnt += 1

print("192.168.0.2 のアクセス回数 : ", cnt)
