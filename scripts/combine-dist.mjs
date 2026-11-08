/**
 * Merges all app builds into a single dist/ for Cloudflare Pages deployment.
 *
 *   dist/             ← home app       (serves /)
 *   dist/move/        ← move app       (serves /move/*)
 *   dist/finance/     ← finance app    (serves /finance/*)
 *   dist/directory/   ← directory app  (serves /directory/*)
 *
 * Routing and the OG proxy are handled by _worker.js (copied into dist/).
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const homeDist      = resolve(root, 'apps/home/dist');
const moveDist      = resolve(root, 'apps/move/dist');
const financeDist   = resolve(root, 'apps/finance/dist');
const directoryDist = resolve(root, 'apps/directory/dist');
const outDir        = resolve(root, 'dist');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Home app at root
cpSync(homeDist, outDir, { recursive: true });

// Move app at /move
const moveOut = resolve(outDir, 'move');
mkdirSync(moveOut, { recursive: true });
cpSync(moveDist, moveOut, { recursive: true });

// Finance app at /finance
const financeOut = resolve(outDir, 'finance');
mkdirSync(financeOut, { recursive: true });
cpSync(financeDist, financeOut, { recursive: true });

// Status app at /status
const statusOut = resolve(outDir, 'status');
mkdirSync(statusOut, { recursive: true });
cpSync(resolve(root, 'apps/status/dist'), statusOut, { recursive: true });

// Directory app at /directory
const directoryOut = resolve(outDir, 'directory');
mkdirSync(directoryOut, { recursive: true });
cpSync(directoryDist, directoryOut, { recursive: true });

// Worker (Pages advanced mode — must live in dist/ for wrangler pages dev). It imports the status Worker code,
// so it is bundled into one self-contained file rather than copied.
await build({
  entryPoints: [resolve(root, '_worker.js')],
  outfile: resolve(outDir, '_worker.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  loader: { '.yaml': 'text' },
  logLevel: 'warning',
});
// Tell CF Pages not to serve _worker.js as a public static asset
writeFileSync(resolve(outDir, '.assetsignore'), '_worker.js\n');

console.log('✓ Combined dist ready → dist/');
