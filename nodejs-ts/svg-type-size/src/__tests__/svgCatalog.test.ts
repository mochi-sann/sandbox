import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { createSvgCatalog, svgCatalog } from '../utils/svgCatalog';
import { listSvgFiles } from '../../scripts/fs-utils';
import { SVG_SAMPLE_DIR } from '../../config/benchmark.config';

describe('T-001 SVG ディレクトリ認識テスト', () => {
  test('assets ディレクトリ内の SVG を全て検出できる', () => {
    const svgDir = path.resolve(process.cwd(), SVG_SAMPLE_DIR);
    const files = listSvgFiles(svgDir).map((file) => path.basename(file));
    const catalog = createSvgCatalog();

    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.map((entry) => entry.name).sort()).toEqual(files.sort());
  });

  test('svgCatalog 定数が再利用可能', () => {
    expect(svgCatalog.length).toBeGreaterThan(0);
  });
});
