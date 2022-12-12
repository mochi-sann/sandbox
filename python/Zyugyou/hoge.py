from decimal import Decimal


def logger(func):
    def inner(*args):
        print("引数:", args)
        return func(*args)

    return inner


def accumulate(a, b):
    return a + b


newfunc = logger(accumulate)
print(newfunc(10.20, 3000))


@logger
def times(a, b):
    return a, b


print(times(10.20, 3000))

d = Decimal(1000)
print(d)


class MyClass:
    """this is example class"""

    def __init__(self, hoge, fuga):
        self.value = 0
        self.hoge = hoge
        self.fuga = fuga
        print("this is __init__() method()")

    def get_value(self):
        return self.value

    def set_value(self, value):
        self.value = value

    def add_value(self, value):
        self.value = self.value + value

    def content(self):
        return self.value**2

    pass


i = MyClass(hoge=20, fuga=2384)

i.set_value(100)
print("i.value", i.value)
i.add_value(22)
print("i.get_value()", i.get_value())

newI = MyClass(hoge=20, fuga=2384)

newI.set_value(300)
newI.add_value(300)
print("new.get_value()", newI.get_value())
