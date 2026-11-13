import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { industryItems, itemName, itemOf, producedBy, propertyOf, traitOf, type Recipe, type RecipeIO, type Transform } from '@/lib/industry';
import {
  candidates, evaluate, fmtDelta, fmtNumber, fmtProp, level, reach, resolveDerived, trend, shown, slotProps, slotRange, standardStack, tunable, typeRange,
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

// ---------------- one slot, possibly through the schema that prints its material ----------------
/** The schema that prints this material from parts, if any (Optic from a Mineral Density material, Beam Head from three). */
function upstreamFor(material: number): { recipe: Recipe; out: number } | undefined {
  const r = made(material).find(tunable);
  return r ? { recipe: r, out: r.outputs.findIndex((o) => o.id === material) } : undefined;
}
/** for each slot of the upstream schema, the properties it reads to produce the ones we need */
function feeding(up: NonNullable<ReturnType<typeof upstreamFor>>, need: number[]): Record<number, number[]> {
  const by: Record<number, Set<number>> = {};
  for (const t of up.recipe.tf ?? []) if (t.o === up.out && need.includes(t.p)) for (const [slot, p] of t.s) (by[slot] ??= new Set()).add(p);
  return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, [...v]]));
}
/** whether going through the printing schema gives anything to adjust for these properties */
const hasParts = (material: number, need: number[]) => { const up = upstreamFor(material); return !!up && Object.values(feeding(up, need)).some((ps) => ps.length); };
/** a stack you adjust: what is in it and its values. Key -1 is the slot's own stack, others are upstream slots. */
interface Part { material: number; values: Stack }
interface SlotState { material: number; via: boolean; parts: Record<number, Part> }
interface Group { key: number; input: RecipeIO; part: Part; props: number[]; ranges: Record<number, Interval> }
interface SlotView { input: RecipeIO; state: SlotState; up?: ReturnType<typeof upstreamFor>; groups: Group[]; stack: Stack; ranges: Record<number, Interval> }

function freshSlot(input: RecipeIO, material: number, via: boolean, need: number[], keep?: Record<number, number>): SlotState {
  const up = via && hasParts(material, need) ? upstreamFor(material) : undefined;
  if (!up) return { material, via: false, parts: { [-1]: { material, values: standardStack(input, material, need) } } };
  const parts: Record<number, Part> = {};
  for (const [slot, props] of Object.entries(feeding(up, need))) {
    const inp = up.recipe.inputs.find((i) => i.slot === Number(slot)); if (!inp) continue;
    const m = keep?.[Number(slot)] ?? candidates(inp, props)[0]?.id ?? inp.id;
    parts[Number(slot)] = { material: m, values: standardStack(inp, m, props) };
  }
  return { material, via: true, parts };
}
function viewSlot(input: RecipeIO, st: SlotState, need: number[]): SlotView {
  const up = st.via ? upstreamFor(st.material) : undefined;
  if (!up) {
    const part = st.parts[-1]; const ranges = Object.fromEntries(need.map((p) => [p, slotRange(input, part.material, p)])) as Record<number, Interval>;
    return { input, state: st, groups: [{ key: -1, input, part, props: need, ranges }], stack: part.values, ranges };
  }
  const feeds = feeding(up, need);
  const groups: Group[] = Object.entries(st.parts).map(([k, part]) => {
    const inp = up.recipe.inputs.find((i) => i.slot === Number(k))!; const props = feeds[Number(k)] ?? [];
    return { key: Number(k), input: inp, part, props, ranges: Object.fromEntries(props.map((p) => [p, slotRange(inp, part.material, p)])) as Record<number, Interval> };
  });
  const values = Object.fromEntries(groups.map((g) => [g.key, g.part.values])) as Record<number, Stack>;
  const rangesBy = Object.fromEntries(groups.map((g) => [g.key, g.ranges])) as Record<number, Record<number, Interval>>;
  const own = standardStack(input, st.material, need);
  const stack: Stack = {}, ranges: Record<number, Interval> = {};
  for (const p of need) {
    const t = up.recipe.tf?.find((x) => x.o === up.out && x.p === p);
    stack[p] = t ? evaluate(t, values) : own[p];
    ranges[p] = t ? reach(t, rangesBy) : [own[p], own[p]];
  }
  return { input, state: st, up, groups, stack, ranges };
}

function Tuner({ recipe }: { recipe: Recipe }) {
  const props = useMemo(() => slotProps(recipe), [recipe]);
  const slots = useMemo(() => recipe.inputs.filter((i) => props[i.slot ?? -1]), [recipe, props]);
  const [state, setState] = useState<Record<number, SlotState>>(() =>
    Object.fromEntries(slots.map((i) => [i.slot!, freshSlot(i, candidates(i, props[i.slot!])[0]?.id ?? i.id, true, props[i.slot!])])));
  const viewsOf = (st: Record<number, SlotState>) => Object.fromEntries(slots.map((i) => [i.slot!, viewSlot(i, st[i.slot!], props[i.slot!])])) as Record<number, SlotView>;
  const views = viewsOf(state);
  const stacks = Object.fromEntries(Object.entries(views).map(([k, v]) => [k, v.stack])) as Record<number, Stack>;
  const ranges = Object.fromEntries(Object.entries(views).map(([k, v]) => [k, v.ranges])) as Record<number, Record<number, Interval>>;
  // the game's "standard": a mid-range stack of each slot's own material
  const standard = Object.fromEntries(slots.map((i) => [i.slot!, standardStack(i, state[i.slot!].material, props[i.slot!])])) as Record<number, Stack>;
  // stats that cannot move here (every input fixed, or nothing chosen carries them) go last, and dead zeros are dropped
  const moves = (t: Transform) => { const [lo, hi] = reach(t, ranges); return hi - lo > 1e-12 * Math.max(1, Math.abs(hi)); };
  const chosen = slots.map((i) => ({ slot: i.slot!, material: state[i.slot!].material, trait: i.trait }));
  const resolved = (recipe.tf ?? []).filter((t) => t.s.length).map((t) => (t.d ? resolveDerived(t, chosen) : { tf: t, missing: [] as number[] }));
  const stats = resolved.filter((x) => x.missing.length || moves(x.tf) || Math.abs(evaluate(x.tf, stacks)) > 1e-12).sort((a, b) => Number(moves(b.tf)) - Number(moves(a.tf)));
  const moduleStats = stats.filter((x) => x.tf.d), partStats = stats.filter((x) => !x.tf.d);
  const statOf = (t: Transform, st: Record<number, SlotState>) => evaluate(t, Object.fromEntries(Object.entries(viewsOf(st)).map(([k, v]) => [k, v.stack])));
  const setPart = (slot: number, key: number, part: Part) => setState((st) => ({ ...st, [slot]: { ...st[slot], parts: { ...st[slot].parts, [key]: part } } }));
  /** push one stat: try each adjustable property at either end of its range and keep whatever moves the stat the right way */
  const push = (t: Transform, up: boolean) => setState((st) => {
    let next = st;
    for (let pass = 0; pass < 2; pass++) for (const i of slots) for (const g of viewsOf(next)[i.slot!].groups) for (const q of g.props) {
      const [lo, hi] = g.ranges[q] ?? [0, 0]; if (!(hi > lo)) continue;
      const tryAt = (x: number) => ({ ...next, [i.slot!]: { ...next[i.slot!], parts: { ...next[i.slot!].parts, [g.key]: { ...next[i.slot!].parts[g.key], values: { ...next[i.slot!].parts[g.key].values, [q]: x } } } } });
      const [a, b] = [tryAt(lo), tryAt(hi)]; const [ya, yb] = [statOf(t, a), statOf(t, b)];
      if (Math.abs(yb - ya) < 1e-12) continue; // this property does not move the stat: leave it where it is
      next = (up ? yb > ya : yb < ya) ? b : a;
    }
    return next;
  });
  const reset = () => setState((st) => Object.fromEntries(slots.map((i) => [i.slot!, freshSlot(i, st[i.slot!].material, st[i.slot!].via, props[i.slot!],
    Object.fromEntries(Object.entries(st[i.slot!].parts).map(([k, p]) => [k, p.material])))])));
  const rows = (list: { tf: Transform; missing: number[] }[]) => list.map(({ tf, missing }) => <StatRow key={`${tf.o}:${tf.p}:${tf.d ?? 0}`} t={tf} missing={missing} recipe={recipe} stacks={stacks} standard={standard} ranges={ranges} onPush={(up) => push(tf, up)} />);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Section title="What goes in" className="mb-0" aside={<button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><RotateCcw className="size-3" />standard stacks</button>}>
        <div className="flex flex-col gap-3">
          {slots.map((input) => (
            <SlotCard key={input.slot} v={views[input.slot!]} need={props[input.slot!]}
              onMaterial={(m) => setState((st) => ({ ...st, [input.slot!]: freshSlot(input, m, st[input.slot!].via, props[input.slot!]) }))}
              onVia={(via) => setState((st) => ({ ...st, [input.slot!]: freshSlot(input, st[input.slot!].material, via, props[input.slot!]) }))}
              onPart={(key, part) => setPart(input.slot!, key, part)} />
          ))}
        </div>
      </Section>
      <div className="flex flex-col gap-4">
        {moduleStats.length > 0 && <Section title="Module stats" className="mb-0">
          <Panel className="p-0 overflow-hidden"><ul className="divide-y divide-foreground/5">{rows(moduleStats)}</ul></Panel>
          <p className="text-xs text-muted-foreground font-sans mt-2">From the game's own formulas, reading each part's ratings. Not yet checked against a module built in game.</p>
        </Section>}
        <Section title={moduleStats.length ? 'Part ratings' : 'What comes out'} className="mb-0">
          {partStats.length > 0 && <Panel className="p-0 overflow-hidden"><ul className="divide-y divide-foreground/5">{rows(partStats)}</ul></Panel>}
          <p className="text-xs text-muted-foreground font-sans mt-2">Worked out with the schema's own formulas, the same way the game does: checked against in-game Lens Blank and Fuel Stock builds. The bar is everything these inputs can reach; the tick is a standard stack. The arrows push one stat as far as it goes and show what that does to the rest.</p>
        </Section>
      </div>
    </div>
  );
}

function StatRow({ t, missing, recipe, stacks, standard, ranges, onPush }: { t: Transform; missing: number[]; recipe: Recipe; stacks: Record<number, Stack>; standard: Record<number, Stack>; ranges: Record<number, Record<number, Interval>>; onPush: (up: boolean) => void }) {
  const value = evaluate(t, stacks), base = evaluate(t, standard), [lo, hi] = reach(t, ranges);
  const out = recipe.outputs[t.o]?.id ?? recipe.product;
  // the game labels a stat against the output type's range (stored like the inputs: log10 where flagged)
  const lvl = level(value, typeRange(out, t.p));
  const pos = (v: number) => (hi > lo ? Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100)) : 50);
  const delta = shown(t.p, value) - shown(t.p, base);
  if (missing.length || !Number.isFinite(value)) return (
    <li className="px-4 py-3 flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3"><span className="text-sm">{propertyOf(t.p)?.name}</span><span className="tabular-nums text-muted-foreground">—</span></div>
      <div className="text-xs text-muted-foreground">{missing.length ? `Needs an input with the ${[...new Set(missing)].map((m) => traitOf(m)?.name).join(', ')} trait; none of the materials chosen carries it.` : 'Unknown: a material chosen has no value for a property this needs.'}</div>
    </li>
  );
  return (
    <li className="px-4 py-3 flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{propertyOf(t.p)?.name}{recipe.outputs.length > 1 && <span className="text-muted-foreground"> · {itemName(out)}</span>}</span>
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
        <span>{fmtProp(t.p, lo)} – {fmtProp(t.p, hi)}</span>
        <span>
          {Math.abs(delta) > 1e-12 && <span className={delta > 0 ? 'text-[var(--color-ocean-500)]' : 'text-[var(--color-martian-500)]'}>{fmtDelta(t.p, value, base)} vs standard</span>}
          {lvl && <span className={cn('ml-2', LEVEL_TONE[lvl])}>{lvl[0].toUpperCase() + lvl.slice(1)}</span>}
        </span>
      </div>
    </li>
  );
}

function SlotCard({ v, need, onMaterial, onVia, onPart }: {
  v: SlotView; need: number[]; onMaterial: (id: number) => void; onVia: (via: boolean) => void; onPart: (key: number, part: Part) => void;
}) {
  const { input, state, up } = v;
  const cands = candidates(input, need), canVia = !!upstreamFor(state.material);
  return (
    <Panel className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <ItemIcon id={state.material} size={32} className="rounded-md" />
        <div className="min-w-0 flex-1">
          <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">{input.trait !== undefined ? itemName(input.id) : 'Slot'} · {fmtNumber(input.qty)}{itemOf(state.material).unit === 'kg' ? ' kg' : ''} per run</div>
          {cands.length > 1 ? (
            <Select ariaLabel="material" value={String(state.material)} onChange={(x) => onMaterial(Number(x))} className="mt-1 max-w-full"
              options={cands.map((c) => ({ value: String(c.id), label: `${itemName(c.id)}${c.fit === 'sometimes' ? ' (some stacks fit)' : ''}` }))} />
          ) : <ItemLink id={state.material} className="font-heading" />}
        </div>
      </div>
      {canVia && hasParts(state.material, need) && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-muted-foreground">Set</span>
          <Select ariaLabel="what to adjust" value={state.via ? 'base' : 'own'} onChange={(x) => onVia(x === 'base')}
            options={[{ value: 'base', label: `what it's printed from` }, { value: 'own', label: `the ${itemName(state.material)} stack directly` }]} />
        </div>
      )}
      {v.groups.filter((g) => g.props.length).map((g) => <PartEditor key={g.key} g={g} nested={!!up} onPart={(part) => onPart(g.key, part)} />)}
    </Panel>
  );
}

/** sliders for one stack; nested ones are the parts a slot's material is printed from */
function PartEditor({ g, nested, onPart }: { g: Group; nested: boolean; onPart: (part: Part) => void }) {
  const standard = standardStack(g.input, g.part.material, g.props);
  const options = nested ? candidates(g.input, g.props) : [];
  return (
    <div className={cn('flex flex-col gap-2.5', nested && 'rounded-xl ring-1 ring-foreground/10 p-3')}>
      {nested && (
        <div className="flex items-center gap-2 flex-wrap">
          <ItemIcon id={g.part.material} size={22} />
          <span className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">{itemName(g.input.id)} · {fmtNumber(g.input.qty)}{itemOf(g.part.material).unit === 'kg' ? ' kg' : ''}</span>
          {options.length > 1 ? (
            <Select ariaLabel="part material" value={String(g.part.material)} onChange={(x) => onPart({ material: Number(x), values: standardStack(g.input, Number(x), g.props) })} className="max-w-full"
              options={options.map((c) => ({ value: String(c.id), label: `${itemName(c.id)}${c.fit === 'sometimes' ? ' (some stacks fit)' : ''}` }))} />
          ) : <ItemLink id={g.part.material} className="text-sm" />}
        </div>
      )}
      {g.props.map((p) => {
        const [lo, hi] = g.ranges[p] ?? [0, 0]; const fixed = !(hi > lo); const x = g.part.values[p] ?? standard[p];
        return (
          <label key={p} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm"><span>{propertyOf(p)?.name}</span><span className={cn('tabular-nums', Math.abs(x - standard[p]) > 1e-12 && 'text-[var(--color-martian-500)]')}>{fmtProp(p, x)}</span></div>
            {fixed ? <div className="text-xs text-muted-foreground">fixed for this material</div> : (
              <>
                <input type="range" min={lo} max={hi} step={(hi - lo) / 400} value={x} onChange={(e) => onPart({ ...g.part, values: { ...g.part.values, [p]: Number(e.target.value) } })} className="w-full accent-[var(--color-martian-500)]" aria-label={propertyOf(p)?.name} />
                <div className="flex justify-between text-[0.65rem] text-muted-foreground tabular-nums"><span>{fmtProp(p, lo)}</span><span>{fmtProp(p, hi)}</span></div>
              </>
            )}
          </label>
        );
      })}
      <Sources material={g.part.material} props={g.props} />
    </div>
  );
}

/** Where a material comes from: the ores that refine into it, and which ore property drives each property we care about. */
function Sources({ material, props }: { material: number; props: number[] }) {
  const all = producedBy.get(material) ?? [];
  const ores = all.filter((r) => r.kind === 'reprocessing' && itemOf(r.inputs[0].id).regolith);
  const printed = all.filter(tunable);
  const hints = ores.flatMap((r) => {
    const o = r.outputs.findIndex((x) => x.id === material);
    return (r.tf ?? []).filter((t) => t.o === o && t.op === 'b' && props.includes(t.p)).map((t) => {
      return { ore: r.inputs[0].id, prop: t.p, from: t.s[0][1], dir: trend(t.b!) };
    });
  });
  if (!ores.length && !printed.length) return null;
  return (
    <div className="border-t border-foreground/10 pt-3 text-xs flex flex-col gap-1.5">
      {ores.length > 0 && <div><span className="text-muted-foreground">Refined from </span>{ores.map((r, i) => <span key={r.id}>{i > 0 && ', '}<ItemLink id={r.inputs[0].id} /></span>)}</div>}
      {hints.map((h) => (
        <div key={`${h.ore}:${h.prop}`} className="text-muted-foreground">
          {h.dir === 'mixed'
            ? <>{propertyOf(h.prop)?.name} from <ItemLink id={h.ore} /> depends on its {propertyOf(h.from)?.name}, and peaks in between</>
            : <>For higher {propertyOf(h.prop)?.name}, look for <ItemLink id={h.ore} /> with {h.dir === 'rising' ? 'high' : 'low'} {propertyOf(h.from)?.name}</>}
        </div>
      ))}
      {printed.length > 0 && <div><span className="text-muted-foreground">Printed too: </span><Link to={`/industry/tune?item=${material}`} className="no-underline text-[var(--color-martian-500)]">tune {itemName(material)} →</Link></div>}
    </div>
  );
}
