import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@react-clone/core': '../../packages/react-clone/dist/index.js'
    }
  },
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: false
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-clone': ['@react-clone/core']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@react-clone/core'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  esbuild: {
    target: 'esnext'
  }
});
