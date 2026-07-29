#!/usr/bin/env bash
# JLCPCB 向けガーバー + ドリルを出力して ZIP にまとめる。
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=out/gerber
rm -rf "$OUT"
mkdir -p "$OUT"

# JLCPCB 推奨設定: Protel 拡張子、原点は絶対座標、X2 属性なしでも可 (KiCad 標準でOK)
kicad-cli pcb export gerbers \
  --output "$OUT" \
  --layers "F.Cu,B.Cu,F.Paste,B.Paste,F.Silkscreen,B.Silkscreen,F.Mask,B.Mask,Edge.Cuts" \
  --use-drill-file-origin \
  kb/kb.kicad_pcb

kicad-cli pcb export drill \
  --output "$OUT/" \
  --format excellon \
  --drill-origin absolute \
  --excellon-units mm \
  --generate-map \
  --map-format gerberx2 \
  kb/kb.kicad_pcb

rm -f out/kb-jlcpcb.zip
(cd "$OUT" && zip -q ../kb-jlcpcb.zip ./*)
echo "生成物:"
ls -la "$OUT"
echo
echo "ZIP: $(pwd)/out/kb-jlcpcb.zip"
