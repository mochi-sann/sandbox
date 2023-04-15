from math import sqrt


class Point:

    def __init__(self, x, y):
        self.x = x
        self.y = y

    def get_distans(self, p):

        if not isinstance(p, Point):
            raise TypeError("p is not Point")
        return sqrt((self.x - p.x)**2 + (self.y - p.y)**2)


APoint = Point(1, 1)
BPoint = Point(2, 2)
CPoint = Point(2, 20)

print(APoint.get_distans(BPoint))

ABDis = APoint.get_distans(BPoint)
BCDdis = BPoint.get_distans(CPoint)

print(ABDis + BCDdis)

