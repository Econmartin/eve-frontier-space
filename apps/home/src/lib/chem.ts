/**
 * Digital Chemistry maths, matching the game client (neotype/recipetransform, recipeinterval and
 * frontier/digitalchemistry/common/vanilla, neotype/craftdefaults). Verified against in-game values: Lens Blank
 * (Synthetic grade) from an Optic matches on all 8 stats, Fuel Stock (D1) deltas match to 4 digits, and a Synthetic
 * Mining Lens's Volatility, Volatility Damage and Duration deltas match the build screen.
 *
 * Values here are always as stored: some properties are stored as log10 (`log`), and formulas read the stored
 * value, taking log10 of it where a term says so. Only display converts back.
 */
import { items, propertyOf, traitOf, type Recipe, type RecipeIO, type Transform } from './industry';

/** Nothing here fills in a value it does not have: a missing input gives NaN, which the page shows as unknown. */

/** stored values for one input stack, keyed by property id */
export type Stack = Record<number, number>;
export type Interval = [number, number];

// ---------------- display ----------------
const UNIT_ABSOLUTE_PERCENT = 127, UNIT_MODIFIER_PERCENT = 109, UNIT_MULTIPLIER = 104, UNIT_MILLISECONDS = 101;
/** stored value -> the number the game shows */
export const shown = (p: number, v: number) => (propertyOf(p)?.log ? 10 ** v : v);
/** 4 significant figures, scientific outside 1e-4..1e9, like the game */
export function fmtNumber(n: number): string {
  const a = Math.abs(n);
  if (n !== 0 && (a < 1e-4 || a >= 1e9)) return n.toExponential(3).replace(/\.?0+e/, 'e').replace('e+', 'e');
  if (a >= 1000) return Math.round(n).toLocaleString();
  return Number(n.toPrecision(4)).toLocaleString(undefined, { maximumFractionDigits: 6 });
}
/** a stored property value formatted the way the game shows it, with its unit */
export function fmtProp(p: number, v: number): string {
  const prop = propertyOf(p); const n = shown(p, v);
  if (prop?.unitID === UNIT_ABSOLUTE_PERCENT) return `${fmtNumber(n * 100)} %`;
  if (prop?.unitID === UNIT_MODIFIER_PERCENT) return `${fmtNumber((n - 1) * 100)} %`;
  if (prop?.unitID === UNIT_MULTIPLIER) return `×${fmtNumber(n)}`;
  if (prop?.unitID === UNIT_MILLISECONDS) return `${fmtNumber(n / 1000)} s`; // the game shows durations in seconds
  return prop?.unit ? `${fmtNumber(n)} ${prop.unit}` : fmtNumber(n);
}

/** the difference between two stored values, in the units the game shows (+0.05 %, −0.1 s…) */
export function fmtDelta(p: number, value: number, base: number): string {
  const unit = propertyOf(p)?.unitID; const d = shown(p, value) - shown(p, base);
  const n = unit === UNIT_ABSOLUTE_PERCENT || unit === UNIT_MODIFIER_PERCENT ? d * 100 : unit === UNIT_MILLISECONDS ? d / 1000 : d;
  const sym = unit === UNIT_ABSOLUTE_PERCENT || unit === UNIT_MODIFIER_PERCENT ? ' %' : unit === UNIT_MILLISECONDS ? ' s' : unit === UNIT_MULTIPLIER ? '' : propertyOf(p)?.unit ? ` ${propertyOf(p)!.unit}` : '';
  return `${n > 0 ? '+' : '−'}${fmtNumber(Math.abs(n))}${sym}`;
}

// ---------------- ranges ----------------
const NONE: Interval = [-Infinity, Infinity];
/** the range a type's variants can have for a property (stored values) */
export function typeRange(id: number, p: number): Interval | undefined {
  const r = items.get(id)?.props?.find((x) => x.id === p);
  return r ? [r.min, r.max] : undefined;
}
/** what a slot accepts for a property from a given material: the material's own range, narrowed by the slot's trait */
export function slotRange(input: RecipeIO, material: number, p: number): Interval {
  let [lo, hi] = typeRange(material, p) ?? NONE;
  const need = input.trait !== undefined ? traitOf(input.trait)?.needs.find((n) => n.prop === p) : undefined;
  if (need?.min !== undefined) lo = Math.max(lo, need.min);
  if (need?.max !== undefined) hi = Math.min(hi, need.max);
  return [lo, hi];
}
/** can this material go in the slot: always (every variant fits the trait), sometimes, or never */
export function fit(input: RecipeIO, material: number): 'always' | 'sometimes' | 'never' {
  if (input.trait === undefined) return material === input.id ? 'always' : 'never';
  let always = true;
  for (const n of traitOf(input.trait)?.needs ?? []) {
    const r = typeRange(material, n.prop); if (!r) return 'never';
    const [lo, hi] = [n.min ?? -Infinity, n.max ?? Infinity];
    if (r[1] < lo || r[0] > hi) return 'never';
    if (r[0] < lo || r[1] > hi) always = false;
  }
  return always ? 'always' : 'sometimes';
}
/** materials that can fill a slot, best fit first; with `needs`, only those that carry every one of those properties */
export function candidates(input: RecipeIO, needs: number[] = []): { id: number; fit: 'always' | 'sometimes' }[] {
  const ids = input.trait !== undefined ? [...new Set([...(input.id > 0 ? [input.id] : []), ...(traitOf(input.trait)?.members ?? [])])] : [input.id];
  return ids.filter((id) => input.trait === undefined || needs.every((p) => typeRange(id, p)))
    .map((id) => ({ id, fit: fit(input, id) })).filter((c): c is { id: number; fit: 'always' | 'sometimes' } => c.fit !== 'never')
    // the item a slot names comes first, then whatever always fits
    .sort((a, b) => Number(b.id === input.id) - Number(a.id === input.id) || Number(b.fit === 'always') - Number(a.fit === 'always') || (items.get(a.id)?.name ?? '').localeCompare(items.get(b.id)?.name ?? ''));
}
/**
 * The game's standard ("vanilla") value of a property for a type: for a crafted part, what its main schema makes
 * from standard inputs (worked out by the game's own code at extract time); otherwise the middle of its range.
 */
export function vanilla(id: number, p: number): number {
  const std = items.get(id)?.std?.[p];
  if (std !== undefined) return std;
  const r = typeRange(id, p); return r ? (r[0] + r[1]) / 2 : NaN;
}
/** the game's standard stack of a material: what the build screen's deltas compare with */
export function vanillaStack(material: number, props: number[]): Stack {
  return Object.fromEntries(props.map((p) => [p, vanilla(material, p)]));
}
/** where the sliders start: the standard stack, kept inside what the slot accepts */
export function standardStack(input: RecipeIO, material: number, props: number[]): Stack {
  const s: Stack = {};
  for (const p of props) {
    const [lo, hi] = slotRange(input, material, p); const v = vanilla(material, p);
    s[p] = Number.isFinite(lo) && Number.isFinite(hi) ? Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : (lo + hi) / 2)) : NaN;
  }
  return s;
}

// ---------------- evaluation ----------------
function curve(x: number, b: [number, number][]): number {
  if (x <= b[0][0]) return b[0][1];
  for (let i = 1; i < b.length; i++) if (x <= b[i][0]) { const [x0, y0] = b[i - 1], [x1, y1] = b[i]; return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  return b[b.length - 1][1];
}
const term = (v: number, log: number) => (log ? (v > 0 ? Math.log10(v) : NaN) : v);
/** one output stat from the stacks in each slot (keyed by slot number) */
export function evaluate(t: Transform, stacks: Record<number, Stack>): number {
  const sum = t.s.reduce((acc, [slot, p, coef, log]) => acc + coef * term(stacks[slot]?.[p] ?? NaN, log), t.op === 'b' ? 0 : t.c ?? 0);
  const v = t.op === 'b' ? curve(sum, t.b!) : sum;
  return t.e ? 10 ** v : v;
}
/** the lowest and highest an output stat can reach, given each slot's allowed range per property */
export function reach(t: Transform, ranges: Record<number, Record<number, Interval>>): Interval {
  const iv = (slot: number, p: number, log: number): Interval => { const [a, b] = ranges[slot]?.[p] ?? [NaN, NaN]; return [term(a, log), term(b, log)]; };
  let lo = t.op === 'b' ? 0 : t.c ?? 0, hi = lo;
  for (const [slot, p, coef, log] of t.s) { const [a, b] = iv(slot, p, log); lo += Math.min(coef * a, coef * b); hi += Math.max(coef * a, coef * b); }
  if (t.op === 'b') {
    // a curve over the summed terms: its lowest and highest lie at the ends or at a breakpoint in between
    const ys = [lo, hi, ...t.b!.map(([x]) => x).filter((x) => x > lo && x < hi)].map((x) => curve(x, t.b!));
    lo = Math.min(...ys); hi = Math.max(...ys);
  }
  return t.e ? [10 ** lo, 10 ** hi] : [lo, hi];
}
/** values that push one stat to its highest (or lowest) within the ranges; other properties are left alone */
export function extreme(t: Transform, ranges: Record<number, Record<number, Interval>>, stacks: Record<number, Stack>, up: boolean): Record<number, Stack> {
  const next: Record<number, Stack> = Object.fromEntries(Object.entries(stacks).map(([k, v]) => [k, { ...v }]));
  if (t.op === 'b') {
    const [slot, p, , log] = t.s[0]; const [a, b] = ranges[slot]?.[p] ?? [0, 0];
    const xs = [a, b, ...t.b!.map(([x]) => (log ? 10 ** x : x)).filter((x) => x > a && x < b)];
    const best = xs.reduce((m, x) => { const y = curve(term(x, log), t.b!); return (up ? y > m.y : y < m.y) ? { x, y } : m; }, { x: a, y: up ? -Infinity : Infinity });
    (next[slot] ??= {})[p] = best.x;
  } else for (const [slot, p, coef] of t.s) { const [a, b] = ranges[slot]?.[p] ?? [0, 0]; (next[slot] ??= {})[p] = (coef > 0) === up ? b : a; }
  return next;
}

// ---------------- module stats ----------------
/**
 * A module stat for the materials actually chosen: each term reads from the slot the schema wires it to, or from the
 * inputs whose material carries the term's trait (averaged where the game averages). Terms nobody carries are
 * reported in `missing` rather than counted as zero.
 */
export function resolveDerived(t: Transform, slots: { slot: number; material: number; trait?: number }[]): { tf: Transform; missing: number[] } {
  if (!t.r) return { tf: t, missing: [] };
  const carries = (s: { material: number; trait?: number }, tr?: number) => tr !== undefined && ((items.get(s.material)?.nt ?? []).includes(tr) || s.trait === tr);
  const rows: Transform['s'] = []; const missing: number[] = [];
  for (const term of t.r) {
    const from = term.w !== undefined ? slots.filter((s) => s.slot === term.w) : slots.filter((s) => carries(s, term.t));
    if (!from.length) { if (term.t !== undefined) missing.push(term.t); continue; }
    for (const s of from) rows.push([s.slot, term.p, term.k * (term.a ? 1 / from.length : 1), term.g ? 1 : 0]);
  }
  return { tf: { ...t, s: rows }, missing };
}
/** curve direction over its whole range: rising, falling, or neither (best somewhere in between) */
export function trend(b: [number, number][]): 'rising' | 'falling' | 'mixed' {
  const ys = b.map(([, y]) => y); const up = ys.every((y, i) => i === 0 || y >= ys[i - 1]), down = ys.every((y, i) => i === 0 || y <= ys[i - 1]);
  return up && !down ? 'rising' : down && !up ? 'falling' : 'mixed';
}

// ---------------- how the game labels a value ----------------
export type Level = 'extremely low' | 'very low' | 'low' | 'high' | 'very high' | 'extremely high';
/** "Very high" and the rest, against a type's range and its standard value (the middle unless the game builds one) */
export function level(value: number, range: Interval | undefined, standard?: number): Level | undefined {
  if (!range || !Number.isFinite(value)) return undefined;
  const [lo, hi] = range; const mid = standard !== undefined && Number.isFinite(standard) ? standard : (lo + hi) / 2;
  if (!(hi > lo) || Math.abs(value - mid) < 0.05 * (hi - lo)) return undefined;
  const up = value > mid; const far = Math.abs(value - mid) / Math.abs((up ? hi : lo) - mid);
  return `${far >= 0.75 ? 'extremely ' : far >= 0.5 ? 'very ' : ''}${up ? 'high' : 'low'}` as Level;
}

// ---------------- a schema as a tuning problem ----------------
/** input properties each slot needs, from the schema's formulas */
export function slotProps(r: Recipe): Record<number, number[]> {
  const by: Record<number, Set<number>> = {};
  for (const t of r.tf ?? []) for (const [slot, p] of t.s) (by[slot] ??= new Set()).add(p);
  return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, [...v]]));
}
/** schemas whose output stats depend on what you put in */
export const tunable = (r: Recipe) => r.kind === 'manufacturing' && (r.tf ?? []).some((t) => t.s.length > 0);
