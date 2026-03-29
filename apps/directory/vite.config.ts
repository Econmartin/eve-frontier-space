import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/directory/',
  plugins: [react(), tailwindcss()],
  publicDir: '../../packages/assets',
  server: { port: 5176, strictPort: true },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@eve-frontier-space/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
    dedupe: ['react', 'react-dom'],
  },
});
