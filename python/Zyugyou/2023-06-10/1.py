def AND_gate(x1,x2):
    w1,w2,theta = 0.5,0.5,0.7 
    tmp = w1*x1 + w2*x2

    if tmp <= theta:
        y= 0
    else:
        y= 1
    return y
