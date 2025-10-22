import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { collectSizeSummary } from '../../scripts/collect-size';

const DIST_ASSETS = path.resolve(process.cwd(), 'dist', 'benchmark', 'assets');

const createFile = (filePath: string, size: number) => {
  const buffer = Buffer.alloc(size, 'a');
  fs.writeFileSync(filePath, buffer);
};

describe('T-004 サイズ測定スクリプト', () => {
  beforeEach(() => {
    fs.rmSync(path.resolve(process.cwd(), 'dist', 'benchmark'), { force: true, recursive: true });
    fs.mkdirSync(DIST_ASSETS, { recursive: true });
    createFile(path.join(DIST_ASSETS, 'renderer-inline-test.js'), 1200);
    createFile(path.join(DIST_ASSETS, 'renderer-img-test.js'), 800);
    createFile(path.join(DIST_ASSETS, 'renderer-svgr-test.js'), 600);
    createFile(path.join(DIST_ASSETS, 'circle-asset.svg'), 400);
  });

  afterEach(() => {
    fs.rmSync(path.resolve(process.cwd(), 'dist', 'benchmark'), { force: true, recursive: true });
  });

  test('各手法のサイズを集計できる', () => {
    const summaries = collectSizeSummary({ svgCount: 3, renderCount: 10 });
    const inline = summaries.find((item) => item.id === 'inline');
    const img = summaries.find((item) => item.id === 'img');

    expect(inline?.bundleBytes).toBe(1200);
    expect(img?.bundleBytes).toBe(800);
    expect(img?.assetBytes).toBe(400);
  });
});
