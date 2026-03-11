import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const ASSETS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets');

/**
 * Background images → capped at 1920px wide (CSS can't use srcset).
 * Gallery/card images → 480w + 960w variants for srcset.
 * Small UI images → single 256w variant.
 */
const GROUPS = [
  {
    label: 'backgrounds',
    files: ['exclave_frigate', 'fabricator', 'asteroid_debris_field', 'eve_frontier_keyart'],
    widths: [1280, 1920],
  },
  {
    label: 'gallery / cards',
    files: ['mining_frigate', 'omo', 'rebus', 'rider', 'crude', 'construction'],
    widths: [480, 960],
  },
  {
    label: 'small UI',
    files: ['logo_solo', 'eve_frontier_transparent', 'eve_frontier_profile'],
    widths: [128, 256],
  },
];

let generated = 0;

for (const group of GROUPS) {
  for (const file of group.files) {
    const src = path.join(ASSETS_DIR, `${file}.webp`);

    for (const w of group.widths) {
      const dest = path.join(ASSETS_DIR, `${file}-${w}w.webp`);
      const info = await sharp(src)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(dest);
      console.log(`  ${file}-${w}w.webp  ${info.width}×${info.height}  (${(info.size / 1024).toFixed(0)} KB)`);
      generated++;
    }
  }
}

console.log(`\nDone — ${generated} variants generated.`);
