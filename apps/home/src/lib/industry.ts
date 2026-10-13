/**
 * Typed access to the extracted EVE Frontier industry data. Pure data + graph helpers; no React here.
 * The repo only carries the public subset (regolith items) in industry.public.json; the full dataset,
 * when present at data/full/industry.json, replaces it.
 */
import publicRaw from '@/data/industry.public.json';
import availabilityRaw from '@/data/availability.json';
import compositesRaw from '@/data/composites.json';

export interface Item {
  id: number; name: string; group: string; category: string;
  icon?: string; price?: number; published?: boolean; volume?: number | null; mass?: number | null; portionSize?: number | null; description?: string | null; regolith?: boolean;
}
export interface RecipeIO { id: number; qty: number }
export interface RecipeFacility { id: number; maxInputRuns: number; maxOutputRuns: number }
export interface Recipe { id: number; product: number; time: number; inputs: RecipeIO[]; outputs: RecipeIO[]; facilities: RecipeFacility[] }
export interface Facility { id: number; name: string; blueprints: number[] }
export interface Reprocessing { id: number; portionSize: number | null; materials: RecipeIO[] }
export interface Rock { id: number; output: number; belt: 'inner' | 'outer' | null }
interface IndustryData { clientVersion: string; items: Record<string, Item>; recipes: Recipe[]; facilities: Facility[]; reprocessing: Reprocessing[]; rocks?: Rock[]; consumedBy?: Record<string, number[]> }

const fullRaw = import.meta.glob('../data/full/industry.json', { eager: true }) as Record<string, { default: unknown }>;
const data = (Object.values(fullRaw)[0]?.default ?? publicRaw) as unknown as IndustryData;

export const clientVersion = data.clientVersion;
export const items = new Map<number, Item>(Object.values(data.items).map((i) => [i.id, i]));
export const recipes: Recipe[] = data.recipes;
export const recipeById = new Map<number, Recipe>(recipes.map((r) => [r.id, r]));
export const facilities: Facility[] = data.facilities;
export const facilityById = new Map<number, Facility>(facilities.map((f) => [f.id, f]));
export const reprocessing: Reprocessing[] = data.reprocessing;
/** The asteroid bodies you scan in space (Char, Slag, …) and the regolith each one yields. */
export const rocks: Rock[] = data.rocks ?? [];
export const rockFor = (regolithId: number) => rocks.find((r) => r.output === regolithId);
/** NPC roaming-trade base price per unit, where the client defines one. */
export const priceOf = (id: number): number | undefined => items.get(id)?.price;
export const fmtPrice = (n: number) => `${Math.round(n).toLocaleString()} ◈`;
/** value of a list of {id, qty}, counting only priced items; `priced` is how many lines had a price */
export const valueOf = (list: { id: number; qty: number }[]) => list.reduce((acc, x) => { const p = priceOf(x.id); return p ? { total: acc.total + p * x.qty, priced: acc.priced + 1 } : acc; }, { total: 0, priced: 0 });
/** types (modules, structures) that consume this item as fuel or feedstock */
export const consumedBy = (id: number): number[] => data.consumedBy?.[String(id)] ?? [];
/** Composite (voxel) asteroids: server-named, mixed yields. Catalog from the community, clears from play. */
export type QtyClass = 'L' | 'S' | 'T';
export interface CompositeObservation { name: string; variant?: string; note?: string; yields: Record<string, number> }
export const composites = compositesRaw as unknown as { cycle: string; materials: Record<string, number | string>; catalog: Record<string, Record<string, QtyClass> | string>; observed: CompositeObservation[] };
export interface CompositeRock { name: string; materials: { id: number; cls: QtyClass }[] }
const CLASS_RANK: Record<QtyClass, number> = { L: 0, S: 1, T: 2 };
export const compositeRocks: CompositeRock[] = Object.entries(composites.catalog)
  .filter(([k, v]) => !k.startsWith('_') && typeof v === 'object')
  .map(([name, v]) => ({ name, materials: Object.entries(v as Record<string, QtyClass>).map(([id, cls]) => ({ id: Number(id), cls })).sort((a, b) => CLASS_RANK[a.cls] - CLASS_RANK[b.cls]) }))
  .sort((a, b) => a.name.localeCompare(b.name));
export const CLASS_LABEL: Record<QtyClass, string> = { L: 'large', S: 'small', T: 'trace' };
/** rocks whose catalog entry includes this regolith, best class first */
export const rocksWith = (regolithId: number) => compositeRocks.map((r) => ({ rock: r, cls: r.materials.find((m) => m.id === regolithId)?.cls })).filter((x): x is { rock: CompositeRock; cls: QtyClass } => !!x.cls).sort((a, b) => CLASS_RANK[a.cls] - CLASS_RANK[b.cls]);
export const compositeMaterials: { material: string; regolith: number }[] = Object.entries(composites.materials).filter(([k, v]) => !k.startsWith('_') && typeof v === 'number').map(([material, regolith]) => ({ material, regolith: regolith as number }));

/** recipes that output the item */
export const producedBy = new Map<number, Recipe[]>();
/** recipes that consume the item */
export const usedIn = new Map<number, Recipe[]>();
for (const r of recipes) {
  for (const o of r.outputs) producedBy.set(o.id, [...(producedBy.get(o.id) ?? []), r]);
  for (const i of r.inputs) usedIn.set(i.id, [...(usedIn.get(i.id) ?? []), r]);
}

export const itemOf = (id: number): Item => items.get(id) ?? { id, name: `type ${id}`, group: '?', category: '?' };
export const itemName = (id: number) => itemOf(id).name;
export const facilityName = (id: number) => facilityById.get(id)?.name ?? itemName(id);
export const isBaseInput = (id: number) => !producedBy.has(id);
export const isRegolith = (id: number) => !!items.get(id)?.regolith;
export const isPublished = (id: number) => items.get(id)?.published !== false;

// ---------------- Availability (curated per cycle, see data/availability.json) ----------------
interface Availability { cycle: string; facilities: { deployable: number[]; shipModule: number[] }; builtInSpace: number[] }
export const availability = availabilityRaw as Availability;
const DEPLOYABLE = new Set(availability.facilities.deployable), SHIP_MODULE = new Set(availability.facilities.shipModule), BUILT_IN_SPACE = new Set(availability.builtInSpace);
export type FacilityKind = 'deployable' | 'shipModule' | 'unavailable' | 'none';
export function facilityKind(id: number): FacilityKind {
  if (DEPLOYABLE.has(id)) return 'deployable';
  if (SHIP_MODULE.has(id)) return 'shipModule';
  if (facilityById.has(id)) return 'unavailable';
  return 'none';
}
export const FACILITY_KIND_LABEL: Record<FacilityKind, string> = { deployable: 'structure', shipModule: 'ship module', unavailable: 'not in game this cycle', none: '' };
export const facilityLive = (id: number) => facilityKind(id) === 'deployable' || facilityKind(id) === 'shipModule';
/** Players can run this blueprint without any facility (e.g. the two hulls built in open space). */
export const builtInSpace = (r: Recipe) => BUILT_IN_SPACE.has(r.id);
/** A recipe is available when it runs on a facility that exists in game, or is built in space. Unassigned recipes count as unavailable. */
export const recipeAvailable = (r: Recipe) => builtInSpace(r) || r.facilities.some((f) => facilityLive(f.id));
/** kept for callers that only care about "is anything about this recipe live" */
export const recipeLive = recipeAvailable;
/** An item is in game when it is published, is not an unavailable facility, and (if craftable) has at least one available recipe. */
export const itemAvailable = (id: number) => {
  if (!isPublished(id) || facilityKind(id) === 'unavailable') return false;
  const rs = producedBy.get(id); return !rs || rs.some(recipeAvailable);
};

/** every item that appears in a recipe (inputs, outputs, or as a facility), sorted by name */
export const industryItems: Item[] = [...items.values()]
  .filter((i) => producedBy.has(i.id) || usedIn.has(i.id) || i.regolith)
  .sort((a, b) => a.name.localeCompare(b.name));
export const categories: string[] = [...new Set(industryItems.map((i) => i.category))].sort();
export const groups: string[] = [...new Set(industryItems.map((i) => i.group))].sort();

export function searchItems(query: string, pool: Item[] = industryItems, limit = 50): Item[] {
  const q = query.trim().toLowerCase();
  if (!q) return pool.slice(0, limit);
  const words = q.split(/\s+/);
  const score = (i: Item) => {
    const n = i.name.toLowerCase();
    if (n === q) return 0;
    if (n.startsWith(q)) return 1;
    if (words.every((w) => n.includes(w))) return 2;
    if (i.group.toLowerCase().includes(q)) return 3;
    return -1;
  };
  return pool.map((i) => [score(i), i] as const).filter(([s]) => s >= 0).sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name)).slice(0, limit).map(([, i]) => i);
}

export function fmtTime(s: number): string {
  s = Math.round(s);
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (h >= 24) { const d = Math.floor(h / 24); return `${d}d ${h % 24}h ${m}m`; }
  if (h) return `${h}h ${String(m).padStart(2, '0')}m${r ? ` ${String(r).padStart(2, '0')}s` : ''}`;
  return `${m}m${r ? ` ${String(r).padStart(2, '0')}s` : ''}`;
}
export const fmtNum = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 }));
export const fmtVol = (m3: number) => (m3 >= 1e6 ? `${(m3 / 1e6).toFixed(2)}M m³` : m3 >= 1e3 ? `${(m3 / 1e3).toFixed(1)}k m³` : `${fmtNum(m3)} m³`);

/** quantity of `id` produced by one run of `r` */
export const outputQty = (r: Recipe, id: number) => r.outputs.find((o) => o.id === id)?.qty ?? 0;

/** True when `r` makes `id` from something that is itself made from `id` (batch / package round-trips). */
export const isRepackCycle = (r: Recipe, id: number) =>
  r.inputs.some((i) => (producedBy.get(i.id) ?? []).some((rr) => rr.inputs.some((x) => x.id === id)));
const liveFacilityCount = (r: Recipe) => (builtInSpace(r) ? 1 : new Set(r.facilities.filter((f) => facilityLive(f.id)).map((f) => f.id)).size);
/** Facilities that are themselves products of a blueprint. */
export const facilityBuildable = (id: number) => producedBy.has(id);

/**
 * Rank recipes for an item: available in game first, primary product first, no repack round-trips,
 * most available facilities, then fewest inputs, then shortest run.
 */
export function rankRecipes(id: number, options: Recipe[]): Recipe[] {
  return [...options].sort((a, b) =>
    Number(recipeAvailable(b)) - Number(recipeAvailable(a))
    || Number(b.product === id) - Number(a.product === id)
    || Number(isRepackCycle(a, id)) - Number(isRepackCycle(b, id))
    || liveFacilityCount(b) - liveFacilityCount(a)
    || a.inputs.length - b.inputs.length
    || a.time - b.time);
}
export function defaultRecipeFor(id: number, options: Recipe[] = producedBy.get(id) ?? []): Recipe | undefined {
  return options.length ? rankRecipes(id, options)[0] : undefined;
}

// ---------------- Suggestions for empty states ----------------
/**
 * Production tier of an item: 0 = raw (mined, salvaged, looted), 1 = refined straight from raw,
 * 2 = made from tier ≤ 1, and so on. Follows available recipes only (unless showUnavailable).
 */
const tierCache = new Map<string, number>();
export function itemTier(id: number, showUnavailable = false, trail: Set<number> = new Set()): number {
  const key = `${id}|${showUnavailable}`; const hit = tierCache.get(key); if (hit !== undefined) return hit;
  const rs = (producedBy.get(id) ?? []).filter((r) => r.product === id && (showUnavailable || recipeAvailable(r)) && !isRepackCycle(r, id));
  if (!rs.length || trail.has(id)) return 0;
  const next = new Set(trail).add(id);
  const tier = 1 + Math.min(...rs.map((r) => Math.max(0, ...r.inputs.map((i) => itemTier(i.id, showUnavailable, next)))));
  tierCache.set(key, tier); return tier;
}
/** Early products: in game, tier 1 or 2, most widely used first. The first things a new pilot can make. */
export function starterProducts(limit = 12, showUnavailable = false): Item[] {
  return industryItems
    .filter((i) => !i.regolith && i.category !== 'Asteroid' && itemAvailable(i.id) && producedBy.has(i.id))
    .map((i) => ({ i, tier: itemTier(i.id, showUnavailable), uses: (usedIn.get(i.id) ?? []).filter((r) => showUnavailable || recipeAvailable(r)).length }))
    .filter((x) => x.tier >= 1 && x.tier <= 2)
    .sort((a, b) => a.tier - b.tier || b.uses - a.uses || a.i.name.localeCompare(b.i.name))
    .slice(0, limit).map((x) => x.i);
}
/** Raw things you mine or salvage that can be refined right away. */
export function starterInputs(limit = 10, showUnavailable = false): Item[] {
  return industryItems
    .filter((i) => isBaseInput(i.id) && conversionsFor(i.id).some((r) => showUnavailable || recipeAvailable(r)))
    .sort((a, b) => Number(!!b.regolith) - Number(!!a.regolith) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// ---------------- Build planner ----------------
export interface PlanNode {
  item: number; qty: number; recipe?: Recipe; runs: number; produced: number; children: PlanNode[]; cycle?: boolean;
}
export type RecipeChoice = (itemId: number, options: Recipe[]) => Recipe | undefined;

export function buildPlan(target: number, qty: number, choose: RecipeChoice, maxDepth = 12, trail: Set<number> = new Set()): PlanNode {
  const options = producedBy.get(target) ?? [];
  const recipe = options.length && trail.size < maxDepth && !trail.has(target) ? choose(target, options) : undefined;
  if (!recipe) return { item: target, qty, runs: 0, produced: qty, children: [], cycle: trail.has(target) && options.length > 0 };
  const per = outputQty(recipe, target) || 1;
  const runs = Math.ceil(qty / per);
  const next = new Set(trail).add(target);
  const children = recipe.inputs.map((i) => buildPlan(i.id, i.qty * runs, choose, maxDepth, next));
  return { item: target, qty, recipe, runs, produced: runs * per, children };
}

export interface PlanSummary {
  base: Map<number, number>;
  intermediates: Map<number, { qty: number; runs: number; recipe: Recipe }>;
  byproducts: Map<number, number>;
  byFacilityRecipe: Map<number, { recipe: Recipe; runs: number; time: number }>;
  serialTime: number;
  steps: number;
}
export function summarizePlan(root: PlanNode): PlanSummary {
  const s: PlanSummary = { base: new Map(), intermediates: new Map(), byproducts: new Map(), byFacilityRecipe: new Map(), serialTime: 0, steps: 0 };
  const walk = (n: PlanNode, isRoot: boolean) => {
    if (!n.recipe) { s.base.set(n.item, (s.base.get(n.item) ?? 0) + n.qty); return; }
    s.serialTime += n.runs * n.recipe.time; s.steps += 1;
    const agg = s.byFacilityRecipe.get(n.recipe.id) ?? { recipe: n.recipe, runs: 0, time: 0 };
    agg.runs += n.runs; agg.time += n.runs * n.recipe.time; s.byFacilityRecipe.set(n.recipe.id, agg);
    if (!isRoot) { const cur = s.intermediates.get(n.item) ?? { qty: 0, runs: 0, recipe: n.recipe }; cur.qty += n.produced; cur.runs += n.runs; s.intermediates.set(n.item, cur); }
    for (const o of n.recipe.outputs) {
      const made = o.qty * n.runs; const needed = o.id === n.item ? n.qty : 0; const extra = made - needed;
      if (extra > 0) s.byproducts.set(o.id, (s.byproducts.get(o.id) ?? 0) + extra);
    }
    n.children.forEach((c) => walk(c, false));
  };
  walk(root, true);
  return s;
}

// ---------------- Yield calculator ----------------
export interface YieldLine { input: number; qty: number; recipe: Recipe; runs: number; used: number; leftover: number; outputs: { id: number; qty: number }[] }
/** Single-input recipes that convert `inputId`, i.e. refining / breakdown. */
export const conversionsFor = (inputId: number): Recipe[] => (usedIn.get(inputId) ?? []).filter((r) => r.inputs.length === 1);
export function computeYield(inputId: number, qty: number, recipe: Recipe): YieldLine {
  const need = recipe.inputs[0].qty; const runs = Math.floor(qty / need);
  return { input: inputId, qty, recipe, runs, used: runs * need, leftover: qty - runs * need, outputs: recipe.outputs.map((o) => ({ id: o.id, qty: o.qty * runs })) };
}

// ---------------- What can I make ----------------
export interface MakeOption { recipe: Recipe; runs: number; missing: { id: number; need: number; have: number }[] }
/**
 * For every recipe in `pool`, how many runs the hold supports and what is short for one run.
 * `runs` is 0 when anything is missing; `missing` lists only the shortfalls.
 */
export function makeOptions(hold: Map<number, number>, pool: Recipe[]): MakeOption[] {
  return pool.map((recipe) => {
    const runs = Math.min(...recipe.inputs.map((i) => Math.floor((hold.get(i.id) ?? 0) / i.qty)));
    const missing = recipe.inputs.filter((i) => (hold.get(i.id) ?? 0) < i.qty).map((i) => ({ id: i.id, need: i.qty, have: hold.get(i.id) ?? 0 }));
    return { recipe, runs: recipe.inputs.length ? runs : 0, missing };
  });
}

// ---------------- Facility comparison ----------------
/** products with more than one distinct recipe among `pool` (usually one per facility class) */
export function multiRecipeProductsIn(pool: Recipe[]): Item[] {
  const by = new Map<number, number>();
  for (const r of pool) by.set(r.product, (by.get(r.product) ?? 0) + 1);
  return [...by.entries()].filter(([, n]) => n > 1).map(([id]) => itemOf(id)).sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------- Material atlas ----------------
export const regoliths: Item[] = industryItems.filter((i) => i.regolith);
export const regolithFamilies: string[] = [...new Set(regoliths.map((r) => r.group))].sort();
export const FAMILY_HINTS: Record<string, string> = {
  'Carbonaceous Regoliths': 'Dark, organic-rich rock. Belts tagged carbonaceous and icy, outer and cold belts, prebiotic systems.',
  'Silicate Regoliths': 'Rocky, feldspar and olivine bearing. Belts tagged rocky, warm inner belts, processed systems.',
  'Metallic Regoliths': 'Nickel-iron and platinum-group bearing. Metal-rich stars, differentiated bodies, inner belts.',
  'Sulfide Regoliths': 'Oxidised sulfide ores such as gossan. Hydrated and warm belts; the main Water Ice source today.',
  'Volatile Regoliths': 'Ices and clathrates. Cold, icy outer belts and trojans beyond the frost line.',
};
