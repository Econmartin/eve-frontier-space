/**
 * Copies the sui-move-builder WASM bundle from node_modules into
 * public/vendor/ so it can be served as a static asset.
 *
 * Run after upgrading @zktx.io/sui-move-builder:
 *   npm run update-compiler
 */
import { mkdirSync, copyFileSync } from 'node:fs';

const src = 'node_modules/@zktx.io/sui-move-builder/dist/lite';
const dst = 'public/vendor/sui-move-builder';
const files = ['index.js', 'sui_move_wasm.js', 'sui_move_wasm_bg.wasm'];

mkdirSync(dst, { recursive: true });
for (const file of files) {
  copyFileSync(`${src}/${file}`, `${dst}/${file}`);
  console.log(`  copied ${file}`);
}
console.log('Compiler updated.');
