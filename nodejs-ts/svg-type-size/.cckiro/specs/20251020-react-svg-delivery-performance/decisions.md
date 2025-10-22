---
title: decisions
spec: 20251020-react-svg-delivery-performance
status: draft
phase: decision
---

| 日時 | 決定ID | 決定内容 | 根拠 | 影響 |
| --- | --- | --- | --- | --- |
| 2025-10-22T14:11:27+09:00 | DEC-001 | Vite + React + vite-plugin-svgr + rollup-plugin-visualizer を採用し、手法ごとに manualChunks を設定する | React 環境での高速セットアップと手法別バンドルサイズを明確化するため | ビルド/測定スクリプトが chunk 名に依存して集計 |
