import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Serves files from public/vendor/ directly, bypassing Vite's transform
 * layer. Required because the sui-move-builder WASM module fetches its
 * .wasm file via a relative URL and must be served as-is.
 */
const BASE = '/move';

function serveVendorPlugin() {
  return {
    name: 'serve-vendor-as-module',
    configureServer(server: { middlewares: { use: (fn: Function) => void } }) {
      server.middlewares.use(
        (req: { url?: string }, res: any, next: () => void) => {
          const urlPath = req.url?.split('?')[0] ?? '';
          const pathWithoutBase = BASE ? urlPath.replace(new RegExp(`^${BASE}`), '') : urlPath;
          if (!pathWithoutBase.startsWith('vendor/')) return next();

          const filePath = path.join(process.cwd(), 'public', pathWithoutBase);

          try {
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) return next();

            const ext = path.extname(filePath);
            const contentType =
              ext === '.wasm' ? 'application/wasm' : 'application/javascript';

            res.writeHead(200, {
              'Content-Type': contentType,
              'Content-Length': stat.size,
              'Cache-Control': 'public, max-age=31536000, immutable',
            });
            fs.createReadStream(filePath).pipe(res);
          } catch {
            next();
          }
        },
      );
    },
  };
}

export default defineConfig({
  base: BASE,
  publicDir: '../../packages/assets',
  plugins: [react(), tailwindcss(), serveVendorPlugin()],
  server: { port: 5174, strictPort: true },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
