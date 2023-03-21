import os
import unittest


class TicTacToe:
    def __init__(self):
        self.board = [[' ', ' ', ' '], [' ', ' ', ' '], [' ', ' ', ' ']]
        self.player = 'X'
        self.winning_positions = []  # 勝利した場所を記憶するためのリスト

    def display_board(self, tie=False):
        os.system('clear')
        print('  1 2 3')
        print(' +-+-+-+')
        print('1|' + self.get_mark(0, 0) + '|' +
              self.get_mark(0, 1) + '|' + self.get_mark(0, 2) + '|')
        print(' +-+-+-+')
        print('2|' + self.get_mark(1, 0) + '|' +
              self.get_mark(1, 1) + '|' + self.get_mark(1, 2) + '|')
        print(' +-+-+-+')
        print('3|' + self.get_mark(2, 0) + '|' +
              self.get_mark(2, 1) + '|' + self.get_mark(2, 2) + '|')
        print(' +-+-+-+')
        if tie:
            print('\033[1;31mThe game is a tie!\033[0m')  # 引き分けの場合は赤色で表示する

    def get_mark(self, row, col):
        if [row, col] in self.winning_positions:
            # 勝利した場所には緑色で表示する
            return '\033[1;32m' + self.board[row][col] + '\033[0m'
        else:
            return self.board[row][col]

    def get_input(self):
        if self.player == 'X':
            print('Player 1 (X) turn')
        else:
            print('Player 2 (O) turn')
        row = input('Enter row number (1-3): ')
        col = input('Enter column number (1-3): ')
        return row, col

    def place_mark(self, row, col):
        if self.board[int(row)-1][int(col)-1] == ' ':
            self.board[int(row)-1][int(col)-1] = self.player
        else:
            print('That spot is already taken!')
            input('Press enter to continue...')
            return False
        return True

    def check_winner(self):
        for i in range(3):
            if self.board[i][0] == self.board[i][1] == self.board[i][2] != ' ':
                self.winning_positions = [
                    [i, 0], [i, 1], [i, 2]]  # 勝利した場所を記憶する
                self.display_board()
                return True
            if self.board[0][i] == self.board[1][i] == self.board[2][i] != ' ':
                self.winning_positions = [[0, i], [1, i], [2, i]]
                self.display_board()
                print('Player ' + self.player + ' wins!')
                return True
        if self.board[0][0] == self.board[1][1] == self.board[2][2] != ' ':
            self.winning_positions = [[0, 0], [1, 1], [2, 2]]
            self.display_board()
            print('Player ' + self.player + ' wins!')
            return True
        if self.board[0][2] == self.board[1][1] == self.board[2][0] != ' ':
            self.winning_positions = [[0, 2], [1, 1], [2, 0]]
            self.display_board()
            print('Player ' + self.player + ' wins!')
            return True
        return False

    def check_tie(self):
        if all([mark != ' ' for row in self.board for mark in row]):
            self.display_board(tie=True)  # 引き分けの場合はtieをTrueにして呼び出す
            return True
        return False

    def change_player(self):
        if self.player == 'X':
            self.player = 'O'
        else:
            self.player = 'X'

    def play(self):
        while True:
            self.display_board()
            row, col = self.get_input()
            if self.place_mark(row, col):
                if self.check_winner():
                    exit()
                if self.check_tie():
                    exit()
                self.change_player()


class TestTicTacToe(unittest.TestCase):
    def setUp(self):
        self.game = TicTacToe()

    def test_place_mark(self):
        self.assertTrue(self.game.place_mark(1, 1))  # 空いている場所にマークを置けることを確認する
        self.assertFalse(self.game.place_mark(1, 1))  # 既にマークが置かれている場所にはマークを置けないことを確認する

    def test_check_winner(self):
        self.game.board = [['X', 'O', 'X'], [' ', 'O', ' '], [' ', 'O', 'X']]
        self.assertTrue(self.game.check_winner())  # 勝利条件を満たしている場合に勝利することを確認する

    def test_check_tie(self):
        self.game.board = [['X', 'O', 'X'], ['X', 'O', 'O'], ['O', 'X', 'X']]
        self.assertTrue(self.game.check_tie())  # 引き分け条件を満たしている場合に引き分けになることを確認する


if __name__ == '__main__':
    unittest.main()


