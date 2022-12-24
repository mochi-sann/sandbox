class Member:
    def __init__(self):
        self.__name = ""
        self.__age = 0
        self.__height = 0
        self.__weight = 0

    def setname(self, name):
        self.__name = name

    def getname(self):
        return self.__name

    name = property(getname, setname)

    def setage(self, age):
        self.__age = age

    def getage(self):
        return self.__age

    age = property(getage, setage)

    def setheight(self, height):
        self.__height = height

    def getheight(self):
        return self.__height

    height = property(getheight, setheight)

    def setweight(self, weight):
        self.__weight = weight

    def getweight(self):
        return self.__weight

    weight = property(getweight, setweight)
