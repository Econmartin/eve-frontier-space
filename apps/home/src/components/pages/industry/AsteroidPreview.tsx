import { useEffect, useMemo, useRef } from 'react';
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
  return { scene, camera, group, dispose: () => { geo.dispose(); mat.dispose(); } };
}

/** Render a voxel body once into a fresh canvas (share cards). */
export function renderRockToCanvas(cells: Cell[], size: number, yaw = 0.6): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.setSize(size, size, false);
  const { scene, camera, group, dispose } = buildScene(cells);
  group.rotation.set(0.45, yaw, 0); renderer.render(scene, camera);
  dispose(); renderer.dispose();
  return canvas;
}

/** Small self-contained three.js view of a voxel grid. */
export function AsteroidPreview({ cells, size = 220, spin = true, className }: { cells: Cell[]; size?: number; spin?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = useMemo(() => cells.length + ':' + (cells[0]?.join(',') ?? ''), [cells]);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(size, size, false);
    const { scene, camera, group, dispose } = buildScene(cells);
    let raf = 0; let t = 0; let alive = true;
    const loop = () => { if (!alive) return; t += 0.006; group.rotation.set(0.45, spin ? t : 0.6, 0); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    loop();
    return () => { alive = false; cancelAnimationFrame(raf); dispose(); renderer.dispose(); };
  }, [key, size, spin, cells]);
  return <canvas ref={ref} width={size} height={size} className={className} style={{ width: size, height: size }} aria-label="asteroid preview" />;
}
