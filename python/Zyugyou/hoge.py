def logger(func):
    def inner(*args):
        print("引数:", args)
        return func(*args)

    return inner


def accumulate(a, b):
    return a + b


newfunc = logger(accumulate)
print(newfunc(10.20, 3000))
