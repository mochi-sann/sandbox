# 18キー テストキーボード (kb)

XIAO RP2040 を使った 18 キーの自作キーボード。JLCPCB の 100×100mm 特価枠
(2層 5枚 $2) に収まるよう設計したテスト基板。

- レイアウト: 3行×5列 カラムスタッガー + 親指3キー
- 基板サイズ: **98.25 × 88.20 mm** (JLCPCB $2 枠内)
- マトリクス: 4行×5列、ダイオード COL2ROW (1N4148W, 裏面 SMD)
- スイッチ: Cherry MX 互換 + Kailh ホットスワップソケット (裏面)
- MCU: Seeed XIAO RP2040 (スルーホール実装、USB は基板左端)
- DRC / ERC: エラー 0 (KiCad 10, JLCPCB 2層ルール準拠)

## ファイル構成

| パス | 内容 |
|---|---|
| `kb/kb.kicad_pro` / `kb.kicad_sch` / `kb.kicad_pcb` | KiCad プロジェクト一式 (自己完結) |
| `kb/kb.kicad_sym` / `kb/local.pretty/` | プロジェクト内シンボル/フットプリント |
| `scripts/layout.py` | 単一のレイアウト定義 (キー座標・マトリクス・ピン割り当て) |
| `scripts/gen_sch.py` → `kb.kicad_sch` | 回路図の生成 |
| `scripts/gen_pcb.py` → `kb.kicad_pcb` | 部品配置と基板外形の生成 |
| `scripts/route.py` | 配線 (トラック/ビア) の生成 |
| `scripts/verify_netlist.py` | ネットリストと設計の照合 |
| `scripts/export_gerber.sh` → `out/kb-jlcpcb.zip` | ガーバー出力 |
| `firmware/code.py` | KMK ファームウェア (CircuitPython) |

再生成する場合は `gen_sch.py` → `gen_pcb.py` → `route.py` → `export_gerber.sh` の順。

## JLCPCB 発注手順 (基板のみ・最安構成)

部品は全部自分でハンダ付けするので、JLCPCB には**基板製造だけ**を頼む。

1. https://cart.jlcpcb.com/quote を開く
2. **Add gerber file** に `out/kb-jlcpcb.zip` をアップロード
3. 設定 (基本はデフォルトのままで $2 になる):
   - Layers: 2 / Dimensions: 自動認識 (98.25×88.2mm)
   - PCB Qty: **5**
   - PCB Thickness: 1.6mm / PCB Color: Green (緑以外は+$)
   - Surface Finish: HASL (with lead) ※無鉛にしたければ LeadFree HASL (+$)
   - Outer Copper Weight: 1oz
   - その他オプションはすべてデフォルト
4. **PCB Assembly はオフのまま** (部品実装は頼まない)
5. 配送: OCS NEP / Global Standard Direct 等の最安便を選択
6. 合計: 基板 $2 + 送料 $1.5〜8 程度

## 部品リスト (別途購入、概算)

| 部品 | 数量 | 参考単価 | 入手先の例 |
|---|---|---|---|
| Seeed XIAO RP2040 | 1 | ¥900 | 秋月電子、スイッチサイエンス |
| Kailh ホットスワップソケット (MX用) | 18 | ¥25 | 遊舎工房、TALP KEYBOARD |
| 1N4148W (SOD-123) | 18 | ¥3 | 秋月電子 (100個入 ¥300 など) |
| Cherry MX 互換キースイッチ | 18 | ¥60〜 | 遊舎工房、TALP、Amazon |
| キーキャップ (1U) | 18 | ¥30〜 | 同上 |
| ピンヘッダ 1×7 (2.54mm) | 2 | ¥30 | 秋月電子 |

合計 (スイッチ・キーキャップ込み): **3,500〜5,000 円程度** + 基板代

## 組み立て

1. **裏面**に 1N4148W をハンダ付け。カソード線 (パッケージの帯) を
   シルクの帯マークに合わせる
2. **裏面**にホットスワップソケットをハンダ付け
3. XIAO RP2040 をピンヘッダで表面に実装 (USB コネクタが基板左端を向く)
4. 表からスイッチをソケットに差し込む

## ファームウェア (KMK)

1. XIAO RP2040 の BOOT を押しながら USB 接続 → RPI-RP2 ドライブが出る
2. [CircuitPython の .uf2](https://circuitpython.org/board/seeeduino_xiao_rp2040/) をコピー
3. [KMK](https://github.com/KMKfw/kmk_firmware) の `kmk/` フォルダと
   `firmware/code.py` を CIRCUITPY ドライブにコピー
4. キーマップは `code.py` の `keyboard.keymap` を編集

## ピン割り当て

| 信号 | XIAO ピン | RP2040 GPIO |
|---|---|---|
| COL0〜COL4 | D0〜D4 | GP26, GP27, GP28, GP29, GP6 |
| ROW0〜ROW3 | D5〜D8 | GP7, GP0, GP1, GP2 |

D9, D10 は未使用 (将来の拡張用: ロータリーエンコーダ、LED など)。
