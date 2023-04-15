# 特定のファイルを読み出して一行ごとにに表示
def get_file_read_a_line(file_path):
    with open(file_path) as f:
        for line in f:
            print(line, end='')


# get_file_read_a_line("./sample-data/README.md")


def get_file_read_a_line_asterisk(file_path):
    with open(file_path) as f:
        for line in f:

            if line.startswith("*"):
                print(line, end='')


get_file_read_a_line_asterisk("./sample-data/README.md")
