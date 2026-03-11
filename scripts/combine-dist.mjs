/**
 * Merges both app builds into a single dist/ for Cloudflare Pages deployment.
 *
 *   dist/            ← home app (serves /)
 *   dist/move/       ← move app (serves /move/*)
 *   dist/_redirects  ← CF Pages SPA routing rules
 */
import { cpSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const homeDist = resolve(root, 'apps/home/dist');
const moveDist = resolve(root, 'apps/move/dist');
const outDir  = resolve(root, 'dist');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Home app at root
cpSync(homeDist, outDir, { recursive: true });

// Move app at /move
const moveOut = resolve(outDir, 'move');
mkdirSync(moveOut, { recursive: true });
cpSync(moveDist, moveOut, { recursive: true });

// Cloudflare Pages SPA routing:
// - /move/* → move app index (200 = rewrite, not redirect)
// - /*      → home app index
writeFileSync(
  resolve(outDir, '_redirects'),
  // /move/*  — all routes under /move/ → move SPA (CF serves /move and /move/ via directory index)
  // /*       — all other routes → home SPA
  '/move/*  /move/index.html  200\n' +
  '/*       /index.html       200\n',
);

console.log('✓ Combined dist ready → dist/');
