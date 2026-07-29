#!/usr/bin/env python3
"""回路図 (kb.kicad_sch) を生成する。

KiCad 公式ライブラリに依存しないよう、使うシンボルは lib_symbols として
ファイル内に埋め込む。結線はピンから引いた短いワイヤーとネットラベルで行う。
"""

import hashlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import layout as L

KBDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "kb")
OUT = os.path.join(KBDIR, "kb.kicad_sch")
OUT_SYM = os.path.join(KBDIR, "kb.kicad_sym")

PAPER = "A3"  # 420 x 297 mm
SHEET_UUID = "b0a70000-0000-4000-8000-000000000000"

# 回路図上のキー1個ぶんの枠。4列に並べる。
# ERC の endpoint_off_grid を避けるため、全座標を 1.27mm グリッドの倍数にする。
G = 1.27
GRID_COLS = 4
GRID_X0, GRID_Y0 = 20 * G, 24 * G  # 25.40, 30.48
GRID_DX, GRID_DY = 62 * G, 25 * G  # 78.74, 31.75
SW_TO_D = 31 * G  # 39.37 — スイッチとダイオードの間隔
STUB = 6 * G  # 7.62 — ピンから引き出すワイヤーの長さ

XIAO_AT = (75 * G, 170 * G)  # 95.25, 215.90


def uid(key):
    """再実行しても同じファイルになるよう、名前から決定的に UUID を作る。"""
    h = hashlib.md5(key.encode()).hexdigest()
    return f"{h[0:8]}-{h[8:12]}-4{h[13:16]}-8{h[17:20]}-{h[20:32]}"


# ---- シンボル定義 ---------------------------------------------------------

def sym_diode():
    """ダイオード。pin2=アノード(左) → pin1=カソード(右) の向きで描く。

    フットプリント D_SOD-123_HandSolder の pad1 がカソード側マークと一致する。
    """
    return """	(symbol "kb:D"
			(pin_numbers (hide yes))
			(pin_names (offset 1.016) (hide yes))
			(exclude_from_sim no)
			(in_bom yes)
			(on_board yes)
			(property "Reference" "D" (at 0 2.54 0) (effects (font (size 1.27 1.27))))
			(property "Value" "1N4148W" (at 0 -2.54 0) (effects (font (size 1.27 1.27))))
			(property "Footprint" "kb:D_SOD-123_HandSolder" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes)))
			(property "Datasheet" "" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes)))
			(property "Description" "マトリクス用スイッチングダイオード" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes)))
			(symbol "D_0_1"
				(polyline (pts (xy 1.27 1.27) (xy 1.27 -1.27)) (stroke (width 0.254) (type default)) (fill (type none)))
				(polyline (pts (xy -1.27 1.27) (xy -1.27 -1.27) (xy 1.27 0) (xy -1.27 1.27)) (stroke (width 0.254) (type default)) (fill (type none)))
			)
			(symbol "D_1_1"
				(pin passive line (at 3.81 0 180) (length 2.54) (name "K" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
				(pin passive line (at -3.81 0 0) (length 2.54) (name "A" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
			)
		)
"""


def sym_switch():
    """Kailh ホットスワップソケットに挿さる MX キースイッチ。極性なしの 2 端子。"""
    return """	(symbol "kb:SW_Hotswap"
			(pin_numbers (hide yes))
			(pin_names (offset 1.016) (hide yes))
			(exclude_from_sim no)
			(in_bom yes)
			(on_board yes)
			(property "Reference" "SW" (at 0 3.81 0) (effects (font (size 1.27 1.27))))
			(property "Value" "MX_HOTSWAP" (at 0 -3.81 0) (effects (font (size 1.27 1.27))))
			(property "Footprint" "kb:SW_Hotswap_Kailh_MX_1.00u" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes)))
			(property "Datasheet" "" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes)))
			(property "Description" "MXキースイッチ + Kailhホットスワップソケット" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes)))
			(symbol "SW_Hotswap_0_1"
				(circle (center -2.032 0) (radius 0.508) (stroke (width 0.254) (type default)) (fill (type none)))
				(circle (center 2.032 0) (radius 0.508) (stroke (width 0.254) (type default)) (fill (type none)))
				(polyline (pts (xy -1.524 0.254) (xy 1.778 1.778)) (stroke (width 0.254) (type default)) (fill (type none)))
			)
			(symbol "SW_Hotswap_1_1"
				(pin passive line (at -5.08 0 0) (length 2.54) (name "1" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
				(pin passive line (at 5.08 0 180) (length 2.54) (name "2" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
			)
		)
"""


# XIAO のシンボルは左に pin1-7、右に pin14-8 を置く（DIP と同じ反時計回り）。
XIAO_PIN_Y = [7.62, 5.08, 2.54, 0.0, -2.54, -5.08, -7.62]
XIAO_PIN_NAMES = {
    1: "D0/GP26", 2: "D1/GP27", 3: "D2/GP28", 4: "D3/GP29",
    5: "D4/GP6", 6: "D5/GP7", 7: "D6/GP0", 8: "D7/GP1",
    9: "D8/GP2", 10: "D9/GP4", 11: "D10/GP3",
    12: "3V3", 13: "GND", 14: "5V",
}
XIAO_PIN_TYPE = {12: "power_out", 13: "power_out", 14: "power_out"}


def xiao_pin_pos(pin):
    """シンボル座標系（Y は上が正）でのピン端点を返す。"""
    if pin <= 7:
        return (-17.78, XIAO_PIN_Y[pin - 1], 0)
    return (17.78, XIAO_PIN_Y[14 - pin], 180)


def sym_xiao():
    out = ['	(symbol "kb:XIAO_RP2040"\n'
           '			(pin_names (offset 0.254))\n'
           '			(exclude_from_sim no)\n'
           '			(in_bom yes)\n'
           '			(on_board yes)\n'
           '			(property "Reference" "U" (at 0 12.7 0) (effects (font (size 1.27 1.27))))\n'
           '			(property "Value" "XIAO_RP2040" (at 0 -12.7 0) (effects (font (size 1.27 1.27))))\n'
           '			(property "Footprint" "kb:XIAO-RP2040-DIP" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes)))\n'
           '			(property "Datasheet" "https://wiki.seeedstudio.com/XIAO-RP2040/" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes)))\n'
           '			(property "Description" "Seeed XIAO RP2040 マイコンモジュール" (at 0 0 0) (effects (font (size 1.27 1.27)) (hide yes)))\n'
           '			(symbol "XIAO_RP2040_0_1"\n'
           '				(rectangle (start -12.7 10.16) (end 12.7 -10.16) (stroke (width 0.254) (type default)) (fill (type background)))\n'
           '			)\n'
           '			(symbol "XIAO_RP2040_1_1"\n']
    for pin in range(1, 15):
        px, py, rot = xiao_pin_pos(pin)
        ptype = XIAO_PIN_TYPE.get(pin, "bidirectional")
        name = XIAO_PIN_NAMES[pin]
        out.append(
            f'				(pin {ptype} line (at {px} {py} {rot}) (length 5.08) '
            f'(name "{name}" (effects (font (size 1.27 1.27)))) '
            f'(number "{pin}" (effects (font (size 1.27 1.27)))))\n'
        )
    out.append("			)\n		)\n")
    return "".join(out)


# ---- 回路図要素 -----------------------------------------------------------

def wire(x1, y1, x2, y2, key):
    return (f'	(wire (pts (xy {x1:.2f} {y1:.2f}) (xy {x2:.2f} {y2:.2f})) '
            f'(stroke (width 0) (type default)) (uuid "{uid("w" + key)}"))\n')


def label(text, x, y, key, justify="left"):
    return (f'	(label "{text}" (at {x:.2f} {y:.2f} 0) '
            f'(effects (font (size 1.27 1.27)) (justify {justify} bottom)) '
            f'(uuid "{uid("l" + key)}"))\n')


def no_connect(x, y, key):
    return f'	(no_connect (at {x:.2f} {y:.2f}) (uuid "{uid("nc" + key)}"))\n'


def place(lib_id, ref, value, footprint, x, y, key, extra_props=()):
    u = uid("s" + key)
    props = [
        f'		(property "Reference" "{ref}" (at {x:.2f} {y - 6.35:.2f} 0) (effects (font (size 1.27 1.27))))\n',
        f'		(property "Value" "{value}" (at {x:.2f} {y + 6.35:.2f} 0) (effects (font (size 1.27 1.27))))\n',
        f'		(property "Footprint" "{footprint}" (at {x:.2f} {y:.2f} 0) (effects (font (size 1.27 1.27)) (hide yes)))\n',
    ]
    for pname, pval in extra_props:
        props.append(
            f'		(property "{pname}" "{pval}" (at {x:.2f} {y:.2f} 0) '
            f'(effects (font (size 1.27 1.27)) (hide yes)))\n'
        )
    return (
        f'	(symbol\n'
        f'		(lib_id "{lib_id}")\n'
        f'		(at {x:.2f} {y:.2f} 0)\n'
        f'		(unit 1)\n'
        f'		(exclude_from_sim no)\n'
        f'		(in_bom yes)\n'
        f'		(on_board yes)\n'
        f'		(dnp no)\n'
        f'		(uuid "{u}")\n'
        + "".join(props) +
        f'		(instances\n'
        f'			(project "kb"\n'
        f'				(path "/{SHEET_UUID}" (reference "{ref}") (unit 1))\n'
        f'			)\n'
        f'		)\n'
        f'	)\n'
    )


def build():
    lay = L.Layout()
    body = []

    # --- キー1個ぶんの回路を格子状に並べる ---
    for i, k in enumerate(lay.keys):
        gx = GRID_X0 + (i % GRID_COLS) * GRID_DX
        gy = GRID_Y0 + (i // GRID_COLS) * GRID_DY
        dx = gx + SW_TO_D

        body.append(place("kb:SW_Hotswap", k.ref_sw, "MX_HOTSWAP",
                          "kb:SW_Hotswap_Kailh_MX_1.00u", gx, gy, k.ref_sw))
        body.append(place("kb:D", k.ref_d, "1N4148W",
                          "kb:D_SOD-123_HandSolder", dx, gy, k.ref_d))

        # スイッチ pin1 -> COL
        body.append(wire(gx - 5.08, gy, gx - 5.08 - STUB, gy, f"col{i}"))
        body.append(label(k.net_col, gx - 5.08 - STUB, gy, f"col{i}", "right"))

        # スイッチ pin2 -> ダイオード アノード(pin2)
        body.append(wire(gx + 5.08, gy, dx - 3.81, gy, f"mid{i}"))
        body.append(label(k.net_mid, (gx + 5.08 + dx - 3.81) / 2, gy, f"mid{i}"))

        # ダイオード カソード(pin1) -> ROW
        body.append(wire(dx + 3.81, gy, dx + 3.81 + STUB, gy, f"row{i}"))
        body.append(label(k.net_row, dx + 3.81 + STUB, gy, f"row{i}"))

    # --- XIAO ---
    ux, uy = XIAO_AT
    body.append(place("kb:XIAO_RP2040", "U1", "XIAO_RP2040", "kb:XIAO-RP2040-DIP",
                      ux, uy, "U1"))

    pin_net = {}
    for col, pin in L.COL_TO_PIN.items():
        pin_net[pin] = f"COL{col}"
    for row, pin in L.ROW_TO_PIN.items():
        pin_net[pin] = f"ROW{row}"
    pin_net[13] = "GND"

    for pin in range(1, 15):
        px, py, rot = xiao_pin_pos(pin)
        # シンボル座標は Y が上向き正、回路図は下向き正なので符号を反転する。
        ax, ay = ux + px, uy - py
        if pin in pin_net:
            sx = -STUB if rot == 0 else STUB
            body.append(wire(ax, ay, ax + sx, ay, f"u1p{pin}"))
            body.append(label(pin_net[pin], ax + sx, ay, f"u1p{pin}",
                              "right" if rot == 0 else "left"))
        else:
            body.append(no_connect(ax, ay, f"u1p{pin}"))

    head = (
        '(kicad_sch\n'
        '	(version 20231120)\n'
        '	(generator "gen_sch.py")\n'
        '	(generator_version "10.0")\n'
        f'	(uuid "{SHEET_UUID}")\n'
        f'	(paper "{PAPER}")\n'
        '	(title_block\n'
        '		(title "18キー 自作キーボード (テスト基板)")\n'
        '		(rev "v1")\n'
        '		(comment 1 "XIAO RP2040 / Kailh MX ホットスワップ / 4行x5列マトリクス")\n'
        '	)\n'
        '	(lib_symbols\n'
        + sym_diode() + sym_switch() + sym_xiao() +
        '	)\n'
    )
    tail = (
        '	(sheet_instances\n'
        '		(path "/" (page "1"))\n'
        '	)\n'
        '	(embedded_fonts no)\n'
        ')\n'
    )
    return head + "".join(body) + tail


def build_symbol_lib():
    """回路図に埋め込んだのと同じシンボルを独立ライブラリとしても書き出す。

    これが無いと ERC が lib_symbol_issues（ライブラリ側と照合できない）を出す。
    ライブラリ内ではシンボル名に "kb:" を付けないので、その部分だけ差し替える。
    """
    body = sym_diode() + sym_switch() + sym_xiao()
    for name in ("D", "SW_Hotswap", "XIAO_RP2040"):
        body = body.replace(f'(symbol "kb:{name}"', f'(symbol "{name}"')
    return (
        '(kicad_symbol_lib\n'
        '	(version 20231120)\n'
        '	(generator "gen_sch.py")\n'
        '	(generator_version "10.0")\n'
        + body +
        ')\n'
    )


if __name__ == "__main__":
    text = build()
    with open(OUT, "w") as f:
        f.write(text)
    print(f"書き出し: {os.path.normpath(OUT)} ({len(text)} バイト)")

    lib = build_symbol_lib()
    with open(OUT_SYM, "w") as f:
        f.write(lib)
    print(f"書き出し: {os.path.normpath(OUT_SYM)} ({len(lib)} バイト)")
