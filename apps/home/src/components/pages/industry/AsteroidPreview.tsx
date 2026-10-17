import { Component, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import * as THREE from 'three';
import { buildGrid, MATERIAL_COLOR, type Cell, type Material, type Profile } from '@/lib/asteroidGen';
import { composites } from '@/lib/industry';

/** regolith type ID → generator material slot */
const SLOT_OF: Record<number, Material> = Object.fromEntries(Object.entries(composites.materials).filter(([k, v]) => !k.startsWith('_') && typeof v === 'number').map(([m, id]) => [id as number, m as Material]));
export const slotOf = (regolithId: number): Material | undefined => SLOT_OF[regolithId];
export const regolithOfSlot = (m: Material): number | undefined => Number(Object.entries(SLOT_OF).find(([, v]) => v === m)?.[0]) || undefined;

/** Turn observed shares into a one-layer profile: biggest share is the matrix, the rest are placed by morphology. */
export function profileFromShares(shares: { id: number; qty: number }[]): Profile | null {
  const total = shares.reduce((s, x) => s + x.qty, 0);
  const mats = shares.map((x) => ({ slot: SLOT_OF[x.id], frac: x.qty / total })).filter((x): x is { slot: Material; frac: number } => !!x.slot).sort((a, b) => b.frac - a.frac);
  if (!mats.length) return null;
  return { layers: [{ depthLo: 0, depthHi: 1, materials: mats.map((m, i) => ({
    material: m.slot, weight: i === 0 ? 1 : Number(m.frac.toFixed(3)),
    morphology: i === 0 ? 'massive' : m.frac >= 0.15 ? 'vein' : m.frac >= 0.05 ? 'nodular' : 'disseminated',
    self_affinity: 0.6,
  })) }] };
}
/** stable seed from a session's start time */
export const seedFrom = (ms: number) => (Math.floor(ms / 1000) ^ 0x5f3759df) >>> 0;
const ARCHETYPES = ['differentiated', 'bilobed', 'rubble', 'chondrite'];

/**
 * Generate a body for the shares mined. Each "You mined …" line in the game log is one popped voxel
 * picked up, so when `voxels` (the tick count) is given the body has exactly that many cells;
 * otherwise a stock radius-6 body.
 */
export function generateFor(shares: { id: number; qty: number }[], seed: number, prefix = '', voxels?: number): Cell[] {
  const profile = profileFromShares(shares);
  const archetype = ARCHETYPES[seed % ARCHETYPES.length];
  const build = (radius: number) => buildGrid({ archetype, dim: 2 * Math.ceil(radius) + 5, radius, noise: 1.6, seed, profile, prefix });
  if (!voxels) return build(6);
  const target = Math.max(1, Math.round(voxels));
  // A radius-6 body lands near 900 cells, so start from that ratio and refine by cube-root scaling.
  let radius = Math.min(12, Math.max(1.2, 6 * Math.cbrt(target / 900)));
  let best: Cell[] = build(radius);
  for (let i = 0; i < 3 && best.length !== target; i++) {
    radius = Math.min(12, Math.max(1.2, radius * Math.cbrt(target / Math.max(1, best.length))));
    const cells = build(radius);
    if (Math.abs(cells.length - target) < Math.abs(best.length - target)) best = cells; else break;
  }
  // Small bodies can come out short (the smallest radius is not always ~20 cells), so grow until there is enough to trim.
  for (let i = 0; i < 8 && best.length < target; i++) { radius = Math.min(14, radius + Math.max(0.4, radius * 0.2)); best = build(radius); }
  // The generator cannot go below ~20 cells, and the search lands within a few of the target, so shave the
  // outermost cells off to make the count exact. Tiny partial clears become a small chunk rather than a whole body.
  if (best.length > target) best = best.map((c) => [c, Math.hypot(c[0], c[1], c[2])] as const).sort((a, b) => a[1] - b[1]).slice(0, target).map(([c]) => c);
  return best;
}

/** Scene, camera and spinning group for a voxel grid; the camera frames rocks of radius ~5 and up. */
function buildScene(cells: Cell[]) {
  const scene = new THREE.Scene();
  const extent = cells.reduce((m, c) => Math.max(m, Math.hypot(c[0], c[1], c[2])), 0) + 0.8;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200); camera.position.set(0, 0, Math.max(5.5, extent) * 3.6);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x101418, 1.0)); const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(8, 12, 10); scene.add(sun);
  const geo = new THREE.BoxGeometry(0.92, 0.92, 0.92); const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 });
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, cells.length)); const m = new THREE.Matrix4(); const col = new THREE.Color();
  cells.forEach((c, i) => { m.makeTranslation(c[0], c[1], c[2]); mesh.setMatrixAt(i, m); const rgb = (MATERIAL_COLOR as Record<string, number[]>)[c[3]] ?? [0.5, 0.5, 0.5]; col.setRGB(rgb[0], rgb[1], rgb[2]); mesh.setColorAt(i, col); });
  mesh.count = cells.length; const group = new THREE.Group(); group.add(mesh); scene.add(group);
  return { scene, camera, group, extent, dispose: () => { geo.dispose(); mat.dispose(); } };
}
type Built = ReturnType<typeof buildScene>;

// ---------------------------------------------------------------------------------------------
// One WebGL context for every preview on the page. Browsers allow only ~16 live contexts and
// silently lose the oldest ones, after which three.js throws while reading shader precision
// from the dead context. Each preview is a 2D canvas that copies the shared renderer's output.
// ---------------------------------------------------------------------------------------------
let shared: THREE.WebGLRenderer | null | undefined; // undefined = not tried yet, null = unavailable
let retryAt = 0;
function sharedRenderer(): THREE.WebGLRenderer | null {
  if (shared) return shared;
  if (shared === null && Date.now() < retryAt) return null;
  try {
    const canvas = document.createElement('canvas');
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); try { r.dispose(); } catch { /* already gone */ } shared = null; retryAt = Date.now() + 1500; });
    shared = r; return r;
  } catch {
    // no WebGL (in-app browsers, blocked GPU, lost context): fall back to the 2D painter below
    shared = null; retryAt = Date.now() + 10_000; return null;
  }
}

/** Draw the voxel body without WebGL: project each cell with the same camera and paint back to front. */
function paintSoftware(ctx: CanvasRenderingContext2D, cells: Cell[], extent: number, rx: number, ry: number, px: number) {
  ctx.clearRect(0, 0, px, px);
  const D = Math.max(5.5, extent) * 3.6, f = (px / 2) / Math.tan((40 / 2) * Math.PI / 180);
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
  const pts = cells.map((c) => {
    // three applies Euler XYZ: rotate about Y, then about X
    const x1 = c[0] * cy + c[2] * sy, z1 = -c[0] * sy + c[2] * cy, y1 = c[1];
    const y2 = y1 * cx - z1 * sx, z2 = y1 * sx + z1 * cx;
    const depth = D - z2, k = f / depth;
    return { sx: px / 2 + x1 * k, sy: px / 2 - y2 * k, side: 0.92 * k, z: z2, y: y2, mat: c[3] };
  }).sort((a, b) => a.z - b.z);
  for (const p of pts) {
    const rgb = (MATERIAL_COLOR as Record<string, number[]>)[p.mat] ?? [0.5, 0.5, 0.5];
    const light = 0.55 + 0.45 * Math.max(0, Math.min(1, (p.y + p.z * 0.6) / (2 * extent) + 0.5));
    ctx.fillStyle = `rgb(${rgb.map((v) => Math.round(v * light * 255)).join(',')})`;
    ctx.fillRect(p.sx - p.side / 2, p.sy - p.side / 2, p.side + 0.5, p.side + 0.5);
  }
}

/** Render one frame into a 2D canvas, with WebGL when it works and the software painter when it does not. */
function renderFrame(target: HTMLCanvasElement, built: Built, cells: Cell[], rx: number, ry: number, size: number, dpr: number) {
  const ctx = target.getContext('2d'); if (!ctx) return;
  const px = Math.round(size * dpr);
  if (target.width !== px || target.height !== px) { target.width = px; target.height = px; }
  const r = sharedRenderer();
  if (r) {
    try {
      r.setPixelRatio(dpr); r.setSize(size, size, false);
      built.group.rotation.set(rx, ry, 0); r.render(built.scene, built.camera);
      ctx.clearRect(0, 0, px, px); ctx.drawImage(r.domElement, 0, 0, px, px);
      return;
    } catch { shared = null; retryAt = Date.now() + 1500; }
  }
  paintSoftware(ctx, cells, built.extent, rx, ry, px);
}

/** Render a voxel body once into a fresh 2D canvas (share cards). */
export function renderRockToCanvas(cells: Cell[], size: number, yaw = 0.6): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const built = buildScene(cells);
  renderFrame(canvas, built, cells, 0.45, yaw, size, 1);
  built.dispose();
  return canvas;
}

class PreviewBoundary extends Component<{ size: number; className?: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className={cn('flex items-center justify-center text-xs text-muted-foreground text-center p-3', this.props.className)} style={{ width: this.props.size, height: this.props.size }}>preview unavailable in this browser</div>;
  }
}

function PreviewCanvas({ cells, size, spin, className }: { cells: Cell[]; size: number; spin: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = useMemo(() => cells.length + ':' + (cells[0]?.join(',') ?? ''), [cells]);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const built = buildScene(cells);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0; let t = 0; let visible = true; let alive = true;
    const frame = () => { raf = 0; if (!alive) return; renderFrame(canvas, built, cells, 0.45, spin ? t : 0.6, size, dpr); if (spin && visible && !document.hidden) { t += 0.006; raf = requestAnimationFrame(frame); } };
    const kick = () => { if (alive && !raf) raf = requestAnimationFrame(frame); };
    // only animate what is on screen: a long list of rocks would otherwise re-render every frame
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '100px' }) : null;
    io?.observe(canvas);
    document.addEventListener('visibilitychange', kick);
    kick();
    return () => { alive = false; if (raf) cancelAnimationFrame(raf); io?.disconnect(); document.removeEventListener('visibilitychange', kick); built.dispose(); };
  }, [key, size, spin, cells]);
  return <canvas ref={ref} width={size} height={size} className={className} style={{ width: size, height: size }} aria-label="asteroid preview" />;
}

/** Small self-contained view of a voxel grid. Shares one WebGL context with every other preview and degrades to a 2D painter. */
export function AsteroidPreview({ cells, size = 220, spin = true, className }: { cells: Cell[]; size?: number; spin?: boolean; className?: string }) {
  return <PreviewBoundary size={size} className={className}><PreviewCanvas cells={cells} size={size} spin={spin} className={className} /></PreviewBoundary>;
}
