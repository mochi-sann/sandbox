class trump_card:
    def __init__(self,  mark, number):
        self.number = number
        self.mark = mark

    def display(self):
        print(self.mark, self.number)

    def disp(self):
        suits = ["スペード", "クラブ", "ハート", "ダイヤ"]
        values = ['A', '2', '3', '4', '5', '6',
                  '7', '8', '9', '10', 'J', 'Q', 'K']
        print("{}の{}".format(suits[self.mark], values[self.number-1]))


card = trump_card(1, 0)
card.disp()
# 52枚のカードを持つクラスを作成


class Deck:
    cards = []

    def __init__(self):
        self.cards = []
        for mark in range(4):
            for number in range(1, 14):
                self.cards.append(trump_card(mark, number))

    def display(self):
        for card in self.cards:
            card.display()

    def get_random_card(self):
        import random
        return random.shuffle(self.cards)


card_list = Deck()
cart___________a = card_list.get_random_card()
print(cart___________a)
