import numpy as np

# パーセプトロンによるANDゲート
def ANDgate(x1, x2):
    f = 1.0 * x1 + 1.0 * x2
    if f <= 1.0:
        y = 0
    else:
        y = 1
    return y

# パーセプトロンによるORゲート
def ORgate(x1, x2):
    f = 0.5 * x1 + 0.5 * x2
    if f <= 0.2:
        y = 0
    else:
        y = 1
    return y

# パーセプトロンによるNANDゲート
def NANDgate(x1, x2):
    f = -0.8 * x1 + -0.8 * x2
    if f <= -0.9:
        y = 0
    else:
        y = 1
    return y

x1 = np.array([0, 0, 1, 1])
x2 = np.array([0, 1, 0, 1])
for i in range(4):
    X1 = x1[i]
    X2 = x2[i]
    y1 = NANDgate(X1, X2)
    y2 = ORgate(X1, X2)
    y3 = ANDgate(y1, y2)
    print(y3)
