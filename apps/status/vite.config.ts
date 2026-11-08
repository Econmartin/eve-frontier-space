import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The page talks to the status Worker. In dev, run `npx wrangler dev` at the repo root (port 8787) and this proxies to it.
export default defineConfig({
  base: '/status/',
  plugins: [react(), tailwindcss()],
  // Fonts and images come from the site root (/fonts, /assets), served by the home app; no copies here.
  publicDir: false,
  server: {
    port: 5177,
    strictPort: true,
    proxy: {
      '/status/api': 'http://localhost:8787',
      '/status/feeds': 'http://localhost:8787',
      '/status/openapi.yaml': 'http://localhost:8787',
      '/fonts': 'http://localhost:8787',
      '^/assets/(?!index-)': 'http://localhost:8787',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@eve-frontier-space/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
} as any);
