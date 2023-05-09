# import math pi
import math

# 円周率を表す変数
PI = math.pi

# 半径 r cm の円の面積(cm^2)を求める関数


def circle_area(r):
    return r * r * PI


# 半径が 5 (cm) の円の面積(cm^2)を求め、出力する
print(circle_area(5))
