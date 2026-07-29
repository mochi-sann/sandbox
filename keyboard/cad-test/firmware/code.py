"""KMK ファームウェア (CircuitPython 用)。

セットアップ:
1. XIAO RP2040 に CircuitPython を書き込む
   (BOOT ボタンを押しながら USB 接続 -> RPI-RP2 ドライブに .uf2 をコピー)
2. https://github.com/KMKfw/kmk_firmware から kmk/ フォルダを
   CIRCUITPY ドライブ直下にコピー
3. この code.py を CIRCUITPY 直下に置く
"""

import board

from kmk.kmk_keyboard import KMKKeyboard
from kmk.keys import KC
from kmk.scanners import DiodeOrientation

keyboard = KMKKeyboard()

# 回路図の COL0-4 = D0-D4, ROW0-3 = D5-D8 に対応
keyboard.col_pins = (board.D0, board.D1, board.D2, board.D3, board.D4)
keyboard.row_pins = (board.D5, board.D6, board.D7, board.D8)
# COL -> スイッチ -> ダイオード(アノード->カソード) -> ROW の向き
keyboard.diode_orientation = DiodeOrientation.COL2ROW

# 4行 x 5列。row3 (親指行) は col2-4 の3キーのみで、col0/1 は存在しない。
keyboard.keymap = [
    [
        KC.Q,    KC.W,    KC.E,    KC.R,    KC.T,
        KC.A,    KC.S,    KC.D,    KC.F,    KC.G,
        KC.Z,    KC.X,    KC.C,    KC.V,    KC.B,
        KC.NO,   KC.NO,   KC.LCTL, KC.SPC,  KC.ENT,
    ]
]

if __name__ == "__main__":
    keyboard.go()
