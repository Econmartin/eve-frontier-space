/**
 * Draws the 1200x630 share picture of one rock: the voxel body on the left, name, size and material
 * bars on the right. Used for copy/download and as the Open Graph image behind /rocks/<id>.
 */
import type { Cell } from '@/lib/asteroidGen';
import { renderRockToCanvas } from './AsteroidPreview';

export interface CardSpec {
  cells: Cell[];
  /** rock name with prefix, or "Unlabelled rock" */
  title: string;
  /** e.g. "6,274 units · 418 voxels" */
  stats: string;
  /** e.g. "2026-10-13 · 41m 54s of mining" */
  when: string;
  materials: { name: string; n: number; color: string }[];
  total: number;
}

export const CARD_W = 1200;
export const CARD_H = 630;
const HEADING = "'Disket Mono', 'Favorit Mono Std', ui-monospace, monospace";
const BODY = "'Favorit Mono Std', ui-monospace, monospace";

const cssVar = (name: string, fallback: string) => (typeof document === 'undefined' ? fallback : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: (px: number) => string, from: number, to: number) {
  for (let px = from; px >= to; px -= 2) { ctx.font = font(px); if (ctx.measureText(text).width <= maxWidth) return px; }
  ctx.font = font(to); return to;
}

export async function renderRockCard(spec: CardSpec): Promise<HTMLCanvasElement> {
  try { await document.fonts.load(`600 60px 'Disket Mono'`); await document.fonts.load(`400 24px 'Favorit Mono Std'`); } catch { /* fall back to system monospace */ }
  const orange = cssVar('--color-martian-500', '#ff610a');
  const canvas = document.createElement('canvas'); canvas.width = CARD_W; canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  // background with a faint glow behind the rock
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, CARD_W, CARD_H);
  const glow = ctx.createRadialGradient(320, 315, 40, 320, 315, 360);
  glow.addColorStop(0, 'rgba(255, 97, 10, 0.16)'); glow.addColorStop(1, 'rgba(255, 97, 10, 0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 640, CARD_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, CARD_W - 2, CARD_H - 2);

  // the rock
  const rock = renderRockToCanvas(spec.cells, 560);
  ctx.drawImage(rock, 40, 35, 560, 560);

  // right column
  const x = 640, right = 1140, w = right - x;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `400 16px ${BODY}`;
  ctx.fillText('MY ROCKS  ·  EVE FRONTIER', x, 78);

  ctx.fillStyle = '#f5f5f5';
  const titlePx = fitText(ctx, spec.title, w, (px) => `600 ${px}px ${HEADING}`, 60, 34);
  ctx.fillText(spec.title, x, 78 + titlePx + 12);
  let y = 78 + titlePx + 12;

  ctx.fillStyle = orange; ctx.font = `400 28px ${BODY}`; y += 48; ctx.fillText(spec.stats, x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = `400 19px ${BODY}`; y += 34; ctx.fillText(spec.when, x, y);

  // material bars
  y += 44;
  const rows = spec.materials.slice(0, 6);
  const rowH = rows.length > 4 ? 50 : 58;
  for (const m of rows) {
    const share = spec.total ? m.n / spec.total : 0;
    ctx.fillStyle = '#eaeaea'; ctx.font = `400 20px ${BODY}`;
    const label = m.name; const px = fitText(ctx, label, w - 200, (p) => `400 ${p}px ${BODY}`, 20, 14);
    ctx.font = `400 ${px}px ${BODY}`; ctx.fillText(label, x, y);
    const value = `${m.n.toLocaleString()}  ·  ${Math.round(share * 100)}%`;
    ctx.font = `400 20px ${BODY}`; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.textAlign = 'right'; ctx.fillText(value, right, y); ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(ctx, x, y + 10, w, 7, 3.5); ctx.fill();
    ctx.fillStyle = m.color; roundRect(ctx, x, y + 10, Math.max(7, w * share), 7, 3.5); ctx.fill();
    y += rowH;
  }
  if (spec.materials.length > rows.length) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `400 17px ${BODY}`; ctx.fillText(`+ ${spec.materials.length - rows.length} more`, x, y - 10); }

  // footer
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = `400 17px ${BODY}`;
  ctx.fillText('evefrontier.space/industry/rocks', x, CARD_H - 38);
  ctx.fillStyle = orange; ctx.fillRect(right - 14, CARD_H - 50, 14, 14);
  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

export const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) => new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality));

export const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1] ?? ''); r.onerror = () => reject(r.error); r.readAsDataURL(blob); });
