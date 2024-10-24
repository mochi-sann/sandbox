def base_10(num_n,n):
    num_10 = 0
    for s in str(num_n):
        num_10 *= n
        num_10 += int(s)
    return num_10

hoge = 7 / 32
hoge_2 = 1/32
# print(format(hoge , 'b'))

from decimal import Decimal
def bin_f(f):
    dec=Decimal(str(f))
    Bin=''
    nth=0
    first=0
    while dec:
        if dec  >= 1:
            Bin += '1'
            dec = dec -1
            if first==0:
                first=nth
        else:
            if nth!=0:
                Bin += '0'
            else:
                Bin +='0.'
        dec*=2
        nth+=1
        if nth-first==55:
            break
    return Bin    
    
print(hoge , bin_f(hoge))
print(bin_f(0.1))          

print(hoge_2 , hoge_2.hex())
