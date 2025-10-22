import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'node:path';

const rendererChunks = {
  'renderer-inline': ['src/renderers/InlineSvgRenderer.tsx'],
  'renderer-img': ['src/renderers/ImgTagRenderer.tsx'],
  'renderer-svgr': ['src/renderers/SvgrRenderer.tsx'],
  'page-benchmark': ['src/pages/BenchmarkPage.tsx'],
  'page-report': ['src/pages/BenchmarkReport.tsx']
};

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, process.cwd(), '');
  const isBenchmark = mode === 'benchmark' || rootEnv.RENDER_ENV === 'benchmark';

  const plugins = [react(), svgr({ exportAsDefault: true })];

  if (isBenchmark) {
    plugins.push(
      visualizer({
        filename: 'reports/latest/bundle-visualizer.html',
        template: 'treemap',
        brotliSize: true,
        gzipSize: true,
        open: false
      })
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '~config': path.resolve(__dirname, 'config'),
        '~assets': path.resolve(__dirname, 'assets')
      }
    },
    define: {
      __RENDER_ENV__: JSON.stringify(rootEnv.RENDER_ENV ?? 'default')
    },
    build: {
      sourcemap: true,
      manifest: true,
      copyPublicDir: true,
      outDir: isBenchmark ? 'dist/benchmark' : 'dist',
      rollupOptions: {
        output: {
          manualChunks: rendererChunks,
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js'
        }
      }
    },
    server: {
      port: 5173
    }
  };
});

declare const __RENDER_ENV__: string;
