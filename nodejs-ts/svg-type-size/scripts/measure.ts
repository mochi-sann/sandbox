import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { collectBenchmark, collectSizeSummary, type CollectContext } from './collect-size';
import { ensureDir, listSvgFiles } from './fs-utils';
import { logError, logInfo } from './logger';
import { resolveRenderCount, SVG_SAMPLE_DIR } from '../config/benchmark.config';

const RUN_COUNT = Number(process.env.MEASURE_RUNS ?? 3);
const DIST_DIR = path.resolve(process.cwd(), 'dist', 'benchmark');

const cleanDist = () => {
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
};

const runBuild = (runIndex: number) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn('npm', ['run', 'build:benchmark'], {
      stdio: 'inherit',
      shell: false,
      env: {
        ...process.env,
        MEASURE_CURRENT_RUN: String(runIndex)
      }
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`build:benchmark が異常終了しました (code=${code})`));
      }
    });
  });

const measure = async () => {
  const renderCount = resolveRenderCount(process.env.RENDER_COUNT);
  const svgDir = path.resolve(process.cwd(), SVG_SAMPLE_DIR);
  ensureDir(svgDir);
  const svgFiles = listSvgFiles(svgDir);
  const svgCount = svgFiles.length;

  if (svgCount === 0) {
    throw new Error(`SVG が見つかりません。${SVG_SAMPLE_DIR} に最低 1 枚配置してください。`);
  }

  const runs: CollectContext[] = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  for (let index = 0; index < RUN_COUNT; index += 1) {
    const runIndex = index + 1;
    const runId = `${timestamp}-run${runIndex}-${randomUUID().slice(0, 8)}`;
    const startedAt = new Date().toISOString();
    cleanDist();
    await runBuild(runIndex);
    const completedAt = new Date().toISOString();

    const methods = collectSizeSummary({ svgCount, renderCount });
    const totalBytes = methods.reduce((acc, method) => acc + method.totalBytes, 0);

    runs.push({
      runId,
      runIndex,
      startedAt,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      renderCount,
      svgCount,
      totalBytes
    });
  }

  const finalContext = runs[runs.length - 1];
  const summary = collectBenchmark(finalContext, runs);

  if (summary.anomaly?.detected) {
    logError(`測定差分が閾値を超えています (variance=${summary.anomaly.variance})`);
    process.exitCode = 1;
  }

  logInfo('測定が完了しました。');
};

measure().catch((error: Error) => {
  logError(error.message);
  process.exitCode = 1;
});
