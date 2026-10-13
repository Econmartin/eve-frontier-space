import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: '../../packages/assets',
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:8787' } },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@eve-frontier-space/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
});