import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtQty, industryItems, itemName, itemOf, producedBy, propertyOf, traitOf, type Recipe, type RecipeIO, type Transform } from '@/lib/industry';
import {
  candidates, evaluate, fmtDelta, fmtNumber, fmtProp, level, reach, resolveDerived, shown, slotProps, slotRange, standardStack, tunable, typeRange, vanilla, vanillaStack,
  type Interval, type Level, type Stack,
} from '@/lib/chem';
import { Empty, ItemIcon, ItemLink, ItemPicker, Panel, Section, Select, SuggestionChips } from '../parts';

const made = (id: number) => (producedBy.get(id) ?? []).filter((r) => r.kind === 'manufacturing');
const POOL = industryItems.filter((i) => made(i.id).length);
// everything you print: most stats follow what goes in, some are set to one value by the schema
const statCount = (id: number) => Math.max(0, ...made(id).map((r) => (r.tf ?? []).filter((t) => t.s.length).length));
const SUGGESTIONS = [...POOL].sort((a, b) => statCount(b.id) - statCount(a.id) || a.name.localeCompare(b.name)).slice(0, 10);
const LEVEL_TONE: Record<Level, string> = {
  'extremely low': 'text-[var(--color-martian-500)]', 'very low': 'text-[var(--color-martian-500)]', low: 'text-muted-foreground',
  high: 'text-muted-foreground', 'very high': 'text-[var(--color-ocean-500)]', 'extremely high': 'text-[var(--color-ocean-500)]',
};
const pickItem = (setParams: ReturnType<typeof useSearchParams>[1]) => (id: number) => { const p = new URLSearchParams(); p.set('item', String(id)); setParams(p, { replace: true }); };

/** Pick something to make, adjust the stacks that go in, and see the stats that come out, as the game works them out. */
export function TunePage() {
  const [params, setParams] = useSearchParams();
  const id = params.get('item') ? Number(params.get('item')) : undefined;
  const options = id ? made(id) : [];
  const recipe = options.find((r) => String(r.id) === params.get('schema')) ?? options.find(tunable) ?? options[0];
  const pick = pickItem(setParams);
  return (
    <div className="flex flex-col gap-4">
      <Panel className="flex flex-col gap-3">
        <ItemPicker pool={POOL} placeholder="What do you want to make? Needle, Lens Blank, D1 Fuel…" onPick={(it) => pick(it.id)} clearOnPick={false} value={id ? itemName(id) : ''} />
        <SuggestionChips label="Most stats to tune" items={SUGGESTIONS} onPick={(it) => pick(it.id)} />
      </Panel>
      {!id || !recipe ? (
        <Empty>Pick something you make. You get every stat its schema works out from what goes in, the range each one can reach, and sliders for the stacks you put in. Push a stat to its best and the sliders show what material it takes, then where to mine it.</Empty>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <ItemIcon id={id} size={44} className="rounded-lg" />
              <div><div className="text-xs tracking-[0.16em] uppercase text-muted-foreground">{itemOf(id).group}</div><h2 className="text-2xl font-bold leading-none">Tune {itemName(id)}</h2></div>
            </div>
            {options.length > 1 && <Select ariaLabel="schema" value={String(recipe.id)} onChange={(v) => { const p = new URLSearchParams(params); p.set('schema', v); setParams(p, { replace: true }); }}
              options={options.map((r) => ({ value: String(r.id), label: `Schema ${r.id} · ${r.inputs.map((i) => itemName(i.id)).join(', ')}` }))} />}
          </div>
          {tunable(recipe) ? <Tuner key={recipe.id} recipe={recipe} /> : <Fixed recipe={recipe} />}
        </>
      )}
    </div>
  );
}

/** Items whose schema sets every stat to one value: what goes in does not change them. */
function Fixed({ recipe }: { recipe: Recipe }) {
  const rows = Object.entries(recipe.fx ?? {}).map(([p, v]) => [Number(p), v] as const);
  return (
    <Panel className="p-4 flex flex-col gap-3">
      <p className="text-sm text-muted-foreground font-sans">What goes in does not change this one: the schema sets each stat to one value, so every stack comes out the same.</p>
      {rows.length ? (
        <ul className="divide-y divide-foreground/5 text-sm">
          {rows.map(([p, v]) => <li key={p} className="py-1.5 flex justify-between gap-3"><span>{propertyOf(p)?.name ?? `property ${p}`}</span><span className="tabular-nums">{fmtProp(p, v)}</span></li>)}
        </ul>
      ) : <Empty>The schema lists no stats for it.</Empty>}
    </Panel>
  );
}

// ---------------- the build as a tree: each slot, and what its part is printed from, down to raw materials ----------------
type Up = { recipe: Recipe; out: number };
/** The schema that prints this material from parts, if any (Optic from a Mineral Density material, Beam Head from three). */
function upstreamFor(material: number): Up | undefined {
  const r = made(material).find(tunable);
  return r ? { recipe: r, out: r.outputs.findIndex((o) => o.id === material) } : undefined;
}
/** for each slot of the upstream schema, the properties it reads to produce the ones we need */
function feeding(up: Up, need: number[]): Record<number, number[]> {
  const by: Record<number, Set<number>> = {};
  for (const t of up.recipe.tf ?? []) if (t.o === up.out && !t.d && need.includes(t.p)) for (const [slot, p] of t.s) (by[slot] ??= new Set()).add(p);
  return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, [...v]]));
}
/** whether going through the printing schema gives anything to adjust for these properties */
const hasParts = (material: number, need: number[]) => { const up = upstreamFor(material); return !!up && Object.values(feeding(up, need)).some((ps) => ps.length); };
/** what a slot starts with: the material the game's standard build uses there, else the best fit */
function firstMaterial(recipe: Recipe, input: RecipeIO, need: number[]): number {
  const cands = candidates(input, need); const std = recipe.std?.[input.slot ?? -1];
  return std !== undefined && cands.some((c) => c.id === std) ? std : cands[0]?.id ?? input.id;
}

/** One stack in the build. A printed part is either opened up into the stacks it is printed from, or set directly. */
interface BuildNode { material: number; open: boolean; values: Stack; kids: Record<number, BuildNode> }
type Build = Record<number, BuildNode>;
const MAX_DEPTH = 6;

/** a fresh stack at the game's standard; printed parts open all the way down to what they are made from */
function fresh(input: RecipeIO, material: number, need: number[], seen: number[] = [], open = true): BuildNode {
  const values = standardStack(input, material, need);
  const up = open && seen.length < MAX_DEPTH && !seen.includes(material) && hasParts(material, need) ? upstreamFor(material) : undefined;
  if (!up) return { material, open: false, values, kids: {} };
  const kids: Build = {};
  for (const [slot, props] of Object.entries(feeding(up, need))) {
    const inp = up.recipe.inputs.find((i) => i.slot === Number(slot)); if (!inp || !props.length) continue;
    kids[Number(slot)] = fresh(inp, firstMaterial(up.recipe, inp, props), props, [...seen, material]);
  }
  return { material, open: true, values, kids };
}
function setAt(b: Build, path: number[], fn: (n: BuildNode) => BuildNode): Build {
  const [h, ...rest] = path;
  return { ...b, [h]: rest.length ? { ...b[h], kids: setAt(b[h].kids, rest, fn) } : fn(b[h]) };
}

/** a stack as the page sees it: what it passes up, the range it can reach, and how much of it one run needs */
interface View { input: RecipeIO; need: number[]; node: BuildNode; up?: Up; stack: Stack; ranges: Record<number, Interval>; kids: View[]; path: number[]; seen: number[]; qty: number }
function viewOf(input: RecipeIO, node: BuildNode, need: number[], path: number[], seen: number[], qty: number): View {
  const up = node.open ? upstreamFor(node.material) : undefined;
  if (!up) return { input, need, node, stack: node.values, ranges: Object.fromEntries(need.map((p) => [p, slotRange(input, node.material, p)])), kids: [], path, seen, qty };
  const feeds = feeding(up, need); const runs = qty / (up.recipe.outputs[up.out]?.qty || 1);
  const kids = Object.entries(node.kids).map(([k, n]) => {
    const inp = up.recipe.inputs.find((i) => i.slot === Number(k))!;
    return viewOf(inp, n, feeds[Number(k)] ?? [], [...path, Number(k)], [...seen, node.material], runs * inp.qty);
  });
  const values = Object.fromEntries(kids.map((v) => [v.path[v.path.length - 1], v.stack])) as Record<number, Stack>;
  const rangesBy = Object.fromEntries(kids.map((v) => [v.path[v.path.length - 1], v.ranges])) as Record<number, Record<number, Interval>>;
  const own = standardStack(input, node.material, need);
  const stack: Stack = {}, ranges: Record<number, Interval> = {};
  for (const p of need) {
    const t = up.recipe.tf?.find((x) => x.o === up.out && !x.d && x.p === p);
    stack[p] = t ? evaluate(t, values) : own[p];
    ranges[p] = t ? reach(t, rangesBy) : [own[p], own[p]];
  }
  return { input, need, node, up, stack, ranges, kids, path, seen, qty };
}
/** how far a value can move; a range only rounding wide counts as none */
const widthOf = (v: View, p: number) => { const [lo, hi] = v.ranges[p] ?? [0, 0]; const w = hi - lo; return w > 1e-9 * Math.max(1, Math.abs(hi), Math.abs(lo)) ? w : 0; };
/** can anything under this stack change what it passes up */
const adjustable = (v: View): boolean => (v.up ? v.kids.some(adjustable) : v.need.some((p) => widthOf(v, p) > 0));
const leavesOf = (vs: View[]): View[] => vs.flatMap((v) => (v.up ? leavesOf(v.kids) : [v]));
/** a schema stat that is just the material's own value copied through */
const copied = (t: Transform) => t.op === 'l' && !t.e && !(t.c ?? 0) && t.s.length === 1 && t.s[0][1] === t.p && t.s[0][2] === 1 && !t.s[0][3];

function Tuner({ recipe }: { recipe: Recipe }) {
  const props = useMemo(() => slotProps(recipe), [recipe]);
  const slots = useMemo(() => recipe.inputs.filter((i) => props[i.slot ?? -1]), [recipe, props]);
  const start = () => Object.fromEntries(slots.map((i) => [i.slot!, fresh(i, firstMaterial(recipe, i, props[i.slot!]), props[i.slot!])])) as Build;
  const [build, setBuild] = useState<Build>(start);
  const viewsOf = (b: Build) => slots.map((i) => viewOf(i, b[i.slot!], props[i.slot!], [i.slot!], [], i.qty));
  const views = viewsOf(build);
  const stacksOf = (vs: View[]) => Object.fromEntries(vs.map((v) => [v.path[0], v.stack])) as Record<number, Stack>;
  const stacks = stacksOf(views);
  const ranges = Object.fromEntries(views.map((v) => [v.path[0], v.ranges])) as Record<number, Record<number, Interval>>;
  // the game's "standard": each slot's material as the game's standard stack of it (a crafted part's own standard build)
  const standard = Object.fromEntries(slots.map((i) => [i.slot!, vanillaStack(build[i.slot!].material, props[i.slot!])])) as Record<number, Stack>;
  // stats that cannot move here (every input fixed, or nothing chosen carries them) go last, and dead zeros are dropped
  const moves = (t: Transform) => { const [lo, hi] = reach(t, ranges); return hi - lo > 1e-12 * Math.max(1, Math.abs(hi)); };
  const chosen = slots.map((i) => ({ slot: i.slot!, material: build[i.slot!].material, trait: i.trait }));
  const resolved = (recipe.tf ?? []).filter((t) => t.s.length).map((t) => (t.d ? resolveDerived(t, chosen) : { tf: t, missing: [] as number[] }));
  const stats = resolved.filter((x) => x.missing.length || moves(x.tf) || Math.abs(evaluate(x.tf, stacks)) > 1e-12).sort((a, b) => Number(moves(b.tf)) - Number(moves(a.tf)));
  const moduleStats = stats.filter((x) => x.tf.d && !x.missing.length), partStats = stats.filter((x) => !x.tf.d);
  // module stats no part in this build can feed: named once, not a row each
  const unfed = stats.filter((x) => x.tf.d && x.missing.length);
  const copies = partStats.filter((x) => copied(x.tf)).length;
  const score = (t: Transform, b: Build) => evaluate(t, stacksOf(viewsOf(b)));
  const better = (up: boolean, y: number, than: number) => Number.isFinite(y) && (!Number.isFinite(than) || (up ? y > than + 1e-12 : y < than - 1e-12));
  /** every adjustable value in the build at either end of its range, keeping whatever moves the stat the right way */
  const pushValues = (t: Transform, up: boolean, b: Build) => {
    let next = b;
    for (let pass = 0; pass < 2; pass++) for (const leaf of leavesOf(viewsOf(next))) for (const q of leaf.need) {
      const [lo, hi] = leaf.ranges[q] ?? [0, 0]; if (!(hi > lo)) continue;
      const at = (x: number) => setAt(next, leaf.path, (n) => ({ ...n, values: { ...n.values, [q]: x } }));
      const [a, c] = [at(lo), at(hi)]; const [ya, yc] = [score(t, a), score(t, c)];
      if (Math.abs(yc - ya) < 1e-12) continue; // this value does not move the stat: leave it where it is
      next = (up ? yc > ya : yc < ya) ? c : a;
    }
    return next;
  };
  /** push one stat: for each material slot try every material that fits, each pushed as far as it goes, and keep the best */
  const push = (t: Transform, up: boolean) => setBuild((b) => {
    let next = pushValues(t, up, b);
    for (const leaf of leavesOf(viewsOf(next))) {
      for (const c of candidates(leaf.input, leaf.need)) {
        if (c.id === leaf.node.material || leaf.seen.includes(c.id)) continue; // not the part this slot is building
        const alt = pushValues(t, up, setAt(next, leaf.path, () => fresh(leaf.input, c.id, leaf.need, leaf.seen)));
        if (better(up, score(t, alt), score(t, next))) next = alt;
      }
    }
    return next;
  });
  const act: Actions = {
    material: (v, m) => setBuild((b) => setAt(b, v.path, () => fresh(v.input, m, v.need, v.seen))),
    open: (v, open) => setBuild((b) => setAt(b, v.path, (n) => fresh(v.input, n.material, v.need, v.seen, open))),
    value: (v, p, x) => setBuild((b) => setAt(b, v.path, (n) => ({ ...n, values: { ...n.values, [p]: x } }))),
  };
  const rows = (list: { tf: Transform; missing: number[] }[]) => list.map(({ tf, missing }) => <StatRow key={`${tf.o}:${tf.p}:${tf.d ?? 0}`} t={tf} missing={missing} recipe={recipe} stacks={stacks} standard={standard} ranges={ranges} onPush={(up) => push(tf, up)} />);
  const live = views.filter(adjustable), still = views.filter((v) => !adjustable(v));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
      <div className="flex flex-col gap-4 lg:order-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
        {moduleStats.length + unfed.length > 0 && <Section title="Module stats" className="mb-0">
          {moduleStats.length > 0 && <Panel className="p-0 overflow-hidden"><ul className="divide-y divide-foreground/5">{rows(moduleStats)}</ul></Panel>}
          {unfed.length > 0 && <p className="text-xs text-muted-foreground font-sans mt-2">
            Not set by this build: {unfed.map((x) => (x.tf.d && propertyOf(x.tf.p)?.stat) || propertyOf(x.tf.p)?.name).join(', ')}. They read a part with the {[...new Set(unfed.flatMap((x) => x.missing))].map((m) => traitOf(m)?.name).join(', ')} trait{unfed.length > 1 ? 's' : ''}, and none of the parts chosen carries one.
          </p>}
          <p className="text-xs text-muted-foreground font-sans mt-2">What the module does, from the game's own formulas reading each part's ratings. Checked against a Synthetic Mining Lens built in game. Push one with the arrows and the build on the left moves to match, trying every material that fits each slot.</p>
        </Section>}
        <LookFor views={views} />
        <Section title={moduleStats.length ? 'Part ratings' : 'What comes out'} className="mb-0">
          {partStats.length > 0 && <Panel className="p-0 overflow-hidden"><ul className="divide-y divide-foreground/5">{rows(partStats)}</ul></Panel>}
          <p className="text-xs text-muted-foreground font-sans mt-2">
            {copies > 0 && <>{copies === partStats.length ? 'This schema copies these straight from what goes in' : `${copies} of these are copied straight from what goes in`}, so they follow the sliders one to one. </>}
            Worked out with the schema's own formulas, checked against in-game Lens Blank and Fuel Stock builds. The bar is everything the build can reach with the materials chosen (another material can reach further); the tick is the game's standard.
          </p>
        </Section>
      </div>
      <Section title="Your build" className="mb-0 lg:order-1" aside={<button onClick={() => setBuild(start())} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><RotateCcw className="size-3" />back to standard</button>}>
        <div className="flex flex-col gap-3">
          {live.map((v) => <NodeCard key={v.path.join('.')} v={v} act={act} top />)}
          <Unchanging views={still} />
        </div>
      </Section>
    </div>
  );
}

interface Actions { material: (v: View, m: number) => void; open: (v: View, open: boolean) => void; value: (v: View, p: number, x: number) => void }
const perRun = (v: View) => `${fmtQty(v.qty, v.node.material)} per run`;

/** stacks that cannot change anything here, in one quiet line */
function Unchanging({ views }: { views: View[] }) {
  if (!views.length) return null;
  return (
    <div className="text-xs text-muted-foreground">
      Also goes in, but changes nothing here: {views.map((v, i) => <span key={v.path.join('.')}>{i > 0 && ', '}<ItemLink id={v.node.material} /> ({fmtQty(v.qty, v.node.material)})</span>)}
    </div>
  );
}

/** one stack in the build: a part opened into what it is printed from, or a stack you set with sliders */
function NodeCard({ v, act, top }: { v: View; act: Actions; top?: boolean }) {
  // a part never goes into its own schema further down the same build
  const cands = candidates(v.input, v.need).filter((c) => !v.seen.includes(c.id));
  const canOpen = v.seen.length < MAX_DEPTH && !v.seen.includes(v.node.material) && hasParts(v.node.material, v.need);
  const live = v.kids.filter(adjustable), still = v.kids.filter((k) => !adjustable(k));
  return (
    <div className={cn('flex flex-col gap-3', top ? 'rounded-2xl ring-1 ring-foreground/10 bg-foreground/[0.02] p-4' : 'rounded-xl ring-1 ring-foreground/10 p-3')}>
      <div className="flex items-center gap-3 flex-wrap">
        <ItemIcon id={v.node.material} size={top ? 32 : 24} className="rounded-md" />
        <div className="min-w-0 flex-1">
          <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">{v.input.trait !== undefined ? itemName(v.input.id) : itemName(v.node.material)} · {perRun(v)}</div>
          {cands.length > 1 ? (
            <Select ariaLabel="material" value={String(v.node.material)} onChange={(x) => act.material(v, Number(x))} className="mt-1 max-w-full"
              options={cands.map((c) => ({ value: String(c.id), label: `${itemName(c.id)}${c.fit === 'sometimes' ? ' (some stacks fit)' : ''}` }))} />
          ) : <ItemLink id={v.node.material} className="font-heading" />}
        </div>
        {canOpen && (
          <div className="flex rounded-lg ring-1 ring-foreground/15 overflow-hidden text-xs" role="group" aria-label="how to set it">
            {[{ open: true, label: 'from its parts' }, { open: false, label: 'set directly' }].map((o) => (
              <button key={String(o.open)} onClick={() => act.open(v, o.open)} className={cn('px-2.5 py-1', v.node.open === o.open ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground')}>{o.label}</button>
            ))}
          </div>
        )}
      </div>
      {v.up ? (
        <>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
            <span>Comes out as</span>
            {v.need.filter((p) => Number.isFinite(v.stack[p])).map((p) => <span key={p} className="tabular-nums text-foreground">{propertyOf(p)?.name} {fmtProp(p, v.stack[p])}</span>)}
          </div>
          <div className="flex flex-col gap-3 border-l-2 border-foreground/10 pl-3">
            {live.map((k) => <NodeCard key={k.path.join('.')} v={k} act={act} />)}
            <Unchanging views={still} />
          </div>
        </>
      ) : <Sliders v={v} act={act} />}
    </div>
  );
}

/** sliders for a stack you set directly; values its material can only have one way are listed, not slid */
function Sliders({ v, act }: { v: View; act: Actions }) {
  const standard = standardStack(v.input, v.node.material, v.need);
  const moving = v.need.filter((p) => widthOf(v, p) > 0), fixed = v.need.filter((p) => !(widthOf(v, p) > 0));
  return (
    <div className="flex flex-col gap-2.5">
      {moving.map((p) => {
        const [lo, hi] = v.ranges[p]; const x = v.node.values[p] ?? standard[p];
        return (
          <label key={p} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm"><span>{propertyOf(p)?.name}</span><span className={cn('tabular-nums', Math.abs(x - standard[p]) > 1e-12 && 'text-[var(--color-martian-500)]')}>{fmtProp(p, x)}</span></div>
            <input type="range" min={lo} max={hi} step={(hi - lo) / 400} value={x} onChange={(e) => act.value(v, p, Number(e.target.value))} className="w-full accent-[var(--color-martian-500)]" aria-label={propertyOf(p)?.name} />
            <div className="flex justify-between text-[0.65rem] text-muted-foreground tabular-nums"><span>{fmtProp(p, lo)}</span><span>{fmtProp(p, hi)}</span></div>
          </label>
        );
      })}
      {fixed.length > 0 && <div className="text-xs text-muted-foreground">Always the same for {itemName(v.node.material)}: {fixed.map((p) => `${propertyOf(p)?.name} ${fmtProp(p, v.stack[p] ?? standard[p])}`).join(', ')}</div>}
      {moving.length > 0 && <Sources material={v.node.material} props={moving} target={v.node.values} ranges={v.ranges} folded />}
    </div>
  );
}

/** The build as a gathering list: for every material you set, the ore that refines closest to it and where it is mined. */
function LookFor({ views }: { views: View[] }) {
  const leaves = leavesOf(views).filter((v) => v.need.some((p) => widthOf(v, p) > 0));
  const rows = leaves.map((v) => ({ v, best: oreMatches(v.node.material, v.need.filter((p) => widthOf(v, p) > 0), v.node.values, v.ranges).matches[0] }))
    .filter((r): r is { v: View; best: OreMatch } => !!r.best);
  if (!rows.length) return null;
  return (
    <Section title="What to look for" className="mb-0">
      <Panel className="p-0 overflow-hidden">
        <ul className="divide-y divide-foreground/5">
          {rows.map(({ v, best }) => (
            <li key={v.path.join('.')} className="px-4 py-3 flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2 text-sm">
                <ItemIcon id={v.node.material} size={20} /><ItemLink id={v.node.material} />
                <span className="text-muted-foreground tabular-nums ml-auto">{fmtQty(v.qty, v.node.material)} per run</span>
              </div>
              <div>
                <span className="text-muted-foreground">from </span><ItemLink id={best.ore} className="font-semibold" />
                <span className="text-muted-foreground"> with </span>
                {best.look.map((l, i) => <span key={l.prop}>{i > 0 && ', '}{propertyOf(l.prop)?.name} ≈ <span className="tabular-nums font-semibold">{fmtProp(l.prop, l.value)}</span>{lookEnd(l)}</span>)}
                <span className={cn('ml-2', best.hits === best.got.length ? 'text-[var(--color-ocean-500)]' : 'text-muted-foreground')}>matches {best.hits} of {best.got.length} it affects</span>
              </div>
              {(itemOf(best.ore).minedFrom ?? []).length > 0 && <div className="text-muted-foreground">in {(itemOf(best.ore).minedFrom ?? []).slice(0, 3).map(([rock, a]) => `${rock} ${ABUNDANCE[a] ?? ''}`).join(', ')}</div>}
            </li>
          ))}
        </ul>
      </Panel>
      <p className="text-xs text-muted-foreground font-sans mt-2">The best ore for each material at the values in your build; the cards on the left list the others.</p>
    </Section>
  );
}

function StatRow({ t, missing, recipe, stacks, standard, ranges, onPush }: { t: Transform; missing: number[]; recipe: Recipe; stacks: Record<number, Stack>; standard: Record<number, Stack>; ranges: Record<number, Record<number, Interval>>; onPush: (up: boolean) => void }) {
  const value = evaluate(t, stacks), base = evaluate(t, standard), [lo, hi] = reach(t, ranges);
  const out = recipe.outputs[t.o]?.id ?? recipe.product;
  // the game labels a stat against the output type's range and its standard value (stored like the inputs: log10 where flagged)
  const lvl = level(value, typeRange(out, t.p), vanilla(out, t.p));
  const name = (t.d && propertyOf(t.p)?.stat) || propertyOf(t.p)?.name;
  const pos = (v: number) => (hi > lo ? Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100)) : 50);
  // standards are stored to 7 figures, so anything smaller than that is rounding, not a difference
  const delta = shown(t.p, value) - shown(t.p, base);
  const differs = Math.abs(delta) > 1e-5 * Math.max(Math.abs(shown(t.p, value)), Math.abs(shown(t.p, base)), 1e-9);
  if (missing.length || !Number.isFinite(value)) return (
    <li className="px-4 py-3 flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3"><span className="text-sm">{name}</span><span className="tabular-nums text-muted-foreground">—</span></div>
      <div className="text-xs text-muted-foreground">{missing.length ? `Needs an input with the ${[...new Set(missing)].map((m) => traitOf(m)?.name).join(', ')} trait; none of the materials chosen carries it.` : 'Unknown: a material chosen has no value for a property this needs.'}</div>
    </li>
  );
  return (
    <li className="px-4 py-3 flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{name}{recipe.outputs.length > 1 && <span className="text-muted-foreground"> · {itemName(out)}</span>}</span>
        <span className="tabular-nums font-semibold">{fmtProp(t.p, value)}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onPush(false)} title="push this stat to its lowest" className="text-muted-foreground hover:text-foreground"><ArrowDown className="size-3.5" /></button>
        <div className="relative h-1.5 flex-1 rounded-full bg-foreground/10">
          <div className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-foreground/40" style={{ left: `${pos(base)}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2.5 rounded-full bg-[var(--color-martian-500)]" style={{ left: `${pos(value)}%` }} />
        </div>
        <button onClick={() => onPush(true)} title="push this stat to its highest" className="text-muted-foreground hover:text-foreground"><ArrowUp className="size-3.5" /></button>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground tabular-nums">
        <span title="everything the build can reach with the materials chosen">{fmtProp(t.p, lo)} – {fmtProp(t.p, hi)}</span>
        <span>
          {differs && <span className={delta > 0 ? 'text-[var(--color-ocean-500)]' : 'text-[var(--color-martian-500)]'}>{fmtDelta(t.p, value, base)} vs standard</span>}
          {lvl && <span className={cn('ml-2', LEVEL_TONE[lvl])}>{lvl[0].toUpperCase() + lvl.slice(1)}</span>}
        </span>
      </div>
    </li>
  );
}

// ---------------- where to mine it ----------------
interface OreMatch {
  ore: number;
  /** the ore property to look for and the value that gets closest to what you set */
  look: { prop: number; value: number; range: Interval }[];
  /** what the material comes out as at those values, against what you set */
  got: { prop: number; value: number; want: number; hit: boolean }[];
  hits: number; err: number;
}
/**
 * For each ore that refines into this material, the ore stack that gets its refined material closest to the values
 * set on the sliders. The refining schema ties each material property to one ore property through a curve, so
 * every ore property is solved on its own: sweep it across the ore's range and keep the best value. Properties
 * you moved off standard count ten times as much as the ones you left alone, so the ore follows what you asked for.
 */
function oreMatches(material: number, props: number[], target: Stack, ranges: Record<number, Interval>): { matches: OreMatch[]; unlinked: number[] } {
  const ores = (producedBy.get(material) ?? []).filter((r) => r.kind === 'reprocessing' && !r.legacy && itemOf(r.inputs[0].id).regolith);
  const matches: OreMatch[] = []; const unlinked: number[] = [];
  for (const r of ores) {
    const ore = r.inputs[0].id; const o = r.outputs.findIndex((x) => x.id === material);
    const curves = (r.tf ?? []).filter((t) => t.o === o && t.op === 'b' && props.includes(t.p) && Number.isFinite(target[t.p]));
    if (!curves.length) { unlinked.push(ore); continue; }
    const width = (p: number) => { const [lo, hi] = ranges[p] ?? [0, 0]; return hi - lo; };
    const by = new Map<number, Transform[]>();
    for (const t of curves) by.set(t.s[0][1], [...(by.get(t.s[0][1]) ?? []), t]);
    const m: OreMatch = { ore, look: [], got: [], hits: 0, err: 0 };
    for (const [q, ts] of by) {
      const range = typeRange(ore, q); if (!range) continue;
      const at = (x: number) => ts.map((t) => evaluate(t, { [t.s[0][0]]: { [q]: x } }));
      const weight = (p: number) => (Math.abs(target[p] - vanilla(material, p)) > 0.01 * width(p) ? 10 : 1);
      let best = { x: range[0], e: Infinity };
      for (let i = 0; i <= 240; i++) {
        const x = range[0] + ((range[1] - range[0]) * i) / 240;
        const e = at(x).reduce((acc, v, k) => acc + (width(ts[k].p) > 0 ? (weight(ts[k].p) * Math.abs(v - target[ts[k].p])) / width(ts[k].p) : 0), 0);
        if (e < best.e - 1e-12) best = { x, e };
      }
      m.look.push({ prop: q, value: best.x, range });
      at(best.x).forEach((v, k) => {
        const p = ts[k].p; const w = width(p);
        m.got.push({ prop: p, value: v, want: target[p], hit: w > 0 ? Math.abs(v - target[p]) <= 0.05 * w : Math.abs(v - target[p]) < 1e-9 });
      });
      m.err += best.e;
    }
    m.hits = m.got.filter((g) => g.hit).length;
    if (m.got.length) matches.push(m);
  }
  // closest first, counting what you moved off standard most
  matches.sort((a, b) => a.err / a.got.length - b.err / b.got.length);
  return { matches, unlinked };
}

/** the item info "Mined from" words */
const ABUNDANCE: Record<number, string> = { 5: 'Dominant', 4: 'Major', 3: 'Moderate', 2: 'Minor', 1: 'Trace' };
/** Where a material comes from: the ores whose stacks refine closest to what the sliders are set to, and where those are mined. */
function Sources({ material, props, target, ranges, folded }: { material: number; props: number[]; target: Stack; ranges: Record<number, Interval>; folded?: boolean }) {
  const [all, setAll] = useState(false); const [shut, setShut] = useState(!!folded);
  const printed = (producedBy.get(material) ?? []).filter(tunable);
  const { matches, unlinked } = useMemo(() => oreMatches(material, props, target, ranges), [material, props, target, ranges]);
  if (!matches.length && !unlinked.length && !printed.length) return null;
  const shownMatches = all ? matches : matches.slice(0, 3);
  if (shut && matches.length) return (
    <button onClick={() => setShut(false)} className="self-start border-t border-foreground/10 pt-2 w-full text-left text-xs text-muted-foreground hover:text-foreground">
      Ore for these values: <span className="text-foreground font-semibold">{itemName(matches[0].ore)}</span> best of {matches.length} ▸
    </button>
  );
  return (
    <div className="border-t border-foreground/10 pt-3 flex flex-col gap-2">
      {matches.length > 0 && <>
        <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">Ore to look for, for these values</div>
        <ul className="flex flex-col gap-2">
          {shownMatches.map((m) => {
            const rocks = itemOf(m.ore).minedFrom ?? [];
            return (
              <li key={m.ore} className="rounded-lg bg-foreground/[0.03] ring-1 ring-foreground/10 p-2.5 flex flex-col gap-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <ItemIcon id={m.ore} size={20} />
                  <ItemLink id={m.ore} className="font-semibold" />
                  <span className={cn('ml-auto tabular-nums', m.hits === m.got.length ? 'text-[var(--color-ocean-500)]' : 'text-muted-foreground')}
                    title="Properties this ore's refining changes, and how many of them come within 5% of their range of what you set (the same step the game calls atypical). The rest come out the same from any of these ores.">
                    matches {m.hits} of {m.got.length} it affects</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Look for </span>
                  {m.look.map((l, i) => <span key={l.prop}>{i > 0 && ', '}{propertyOf(l.prop)?.name} ≈ <span className="tabular-nums font-semibold">{fmtProp(l.prop, l.value)}</span>{lookEnd(l)}</span>)}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground tabular-nums">
                  {m.got.map((g) => (
                    <span key={g.prop} title={`you set ${fmtProp(g.prop, g.want)}`} className={g.hit ? 'text-foreground' : undefined}>
                      {g.hit ? '✓' : '·'} {propertyOf(g.prop)?.name} {fmtProp(g.prop, g.value)}{!g.hit && <> (set {fmtProp(g.prop, g.want)})</>}
                    </span>
                  ))}
                </div>
                {rocks.length > 0 && <div><span className="text-muted-foreground">Mined from </span>{rocks.map(([rock, a], i) => <span key={rock}>{i > 0 && ', '}{rock} <span className="text-muted-foreground">{ABUNDANCE[a] ?? ''}</span></span>)}</div>}
              </li>
            );
          })}
        </ul>
        {matches.length > 3 && <button onClick={() => setAll(!all)} className="self-start text-xs text-muted-foreground hover:text-foreground">{all ? 'fewer ores' : `all ${matches.length} ores`}</button>}
        <p className="text-[0.7rem] text-muted-foreground font-sans">From the refining schemas' own curves: each material property follows one property of the ore stack you refine, so properties tied to the same one move together and some combinations cannot all be had. What you moved off standard counts most. Checked against Olivine refined in game from a known Inkstone stack: all 28 properties match.</p>
      </>}
      {unlinked.length > 0 && <div className="text-xs"><span className="text-muted-foreground">{matches.length ? 'Also refined from ' : 'Refined from '}</span>{unlinked.map((id, i) => <span key={id}>{i > 0 && ', '}<ItemLink id={id} /></span>)}<span className="text-muted-foreground">{matches.length ? ': their schemas do not tie these properties to the ore' : ''}</span></div>}
      {printed.length > 0 && <div className="text-xs"><span className="text-muted-foreground">Printed too: </span><Link to={`/industry/tune?item=${material}`} className="no-underline text-[var(--color-martian-500)]">tune {itemName(material)} →</Link></div>}
    </div>
  );
}
/** "(the top of its range)" when the best value sits at an end, so you know to look for the most or least you can find */
function lookEnd(l: { value: number; range: Interval }) {
  const w = l.range[1] - l.range[0]; if (!(w > 0)) return null;
  if (l.value >= l.range[1] - 1e-9 * Math.max(1, Math.abs(w))) return <span className="text-muted-foreground"> (as high as it comes)</span>;
  if (l.value <= l.range[0] + 1e-9 * Math.max(1, Math.abs(w))) return <span className="text-muted-foreground"> (as low as it comes)</span>;
  return null;
}
