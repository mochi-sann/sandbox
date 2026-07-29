#!/usr/bin/env python3
"""gen_pcb.py が作った基板に手続き的にトラックを引く。

配線方針:
- COL ネット: B.Cu を縦方向。スイッチ pad1 (B.Cu) は同一列で X が揃っている。
  親指クラスタの下 (y=79.7-80.7) の水平レーンで XIAO の THT パッドへ。
  親指行のダイオードをスイッチの上側に置いたのはこのレーンを空けるため。
- ROW ネット: 各ダイオードのカソード脇にビアを置き F.Cu を横方向。
  列ごとのスタッガーは 45 度ジョグで吸収。
  ROW0/1 は基板左端の縦レーン、ROW2 は XIAO の THT 2 列の間 (中間帯)、
  ROW3 は親指行の高さから直接引き込む。
- SW pad2 -> ダイオード アノード: B.Cu。MX の中央ボス穴 (4mm NPTH) の右を
  x=+2.6mm で通す (穴縁との隙間 0.475mm)。

座標はすべて基板から読み取った実パッド位置を基準にする。XIAO まわりの
定数は XIAO-RP2040-DIP のパッド配置 (THT 2 列 y=69.78/85.02、SMD は縦長で
y 67.73-70.16 / 84.64-87.07 の帯) から決めている。
"""

import os
import sys

import pcbnew

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import layout as L

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
PCB = os.path.join(ROOT, "kb", "kb.kicad_pcb")

VIA_OFF = 3.5  # ダイオード中心から ROW ビアまでの X オフセット

# ROW0/1 の XIAO への引き込み。lane_x は基板左端の縦レーン。
ROW_FEED = {
    0: {"lane_x": 1.2, "lane_y": 83.5, "pin": 6},
    1: {"lane_x": 1.8, "lane_y": 82.9, "pin": 7},
}
ROW2_LANE_X = 2.4   # 左端レーン
ROW2_MID_Y = 71.3   # XIAO の THT 上段のすぐ下を横断する
ROW3_FEED_Y = 67.35  # XIAO の SMD 上段のすぐ上を横断する

# COL ネットの下部レーン。列ごとに Y をずらしてすれ違いを防ぐ。
COL_LANE_Y = {0: 79.0, 1: 79.2, 2: 79.7, 3: 80.2, 4: 80.7}

# COL0 だけは XIAO の左列パッドと干渉するため途中で左へ逃がす。
COL0_DODGE_X = 2.6
COL0_DODGE_Y = 66.5


def mm(v):
    return pcbnew.FromMM(v)


def vec(x, y):
    return pcbnew.VECTOR2I(mm(x), mm(y))


class Router:
    def __init__(self, board):
        self.board = board
        self.width = mm(L.TRACE_WIDTH)
        self.count_seg = 0
        self.count_via = 0

    def net(self, name):
        n = self.board.FindNet(name)
        if n is None:
            raise RuntimeError(f"ネットが見つからない: {name}")
        return n

    def seg(self, netname, layer, x1, y1, x2, y2):
        if abs(x1 - x2) < 1e-9 and abs(y1 - y2) < 1e-9:
            return
        t = pcbnew.PCB_TRACK(self.board)
        t.SetStart(vec(x1, y1))
        t.SetEnd(vec(x2, y2))
        t.SetWidth(self.width)
        t.SetLayer(layer)
        t.SetNet(self.net(netname))
        self.board.Add(t)
        self.count_seg += 1

    def polyline(self, netname, layer, pts):
        for a, b in zip(pts, pts[1:]):
            self.seg(netname, layer, a[0], a[1], b[0], b[1])

    def via(self, netname, x, y):
        v = pcbnew.PCB_VIA(self.board)
        v.SetPosition(vec(x, y))
        v.SetWidth(mm(L.VIA_DIA))
        v.SetDrill(mm(L.VIA_DRILL))
        v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu)
        v.SetNet(self.net(netname))
        self.board.Add(v)
        self.count_via += 1


def pad_pos(board, ref, num, tht=False):
    """リファレンスとパッド番号から絶対座標(mm)を返す。

    XIAO は同番号で SMD と THT の両方があるので tht=True でスルーホール側を選ぶ。
    """
    fp = board.FindFootprintByReference(ref)
    for pad in fp.Pads():
        if pad.GetNumber() != num:
            continue
        is_tht = pad.GetDrillSize().x > 0
        if tht and not is_tht:
            continue
        p = pad.GetPosition()
        return (pcbnew.ToMM(p.x), pcbnew.ToMM(p.y))
    raise RuntimeError(f"パッドが見つからない: {ref}.{num} (tht={tht})")


def route(board):
    lay = L.Layout()
    r = Router(board)
    B, F = pcbnew.B_Cu, pcbnew.F_Cu

    keys_by_rc = {(k.row, k.col): k for k in lay.keys}
    centers = {}
    for k in lay.keys:
        p = board.FindFootprintByReference(k.ref_sw).GetPosition()
        centers[k.index] = (pcbnew.ToMM(p.x), pcbnew.ToMM(p.y))

    # --- 1. スイッチ pad2 -> ダイオード アノード (B.Cu) ---
    for k in lay.keys:
        kx, ky = centers[k.index]
        sw2 = pad_pos(board, k.ref_sw, "2")
        da = pad_pos(board, k.ref_d, "2")
        if k.row == L.THUMB_ROW:
            # ダイオードは上側 (ky-7.8)。45度で上がって横から入る。
            rise = sw2[1] - da[1]
            r.polyline(k.net_mid, B, [
                sw2,
                (sw2[0] - rise, da[1]),
                da,
            ])
        else:
            # ダイオードは下側 (ky+5)。中央ボス穴の右 x=+2.6 を通って下りる。
            jx = kx + 2.6
            r.polyline(k.net_mid, B, [
                sw2,
                (jx, sw2[1] + (sw2[0] - jx)),  # 45度で左下へ
                (jx, da[1] - (jx - da[0])),    # 縦に下りる
                da,                            # 45度でアノードへ
            ])

    # --- 2. ダイオード カソード -> ROW ビア (B.Cu) + ビア ---
    via_at = {}
    for k in lay.keys:
        kx, ky = centers[k.index]
        dk = pad_pos(board, k.ref_d, "1")
        v = (kx - VIA_OFF, dk[1])
        r.seg(k.net_row, B, dk[0], dk[1], v[0], v[1])
        r.via(k.net_row, v[0], v[1])
        via_at[k.index] = v

    # --- 3. ROW を F.Cu で横につなぐ (45度ジョグでスタッガー吸収) ---
    for row in range(4):
        cols = sorted(c for (rr, c) in keys_by_rc if rr == row)
        for c1, c2 in zip(cols, cols[1:]):
            a = via_at[keys_by_rc[(row, c1)].index]
            b = via_at[keys_by_rc[(row, c2)].index]
            dy = b[1] - a[1]
            if abs(dy) < 1e-9:
                r.seg(f"ROW{row}", F, a[0], a[1], b[0], b[1])
            else:
                r.polyline(f"ROW{row}", F, [
                    a,
                    (b[0] - abs(dy), a[1]),
                    b,
                ])

    # --- 4. ROW -> XIAO (F.Cu) ---
    # ROW0/1: 左端レーンで下り、XIAO の下段 THT ピンへ
    for row in (0, 1):
        feed = ROW_FEED[row]
        left = via_at[keys_by_rc[(row, 0)].index]
        pin = pad_pos(board, "U1", str(feed["pin"]), tht=True)
        r.polyline(f"ROW{row}", F, [
            left,
            (feed["lane_x"], left[1]),
            (feed["lane_x"], feed["lane_y"]),
            (pin[0], feed["lane_y"]),
            pin,
        ])

    # ROW2: 左端レーン -> THT 2 列の中間帯を横断 -> pin8 に下から入る
    left = via_at[keys_by_rc[(2, 0)].index]
    pin8 = pad_pos(board, "U1", str(L.ROW_TO_PIN[2]), tht=True)
    r.polyline("ROW2", F, [
        left,
        (ROW2_LANE_X, left[1]),
        (ROW2_LANE_X, ROW2_MID_Y),
        (pin8[0], ROW2_MID_Y),
        pin8,
    ])

    # ROW3: 親指ダイオードの高さから 45 度で上がり、SMD 帯の上を通って
    # pin9 に上から入る
    left = via_at[keys_by_rc[(3, 2)].index]
    pin9 = pad_pos(board, "U1", str(L.ROW_TO_PIN[3]), tht=True)
    rise = left[1] - ROW3_FEED_Y
    r.polyline("ROW3", F, [
        left,
        (left[0] - rise, ROW3_FEED_Y),
        (pin9[0], ROW3_FEED_Y),
        pin9,
    ])

    # --- 5. COL を B.Cu で縦につなぐ ---
    for col in range(5):
        rows = sorted(rr for (rr, c) in keys_by_rc if c == col)
        pads = [pad_pos(board, keys_by_rc[(rr, col)].ref_sw, "1") for rr in rows]
        for a, b in zip(pads, pads[1:]):
            r.seg(f"COL{col}", B, a[0], a[1], b[0], b[1])

    # --- 6. COL -> XIAO (B.Cu、親指行の下のレーン経由) ---
    for col in range(5):
        rows = sorted(rr for (rr, c) in keys_by_rc if c == col)
        bottom = pad_pos(board, keys_by_rc[(rows[-1], col)].ref_sw, "1")
        pin = pad_pos(board, "U1", str(L.COL_TO_PIN[col]), tht=True)
        lane_y = COL_LANE_Y[col]
        if col == 0:
            # XIAO 左列のパッドを避けるため左に逃がす
            dx = bottom[0] - COL0_DODGE_X
            r.polyline("COL0", B, [
                bottom,
                (bottom[0], COL0_DODGE_Y - dx),
                (COL0_DODGE_X, COL0_DODGE_Y),
                (COL0_DODGE_X, lane_y),
                (pin[0], lane_y),
                pin,
            ])
        else:
            r.polyline(f"COL{col}", B, [
                bottom,
                (bottom[0], lane_y),
                (pin[0], lane_y),
                pin,
            ])

    return r


if __name__ == "__main__":
    board = pcbnew.LoadBoard(PCB)
    # 再実行できるよう既存のトラックとビアを消してから引き直す
    for t in list(board.GetTracks()):
        board.Remove(t)
    r = route(board)
    board.Save(PCB)
    print(f"配線完了: セグメント {r.count_seg} 本、ビア {r.count_via} 個")
