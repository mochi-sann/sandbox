import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@react-clone/core': '../../packages/react-clone/src/index.ts'
    }
  },
  server: {
    port: 3000
  }
});