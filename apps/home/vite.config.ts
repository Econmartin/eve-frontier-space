import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: '../../packages/assets',
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:8787' } },
  // three.js is shared by the rocks page and the share page; keep it in one chunk of its own
  build: { rollupOptions: { output: { manualChunks: { three: ['three'] } } } },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@eve-frontier-space/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
});