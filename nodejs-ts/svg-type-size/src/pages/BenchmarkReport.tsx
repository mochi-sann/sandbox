import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type MethodSummary = {
  id: string;
  label: string;
  bundleBytes: number;
  assetBytes: number;
  totalBytes: number;
  averageBytesPerSvg: number;
  svgCount: number;
  renderCount: number;
  deltaToBaseline: number;
};

type RunSummary = {
  runId: string;
  totalBytes: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

type BenchmarkSummary = {
  generatedAt: string;
  renderCount: number;
  svgCount: number;
  methods: MethodSummary[];
  runs: RunSummary[];
  anomaly?: {
    detected: boolean;
    threshold: number;
    variance: number;
  };
};

const REPORT_PATH = '/reports/latest/size-summary.json';

const numberFormatter = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 });

const createCsv = (summary: BenchmarkSummary) => {
  const headers = [
    'method',
    'bundleBytes',
    'assetBytes',
    'totalBytes',
    'averageBytesPerSvg',
    'deltaToBaseline'
  ];
  const rows = summary.methods.map((method) =>
    [
      method.label,
      method.bundleBytes,
      method.assetBytes,
      method.totalBytes,
      method.averageBytesPerSvg,
      method.deltaToBaseline
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

const downloadBlob = (content: string, mime: string, filename: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const BenchmarkReport = () => {
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(REPORT_PATH, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`レポート取得に失敗しました: ${response.status}`);
        }
        return response.json();
      })
      .then((data: BenchmarkSummary) => {
        setSummary(data);
      })
      .catch((err: Error) => {
        setError(err.message);
      });
  }, []);

  const baselineLabel = useMemo(() => summary?.methods[0]?.label ?? 'インライン JSX', [summary]);

  return (
    <div className="page">
      <header className="section-card">
        <h1>測定レポート</h1>
        <p>
          <Link to="/benchmark">ベンチマークページ</Link> に戻って別の条件で実行できます。
        </p>
        <div className="button-row">
          <button
            type="button"
            onClick={() => summary && downloadBlob(JSON.stringify(summary, null, 2), 'application/json', 'size-summary.json')}
          >
            JSON をダウンロード
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => summary && downloadBlob(createCsv(summary), 'text/csv', 'size-summary.csv')}
          >
            CSV をダウンロード
          </button>
        </div>
      </header>

      {error && (
        <div className="alert warning">{error}</div>
      )}

      {summary ? (
        <section className="section-card">
          <h2>概要</h2>
          <p>生成日時: {new Date(summary.generatedAt).toLocaleString('ja-JP')}</p>
          <p>
            SVG 枚数: {summary.svgCount} / 表示回数: {summary.renderCount} / ベースライン: {baselineLabel}
          </p>

          {summary.anomaly?.detected ? (
            <div className="alert warning">
              測定結果に揺らぎが検出されました (差分 {numberFormatter.format(summary.anomaly.variance * 100)}%、
              許容 {numberFormatter.format(summary.anomaly.threshold * 100)}%)。
            </div>
          ) : (
            <div className="alert info">測定差分は許容範囲内です。</div>
          )}

          <table>
            <thead>
              <tr>
                <th>手法</th>
                <th>バンドルサイズ (byte)</th>
                <th>アセットサイズ (byte)</th>
                <th>合計 (byte)</th>
                <th>1 枚あたり平均 (byte)</th>
                <th>ベースライン差 (byte)</th>
              </tr>
            </thead>
            <tbody>
              {summary.methods.map((method) => (
                <tr key={method.id}>
                  <td>{method.label}</td>
                  <td>{numberFormatter.format(method.bundleBytes)}</td>
                  <td>{numberFormatter.format(method.assetBytes)}</td>
                  <td>{numberFormatter.format(method.totalBytes)}</td>
                  <td>{numberFormatter.format(method.averageBytesPerSvg)}</td>
                  <td>{numberFormatter.format(method.deltaToBaseline)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>各実行の詳細</h3>
          <table>
            <thead>
              <tr>
                <th>RunID</th>
                <th>開始</th>
                <th>終了</th>
                <th>所要時間 (ms)</th>
                <th>合計サイズ (byte)</th>
              </tr>
            </thead>
            <tbody>
              {summary.runs.map((run) => (
                <tr key={run.runId}>
                  <td>{run.runId}</td>
                  <td>{new Date(run.startedAt).toLocaleString('ja-JP')}</td>
                  <td>{new Date(run.completedAt).toLocaleString('ja-JP')}</td>
                  <td>{numberFormatter.format(run.durationMs)}</td>
                  <td>{numberFormatter.format(run.totalBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
};

export default BenchmarkReport;
