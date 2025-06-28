// Global Vite configuration for all apps
export default {
  cacheDir: 'node_modules/.vite',
  optimizeDeps: {
    force: false,
    esbuildOptions: {
      target: 'esnext'
    }
  },
  esbuild: {
    target: 'esnext',
    logLevel: 'error'
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: 'esbuild'
  }
};