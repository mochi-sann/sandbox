import fs from 'node:fs';
import path from 'node:path';
import { listSvgFiles, readFileSize, writeJson, writeText, ensureDir } from './fs-utils';
import { logInfo, logWarn } from './logger';
import { DEFAULT_RENDER_COUNT, SVG_SAMPLE_DIR } from '../config/benchmark.config';

type MethodConfig = {
  id: string;
  label: string;
  chunkPrefix: string;
  includeSvgAssets: boolean;
};

type CollectContext = {
  runId: string;
  runIndex: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  renderCount: number;
  svgCount: number;
  totalBytes?: number;
};

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

type BenchmarkSummary = {
  generatedAt: string;
  renderCount: number;
  svgCount: number;
  methods: MethodSummary[];
  runs: CollectContext[];
  anomaly?: {
    detected: boolean;
    threshold: number;
    variance: number;
  };
};

const REPORT_ROOT = path.resolve(process.cwd(), 'reports');
const REPORT_LATEST = path.join(REPORT_ROOT, 'latest');
const HISTORY_DIR = path.join(REPORT_ROOT, 'history');
const PUBLIC_REPORT_DIR = path.resolve(process.cwd(), 'public', 'reports');
const DIST_DIR = path.resolve(process.cwd(), 'dist', 'benchmark');

const METHOD_CONFIGS: MethodConfig[] = [
  { id: 'inline', label: 'インライン JSX', chunkPrefix: 'renderer-inline', includeSvgAssets: false },
  { id: 'img', label: 'img タグ', chunkPrefix: 'renderer-img', includeSvgAssets: true },
  { id: 'svgr', label: 'SVGR コンポーネント', chunkPrefix: 'renderer-svgr', includeSvgAssets: false }
];

const gatherBundleFiles = () => {
  const assetsDir = path.join(DIST_DIR, 'assets');
  if (!fs.existsSync(assetsDir)) {
    throw new Error(`assets ディレクトリが見つかりません: ${assetsDir}`);
  }

  return fs.readdirSync(assetsDir).map((name) => ({
    name,
    path: path.join(assetsDir, name),
    size: readFileSize(path.join(assetsDir, name))
  }));
};

const formatMarkdown = (summary: BenchmarkSummary) => {
  const lines = [
    `# SVG Delivery Benchmark`,
    '',
    `- 測定日時: ${summary.generatedAt}`,
    `- SVG 枚数: ${summary.svgCount}`,
    `- 表示回数: ${summary.renderCount}`,
    '',
    '| 手法 | バンドル (byte) | アセット (byte) | 合計 (byte) | 1 枚あたり平均 (byte) | ベースライン差 (byte) |',
    '| --- | --- | --- | --- | --- | --- |'
  ];

  summary.methods.forEach((method) => {
    lines.push(
      `| ${method.label} | ${method.bundleBytes} | ${method.assetBytes} | ${method.totalBytes} | ${method.averageBytesPerSvg.toFixed(
        2
      )} | ${method.deltaToBaseline} |`
    );
  });

  if (summary.anomaly?.detected) {
    lines.push('', `> ⚠️ 差分が閾値 ${summary.anomaly.threshold * 100}% を超えました (実測 ${summary.anomaly.variance * 100}%)`);
  }

  return lines.join('\n');
};

type SizeSummaryInput = {
  svgCount: number;
  renderCount: number;
};

export const collectSizeSummary = (input: SizeSummaryInput): MethodSummary[] => {
  const bundleFiles = gatherBundleFiles();
  const svgCount = input.svgCount;
  const renderCount = input.renderCount;

  return METHOD_CONFIGS.map((config) => {
    const bundleBytes = bundleFiles
      .filter((file) => file.name.startsWith(config.chunkPrefix) && file.name.endsWith('.js'))
      .reduce((acc, file) => acc + file.size, 0);

    const assetBytes = config.includeSvgAssets
      ? bundleFiles
          .filter((file) => file.name.endsWith('.svg'))
          .reduce((acc, file) => acc + file.size, 0)
      : 0;

    const totalBytes = bundleBytes + assetBytes;
    const averageBytesPerSvg = svgCount > 0 ? totalBytes / (svgCount * renderCount) : 0;

    return {
      id: config.id,
      label: config.label,
      bundleBytes,
      assetBytes,
      totalBytes,
      averageBytesPerSvg,
      svgCount,
      renderCount,
      deltaToBaseline: 0
    } satisfies MethodSummary;
  });
};

const generateHistoryEntry = (summary: BenchmarkSummary) => {
  const indexPath = path.join(HISTORY_DIR, 'index.json');
  ensureDir(HISTORY_DIR);
  const entry = {
    generatedAt: summary.generatedAt,
    renderCount: summary.renderCount,
    svgCount: summary.svgCount,
    methods: summary.methods.map((method) => ({
      id: method.id,
      totalBytes: method.totalBytes,
      averageBytesPerSvg: method.averageBytesPerSvg
    }))
  };

  let index: unknown[] = [];
  if (fs.existsSync(indexPath)) {
    try {
      const raw = fs.readFileSync(indexPath, 'utf8');
      index = JSON.parse(raw);
    } catch (error) {
      logWarn(`history index の読み込みに失敗しました: ${(error as Error).message}`);
    }
  }

  (index as unknown[]).push(entry);
  writeJson(indexPath, index);
};

export const saveBenchmarkSummary = (summary: BenchmarkSummary) => {
  ensureDir(REPORT_LATEST);
  ensureDir(PUBLIC_REPORT_DIR);

  const jsonPath = path.join(REPORT_LATEST, 'size-summary.json');
  const mdPath = path.join(REPORT_LATEST, 'size-summary.md');

  writeJson(jsonPath, summary);
  writeText(mdPath, formatMarkdown(summary));

  const publicJson = path.join(PUBLIC_REPORT_DIR, 'latest', 'size-summary.json');
  const publicMd = path.join(PUBLIC_REPORT_DIR, 'latest', 'size-summary.md');
  writeJson(publicJson, summary);
  writeText(publicMd, formatMarkdown(summary));

  generateHistoryEntry(summary);
};

export const collectBenchmark = (context: CollectContext, runs: CollectContext[]): BenchmarkSummary => {
  const svgDir = path.resolve(process.cwd(), SVG_SAMPLE_DIR);
  const svgFiles = listSvgFiles(svgDir);
  const svgCount = svgFiles.length;
  const renderCount = context.renderCount || DEFAULT_RENDER_COUNT;

  const methods = collectSizeSummary({ svgCount, renderCount }).map((method, index, array) => {
    const baseline = array[0];
    return {
      ...method,
      deltaToBaseline: method.totalBytes - baseline.totalBytes
    } satisfies MethodSummary;
  });

  const totalBytes = methods.reduce((acc, method) => acc + method.totalBytes, 0);
  const bytesPerRun = runs.map((run) => run.totalBytes ?? totalBytes);
  const max = Math.max(...bytesPerRun);
  const min = Math.min(...bytesPerRun);
  const variance = totalBytes === 0 ? 0 : (max - min) / totalBytes;
  const threshold = 0.01;

  const summary: BenchmarkSummary = {
    generatedAt: context.completedAt,
    renderCount,
    svgCount,
    methods,
    runs,
    anomaly: variance > threshold ? { detected: true, threshold, variance } : { detected: false, threshold, variance }
  };

  saveBenchmarkSummary(summary);

  logInfo('ベンチマーク集計が完了しました。');
  console.table(
    summary.methods.map((method) => ({
      method: method.label,
      bundleBytes: method.bundleBytes,
      assetBytes: method.assetBytes,
      totalBytes: method.totalBytes,
      averageBytesPerSvg: Number(method.averageBytesPerSvg.toFixed(2)),
      deltaToBaseline: method.deltaToBaseline
    }))
  );

  return summary;
};

export type { BenchmarkSummary, CollectContext };
