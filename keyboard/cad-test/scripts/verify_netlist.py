#!/usr/bin/env python3
"""kicad-cli が出力したネットリストを layout.py の設計と突き合わせる。

回路図のワイヤーやラベルの座標がわずかにずれていても KiCad はエラーを出さず、
ただネットが分断されるだけなので、ネット単位で機械的に照合する。
"""

import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import layout as L

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SCH = os.path.join(ROOT, "kb", "kb.kicad_sch")


def export_netlist():
    tmp = tempfile.NamedTemporaryFile(suffix=".net", delete=False)
    tmp.close()
    subprocess.run(
        ["kicad-cli", "sch", "export", "netlist", "--output", tmp.name, SCH],
        check=True, capture_output=True,
    )
    with open(tmp.name) as f:
        text = f.read()
    os.unlink(tmp.name)
    return text


def parse_nets(text):
    """(net ... (node (ref ..) (pin ..)) ...) を {ネット名: {(ref, pin)}} に変換する。

    kicad-cli の出力は要素ごとに改行が入り、ルートシートのネット名には
    "/" が前置されるので、どちらも吸収する。
    """
    nets = {}
    section = text[text.find("(nets"):]
    for chunk in re.split(r"\(net\b", section)[1:]:
        m = re.search(r'\(name "([^"]*)"\)', chunk)
        if not m:
            continue
        name = m.group(1).lstrip("/")
        nodes = {
            (n.group(1), n.group(2))
            for n in re.finditer(r'\(ref "([^"]+)"\)\s*\(pin "([^"]+)"\)', chunk)
        }
        nets[name] = nodes
    return nets


def main():
    lay = L.Layout()
    expected = {name: set(nodes) for name, nodes in lay.nets().items()}
    actual = parse_nets(export_netlist())

    # KiCad は名前のないネットに Net-(...) 形式の名前を振る。設計側は全ネットに
    # 名前を付けているので、その形式が残っていたら結線漏れを疑う。
    unnamed = [n for n in actual if n.startswith("Net-") or n.startswith("unconnected-")]

    errors = []
    for name, want in sorted(expected.items()):
        got = actual.get(name)
        if got is None:
            errors.append(f"ネット {name} が存在しない")
            continue
        if got != want:
            missing = want - got
            extra = got - want
            detail = []
            if missing:
                detail.append(f"不足 {sorted(missing)}")
            if extra:
                detail.append(f"余分 {sorted(extra)}")
            errors.append(f"ネット {name}: " + " / ".join(detail))

    print(f"期待ネット数: {len(expected)}  実際のネット数: {len(actual)}")
    total_pins = sum(len(v) for v in expected.values())
    print(f"期待端子数: {total_pins}")

    if unnamed:
        print(f"\n自動命名された未接続ネット {len(unnamed)} 件:")
        for n in unnamed[:10]:
            print(f"  {n}: {sorted(actual[n])}")

    if errors:
        print(f"\n不一致 {len(errors)} 件:")
        for e in errors[:20]:
            print(f"  NG {e}")
        return 1

    print("\nOK すべてのネットが設計どおりに結線されている")
    return 0


if __name__ == "__main__":
    sys.exit(main())
