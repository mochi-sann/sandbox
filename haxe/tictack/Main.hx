import haxe.ds.Vector;

class Main {
    static var board:Vector<Int>;
    static var currentPlayer:Int;

    static function main() {
        board = new Vector<Int>(9);
        for (i in 0...9) board[i] = 0;
        currentPlayer = 1;
        printBoard();
        play();
    }

    static function play() {
        while (true) {
            var move = getMove();
            if (move == -1) break;
            makeMove(move);
            printBoard();
            if (checkWin()) {
                trace("Player " + currentPlayer + " wins!");
                break;
            } else if (checkDraw()) {
                trace("Draw game!");
                break;
            }
            currentPlayer = currentPlayer == 1 ? 2 : 1;
        }
    }

    static function getMove():Int {
        var move:Int = -1;
        while (move == -1) {
            trace("Player " + currentPlayer + ", enter your move (0-8): ");
            var input = Sys.stdin().readLine();
            move = Std.parseInt(input);
            if (move == null || move < 0 || move > 8 || board[move] != 0) {
                trace("Invalid move, try again.");
                move = -1;
            }
        }
        return move;
    }

    static function makeMove(move:Int) {
        board[move] = currentPlayer;
    }

    static function printBoard() {
        trace("\n" + board[0] + " | " + board[1] + " | " + board[2]);
        trace("-----------");
        trace(board[3] + " | " + board[4] + " | " + board[5]);
        trace("-----------");
        trace(board[6] + " | " + board[7] + " | " + board[8] + "\n");
    }

    static function checkWin():Bool {
        // 横・縦・斜めのパターンをチェック
        for (i in 0...3) {
            if (board[i * 3] != 0 && board[i * 3] == board[i * 3 + 1] && board[i * 3 + 1] == board[i * 3 + 2])
                return true;
            if (board[i] != 0 && board[i] == board[i + 3] && board[i + 3] == board[i + 6])
                return true;
        }
        if (board[0] != 0 && board[0] == board[4] && board[4] == board[8])
            return true;
        if (board[2] != 0 && board[2] == board[4] && board[4] == board[6])
            return true;
        return false;
    }

    static function checkDraw():Bool {
        for (i in 0...9)
            if (board[i] == 0)
                return false;
        return true;
    }
}
