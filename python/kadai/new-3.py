
file = open('access.log', 'r')
logfile = file.read()
split_line_lof_file = logfile.splitlines()
for i, value in enumerate(split_line_lof_file):
    split_value = value.split()
    split_time_value = split_value[3].split(":")
    if (split_time_value[1] == "10" and split_time_value[0] == '[02/Mar/2021'):
        print(split_value[0])


for i, value in enumerate(split_line_lof_file):
    split_value = value.split()
    split_time_value = split_value[3].split(":")
    if (split_time_value[1] == "14" and split_time_value[0] == '[04/Mar/2021' and ('Mac' in split_value)):
        print(split_value[0])
        print(split_value)
