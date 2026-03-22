/**
 * Merges all app builds into a single dist/ for Cloudflare Pages deployment.
 *
 *   dist/           ← home app    (serves /)
 *   dist/move/      ← move app    (serves /move/*)
 *   dist/finance/   ← finance app (serves /finance/*)
 *
 * Routing is handled by worker.js.
 */
import { cpSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const homeDist    = resolve(root, 'apps/home/dist');
const moveDist    = resolve(root, 'apps/move/dist');
const financeDist = resolve(root, 'apps/finance/dist');
const outDir      = resolve(root, 'dist');

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

console.log('✓ Combined dist ready → dist/');
