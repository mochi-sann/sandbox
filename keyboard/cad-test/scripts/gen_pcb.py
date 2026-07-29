#!/usr/bin/env python3
"""PCB (kb.kicad_pcb) を生成する。

部品を配置してネットを割り当て、基板外形を描くところまで。
実際のトラック配線は route.py が担当する。
"""

import math
import os
import sys

import pcbnew

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import layout as L

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
LIB = os.path.join(ROOT, "kb", "local.pretty")
OUT = os.path.join(ROOT, "kb", "kb.kicad_pcb")

FP_SWITCH = "SW_Hotswap_Kailh_MX_1.00u"
FP_DIODE = "D_SOD-123_HandSolder"
FP_XIAO = "XIAO-RP2040-DIP"

# ダイオードはキー中心の下側に置く。ホットスワップソケットのパッドと穴は
# キー中心から見て上半分 (y<0) に集中しているので、下半分は空いている。
# 親指行だけは上側に置く: 下側を COL ネットの水平レーンの通り道として
# 空けておかないと XIAO へ引き込めない。
DIODE_DY = 5.0
# ソケット本体のコートヤード (B.CrtYd, y=-6.8 まで) に重ならない位置。
THUMB_DIODE_DY = -8.2


def mm(v):
    return pcbnew.FromMM(v)


def vec(x, y):
    return pcbnew.VECTOR2I(mm(x), mm(y))


def add_nets(board, names):
    nets = {}
    for name in sorted(names):
        n = pcbnew.NETINFO_ITEM(board, name)
        board.Add(n)
        nets[name] = n
    return nets


def load_fp(board, name):
    fp = pcbnew.FootprintLoad(LIB, name)
    if fp is None:
        raise RuntimeError(f"フットプリントを読み込めない: {name}")
    board.Add(fp)
    return fp


def place_fp(board, fpname, ref, value, x, y, rot=0.0, flip=False):
    fp = load_fp(board, fpname)
    fp.SetReference(ref)
    fp.SetValue(value)
    fp.SetPosition(vec(x, y))
    if rot:
        fp.SetOrientationDegrees(rot)
    if flip:
        fp.Flip(vec(x, y), pcbnew.FLIP_DIRECTION_TOP_BOTTOM)
    return fp


def assign_nets(board, nets, pad_net_map):
    """(リファレンス, パッド番号) -> ネット名 の表に従って全パッドを結線する。

    XIAO のフットプリントは同じ番号の SMD パッドとスルーホールが対になって
    いるので、番号一致するパッドすべてに同じネットを割り当てる。
    """
    assigned = 0
    unmatched = []
    for fp in board.GetFootprints():
        ref = fp.GetReference()
        for pad in fp.Pads():
            num = pad.GetNumber()
            if not num:
                continue  # 位置決め用の非メッキ穴
            name = pad_net_map.get((ref, num))
            if name is None:
                unmatched.append((ref, num))
                continue
            pad.SetNet(nets[name])
            assigned += 1
    return assigned, unmatched


def add_rounded_outline(board, x0, y0, x1, y1, r):
    """角丸の基板外形を Edge.Cuts に描く。"""
    w = mm(0.1)

    def line(ax, ay, bx, by):
        s = pcbnew.PCB_SHAPE(board)
        s.SetShape(pcbnew.SHAPE_T_SEGMENT)
        s.SetStart(vec(ax, ay))
        s.SetEnd(vec(bx, by))
        s.SetLayer(pcbnew.Edge_Cuts)
        s.SetWidth(w)
        board.Add(s)

    def arc(cx, cy, a_start, a_end):
        s = pcbnew.PCB_SHAPE(board)
        s.SetShape(pcbnew.SHAPE_T_ARC)
        a_mid = (a_start + a_end) / 2.0
        pt = lambda a: (cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
        sx, sy = pt(a_start)
        mx, my = pt(a_mid)
        ex, ey = pt(a_end)
        s.SetArcGeometry(vec(sx, sy), vec(mx, my), vec(ex, ey))
        s.SetLayer(pcbnew.Edge_Cuts)
        s.SetWidth(w)
        board.Add(s)

    line(x0 + r, y0, x1 - r, y0)  # 上
    line(x1, y0 + r, x1, y1 - r)  # 右
    line(x1 - r, y1, x0 + r, y1)  # 下
    line(x0, y1 - r, x0, y0 + r)  # 左
    # Y は下向きが正なので、角の円弧は時計回りの角度で指定する。
    arc(x1 - r, y0 + r, -90, 0)   # 右上
    arc(x1 - r, y1 - r, 0, 90)    # 右下
    arc(x0 + r, y1 - r, 90, 180)  # 左下
    arc(x0 + r, y0 + r, 180, 270)  # 左上


def add_silk_text(board, text, x, y, size=1.5, layer=None, mirror=False):
    t = pcbnew.PCB_TEXT(board)
    t.SetText(text)
    t.SetPosition(vec(x, y))
    t.SetLayer(layer if layer is not None else pcbnew.F_SilkS)
    t.SetTextSize(pcbnew.VECTOR2I(mm(size), mm(size)))
    t.SetTextThickness(mm(size * 0.15))
    if mirror:
        t.SetMirrored(True)
    board.Add(t)


def apply_design_rules(board):
    ds = board.GetDesignSettings()
    ds.SetCopperLayerCount(2)
    ds.m_TrackMinWidth = mm(L.TRACE_WIDTH)
    ds.m_ViasMinSize = mm(L.VIA_DIA)
    ds.m_MinThroughDrill = mm(L.VIA_DRILL)
    ds.m_CopperEdgeClearance = mm(L.EDGE_COPPER_CLEARANCE)
    # ネットクラス既定値（配線時のトラック幅・ビア寸法として使われる）
    nc = board.GetAllNetClasses()["Default"]
    nc.SetTrackWidth(mm(L.TRACE_WIDTH))
    nc.SetClearance(mm(L.CLEARANCE))
    nc.SetViaDiameter(mm(L.VIA_DIA))
    nc.SetViaDrill(mm(L.VIA_DRILL))


def build():
    lay = L.Layout()
    board = pcbnew.CreateEmptyBoard()
    apply_design_rules(board)

    netmap = lay.nets()
    nets = add_nets(board, netmap.keys())
    pad_net_map = {}
    for name, terminals in netmap.items():
        for ref, pad in terminals:
            pad_net_map[(ref, pad)] = name

    # --- スイッチとダイオード ---
    for k in lay.keys:
        place_fp(board, FP_SWITCH, k.ref_sw, "MX_HOTSWAP", k.x, k.y)
        # ダイオードは裏面。ソケットも裏面なので同じ面ではんだ付けできる。
        dy = THUMB_DIODE_DY if k.row == L.THUMB_ROW else DIODE_DY
        place_fp(board, FP_DIODE, k.ref_d, "1N4148W",
                 k.x, k.y + dy, flip=True)

    # --- MCU ---
    ux, uy = lay.xiao
    place_fp(board, FP_XIAO, "U1", "XIAO_RP2040", ux, uy, rot=L.XIAO_ROT)

    assigned, unmatched = assign_nets(board, nets, pad_net_map)

    # --- 基板外形 ---
    bx0, by0, bx1, by1 = lay.board
    add_rounded_outline(board, bx0, by0, bx1, by1, L.BOARD_CORNER_R)

    # --- シルク ---
    add_silk_text(board, "18key test macropad", bx0 + 62.0, by1 - 3.0, 2.0)
    add_silk_text(board, "XIAO RP2040", ux, uy - 11.0, 1.2)

    return board, lay, assigned, unmatched


if __name__ == "__main__":
    board, lay, assigned, unmatched = build()
    board.Save(OUT)
    print(f"書き出し: {os.path.normpath(OUT)}")
    print(f"部品数: {len(list(board.GetFootprints()))}")
    print(f"ネット割り当て済みパッド: {assigned}")
    if unmatched:
        print(f"ネット未割り当てパッド {len(unmatched)} 件: {unmatched[:10]}")
    bx0, by0, bx1, by1 = lay.board
    print(f"基板外形: ({bx0:.2f}, {by0:.2f}) - ({bx1:.2f}, {by1:.2f}) "
          f"= {bx1 - bx0:.2f} x {by1 - by0:.2f} mm")
