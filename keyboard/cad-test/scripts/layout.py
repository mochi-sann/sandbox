"""キーボードのレイアウト定義。

回路図生成・PCB生成・配線スクリプトが共通で参照する唯一のソース。
座標系は KiCad の PCB と同じで、X が右、Y が下を正とする mm 単位。
"""

# ---- 基本寸法 -------------------------------------------------------------

KEY_PITCH = 19.05  # Cherry MX 1U ピッチ
KEY_SIZE = 19.05  # キー1個が占める外形（干渉判定と基板外形に使う）

# 列ごとの縦オフセット。指の長さに合わせて中指列(col2)を最も奥に置く。
# 正の値が手前（下）方向。
COL_OFFSET = [9.0, 3.0, 0.0, 2.0, 7.0]

N_COLS = 5
N_ROWS_MAIN = 3  # メインブロックの行数
THUMB_ROW = 3  # 親指クラスタはマトリクス上 row3 として扱う
THUMB_COLS = [2, 3, 4]  # 親指キーが使う列
# 親指クラスタは本来もう少し内側に寄せたいが、右にずらすと基板幅が
# JLCPCB の 100mm 枠を超えてしまうためシフトなしで真下に置く。
THUMB_X_SHIFT = 0.0
THUMB_Y_GAP = 2.0  # 最下段と親指クラスタの間隔

BOARD_MARGIN = 1.5  # キー外形から基板端までの余白
BOARD_CORNER_R = 3.0  # 基板の角丸半径

# ---- 製造ルール（JLCPCB 2層基板）----------------------------------------
# JLCPCB の下限は線幅/間隔 0.127mm、ビア 0.45/0.2mm。歩留まりと手はんだの
# しやすさを考えて、いずれも下限より十分に余裕のある値を使う。
TRACE_WIDTH = 0.25
CLEARANCE = 0.2
VIA_DIA = 0.6
VIA_DRILL = 0.3
EDGE_COPPER_CLEARANCE = 0.5

# ---- MCU (Seeed XIAO RP2040) ----------------------------------------------

# フットプリント XIAO-RP2040-DIP は標準の向きで USB が +X 側を向く。
# 基板の左端に USB を出したいので 180 度回転させて配置する。
XIAO_ROT = 180.0
XIAO_BODY_W = 21.0  # USB 方向（回転後も X 方向）
XIAO_BODY_H = 17.5
XIAO_KEY_GAP = 1.0  # 上にあるキー外形との隙間

# XIAO の物理ピン番号 -> 信号名。フットプリントのパッド名は 1..14。
XIAO_PINS = {
    1: "D0",
    2: "D1",
    3: "D2",
    4: "D3",
    5: "D4",
    6: "D5",
    7: "D6",
    8: "D7",
    9: "D8",
    10: "D9",
    11: "D10",
    12: "3V3",
    13: "GND",
    14: "5V",
}

# マトリクスの信号を XIAO のどの物理ピンに繋ぐか。
# COL0-4 -> D0-D4, ROW0-3 -> D5-D8。D9/D10 は将来の拡張用に空けてある。
COL_TO_PIN = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5}
ROW_TO_PIN = {0: 6, 1: 7, 2: 8, 3: 9}

# XIAO の各信号が対応する RP2040 の GPIO 番号（ファームウェア設定用）。
XIAO_GPIO = {
    "D0": 26,
    "D1": 27,
    "D2": 28,
    "D3": 29,
    "D4": 6,
    "D5": 7,
    "D6": 0,
    "D7": 1,
    "D8": 2,
    "D9": 4,
    "D10": 3,
}


class Key:
    """キー1個ぶんの配置とマトリクス上の位置。"""

    def __init__(self, index, row, col, x, y):
        self.index = index  # 1 始まりの通し番号（SW1, D1 …）
        self.row = row
        self.col = col
        self.x = x
        self.y = y

    @property
    def ref_sw(self):
        return f"SW{self.index}"

    @property
    def ref_d(self):
        return f"D{self.index}"

    @property
    def net_col(self):
        return f"COL{self.col}"

    @property
    def net_row(self):
        return f"ROW{self.row}"

    @property
    def net_mid(self):
        """スイッチとダイオードを繋ぐ中間ネット。"""
        return f"SW_D{self.index}"

    def __repr__(self):
        return f"Key({self.ref_sw} r{self.row}c{self.col} @ {self.x:.2f},{self.y:.2f})"


def build_keys():
    """全キーを配置順に生成する。座標はまだ正規化前のローカル系。"""
    keys = []
    idx = 1
    for row in range(N_ROWS_MAIN):
        for col in range(N_COLS):
            x = col * KEY_PITCH
            y = COL_OFFSET[col] + row * KEY_PITCH
            keys.append(Key(idx, row, col, x, y))
            idx += 1

    # 親指クラスタは水平一列。使う列の中で最も下がっている列を基準にしないと
    # その列の最下段キーと重なる (col4 はオフセットが大きい)。
    thumb_y = (max(COL_OFFSET[c] for c in THUMB_COLS)
               + N_ROWS_MAIN * KEY_PITCH + THUMB_Y_GAP)
    for col in THUMB_COLS:
        x = col * KEY_PITCH + THUMB_X_SHIFT
        keys.append(Key(idx, THUMB_ROW, col, x, thumb_y))
        idx += 1

    return keys


def key_extent(keys):
    """キー外形だけの bounding box を返す。"""
    half = KEY_SIZE / 2
    return (
        min(k.x for k in keys) - half,
        min(k.y for k in keys) - half,
        max(k.x for k in keys) + half,
        max(k.y for k in keys) + half,
    )


def place_xiao(keys):
    """XIAO を親指クラスタ左の空きスペースに置く。中心座標を返す。

    メインブロック左端の列(col0)の最下段キーより下、かつ基板左端寄りに置く。
    """
    kx0, _, _, _ = key_extent(keys)
    # col0 の最下段キーの下端
    col0_bottom = max(k.y for k in keys if k.col == 0) + KEY_SIZE / 2
    # XIAO の左端をキー外形の左端に揃える。基板端との隙間は BOARD_MARGIN が担う。
    cx = kx0 + XIAO_BODY_W / 2
    cy = col0_bottom + XIAO_KEY_GAP + XIAO_BODY_H / 2
    return cx, cy


def board_extent(keys, xiao_xy):
    """キーと XIAO を囲む基板外形の bounding box を返す。"""
    kx0, ky0, kx1, ky1 = key_extent(keys)
    cx, cy = xiao_xy
    x0 = min(kx0, cx - XIAO_BODY_W / 2)
    y0 = min(ky0, cy - XIAO_BODY_H / 2)
    x1 = max(kx1, cx + XIAO_BODY_W / 2)
    y1 = max(ky1, cy + XIAO_BODY_H / 2)
    return (
        x0 - BOARD_MARGIN,
        y0 - BOARD_MARGIN,
        x1 + BOARD_MARGIN,
        y1 + BOARD_MARGIN,
    )


class Layout:
    """正規化済みの最終レイアウト。基板左上が原点 (0,0) になるよう平行移動する。"""

    def __init__(self, origin_x=0.0, origin_y=0.0):
        keys = build_keys()
        xiao = place_xiao(keys)
        x0, y0, x1, y1 = board_extent(keys, xiao)

        # 基板左上が (origin_x, origin_y) に来るようシフトする。
        dx = origin_x - x0
        dy = origin_y - y0
        for k in keys:
            k.x += dx
            k.y += dy

        self.keys = keys
        self.xiao = (xiao[0] + dx, xiao[1] + dy)
        self.board = (origin_x, origin_y, x1 + dx, y1 + dy)
        self.width = x1 - x0
        self.height = y1 - y0

    def nets(self):
        """ネット名 -> [(リファレンス, パッド名), …] の対応表を返す。

        ダイオードは pad1=カソード / pad2=アノードなので、
        COL -> スイッチ -> ダイオードのアノード -> カソード -> ROW となり
        QMK でいう COL2ROW 方向になる。
        """
        nets = {}

        def add(net, ref, pad):
            nets.setdefault(net, []).append((ref, pad))

        for k in self.keys:
            add(k.net_col, k.ref_sw, "1")
            add(k.net_mid, k.ref_sw, "2")
            add(k.net_mid, k.ref_d, "2")
            add(k.net_row, k.ref_d, "1")

        for col, pin in COL_TO_PIN.items():
            add(f"COL{col}", "U1", str(pin))
        for row, pin in ROW_TO_PIN.items():
            add(f"ROW{row}", "U1", str(pin))

        add("GND", "U1", str(13))
        return nets


if __name__ == "__main__":
    lay = Layout()
    print(f"キー数: {len(lay.keys)}")
    for k in lay.keys:
        print(f"  {k}")
    print(f"XIAO 中心: ({lay.xiao[0]:.2f}, {lay.xiao[1]:.2f}) 回転 {XIAO_ROT}deg")
    print(f"基板サイズ: {lay.width:.2f} x {lay.height:.2f} mm")
    limit_ok = lay.width <= 100.0 and lay.height <= 100.0
    print(f"JLCPCB 100x100mm 枠: {'OK' if limit_ok else 'NG'}")

    nets = lay.nets()
    print(f"ネット数: {len(nets)}")
    for name in sorted(nets):
        print(f"  {name}: {len(nets[name])} 端子")
