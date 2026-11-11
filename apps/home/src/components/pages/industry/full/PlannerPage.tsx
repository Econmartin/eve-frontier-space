import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildPlan, builtInSpace, rankRecipes, starterProducts, starterInputs, makeOptions, recipes, valueOf, shownFacilityNames, facilityName, fmtQty, fmtTime, fmtVol, volumeOf, industryItems, itemName, itemOf, producedBy, recipeAvailable, recipeById, summarizePlan, type PlanNode, type Recipe,
} from '@/lib/industry';
import { Empty, FacilityBadges, IOList, ItemIcon, ItemLink, ItemPicker, NumberField, Panel, Price, Qty, Section, SuggestionChips, addToHold, holdMap, useIndustrySettings, type Holding } from '../parts';

const recipeLabel = (r: Recipe) => `${builtInSpace(r) ? 'Build Mode' : shownFacilityNames(r).join(' / ') || 'unassigned'}${recipeAvailable(r) ? '' : ' (not in game)'} · ${r.inputs.map((i) => `${fmtQty(i.qty, i.id)} ${itemName(i.id)}`).join(', ')}`;

export function PlanPage() {
  const [params0] = useSearchParams();
  const [tab, setTab] = useState<'list' | 'hold'>(params0.get('item') ? 'list' : 'list');
  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex self-start rounded-xl ring-1 ring-foreground/15 p-0.5 bg-background" role="group" aria-label="Plan mode">
        {([['list', 'I want to build…'], ['hold', 'I have these materials…']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)} className={cn('rounded-lg px-3 h-8 text-xs font-semibold transition-colors', tab === v ? 'bg-[var(--color-martian-500)] text-black' : 'text-muted-foreground hover:text-foreground')}>{label}</button>
        ))}
      </div>
      {tab === 'list' ? <ShoppingList /> : <FromHold />}
    </div>
  );
}

function ShoppingList() {
  const [params, setParams] = useSearchParams();
  const target = params.get('item') ? Number(params.get('item')) : undefined;
  const qty = Math.max(1, Number(params.get('qty')) || 1);
  const [overrides, setOverrides] = useState<Map<number, number>>(new Map());
  const [ownedItems, setOwnedItems] = useState<Set<number>>(new Set());
  const { showUnavailable } = useIndustrySettings();
  const craftable = useMemo(() => industryItems.filter((i) => (producedBy.get(i.id) ?? []).some((r) => showUnavailable || recipeAvailable(r))), [showUnavailable]);

  const choose = useMemo(() => (id: number, options: Recipe[]) => {
    if (ownedItems.has(id)) return undefined;
    const visible = showUnavailable ? options : options.filter(recipeAvailable);
    const o = overrides.get(id); if (o) { const r = recipeById.get(o); if (r && visible.includes(r)) return r; }
    return rankRecipes(id, visible)[0];
  }, [overrides, ownedItems, showUnavailable]);
  const plan = useMemo(() => (target ? buildPlan(target, qty, choose) : undefined), [target, qty, choose]);
  const summary = useMemo(() => (plan ? summarizePlan(plan) : undefined), [plan]);

  const set = (k: string, v: string) => { const p = new URLSearchParams(params); p.set(k, v); setParams(p, { replace: true }); };

  return (
    <div className="flex flex-col gap-6">
      <Panel className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1 min-w-0"><ItemPicker pool={craftable} placeholder="What do you want to build?" onPick={(it) => { set('item', String(it.id)); setOverrides(new Map()); setOwnedItems(new Set()); }} clearOnPick={false} value={target ? itemName(target) : ''} /></div>
        <div className="flex items-center gap-2"><span className="text-xs tracking-[0.16em] uppercase text-muted-foreground">Qty</span><NumberField value={qty} onChange={(n) => set('qty', String(n))} ariaLabel="Quantity" /></div>
      </Panel>

      {!plan || !summary ? (
        <Empty>Pick what you want to build and how many. The list expands it all the way down to raw materials: what to gather, what to print on the way, and how long it runs. Change a recipe anywhere in the tree, or tick "have it" on something you already own, and the totals follow.
          <SuggestionChips label="Start simple · made straight from raw materials" items={starterProducts(12, showUnavailable)} onPick={(it) => { set('item', String(it.id)); setOverrides(new Map()); setOwnedItems(new Set()); }} />
        </Empty>
      ) : !plan.recipe && (producedBy.get(plan.item)?.length ?? 0) > 0 ? (
        <Empty><ItemLink id={plan.item} icon className="font-semibold" /> can only be made on facilities that are not in game this cycle. Turn on "show not in game" above to plan it anyway.</Empty>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Section title="Build tree" className="mb-0">
            <Panel className="overflow-x-auto">
              <PlanTree node={plan} depth={0} overrides={overrides} owned={ownedItems}
                onRecipe={(id, rid) => setOverrides((m) => new Map(m).set(id, rid))}
                onOwned={(id, v) => setOwnedItems((s) => { const n = new Set(s); v ? n.add(id) : n.delete(id); return n; })} />
            </Panel>
          </Section>

          <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
            <div className="grid grid-cols-2 gap-3">
              <Panel className="p-4"><div className="font-heading text-2xl text-[var(--color-martian-500)] tabular-nums">{fmtTime(summary.serialTime)}</div><div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mt-1">serial run time</div></Panel>
              <Panel className="p-4"><div className="font-heading text-2xl tabular-nums">{summary.steps}</div><div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mt-1">production steps</div></Panel>
            </div>
            <Totals title="Base inputs to gather" rows={[...summary.base.entries()]} />
            {summary.intermediates.size > 0 && <Totals title="Intermediates to print" rows={[...summary.intermediates.entries()].map(([id, v]) => [id, v.qty] as [number, number])} />}
            {summary.byproducts.size > 0 && <Totals title="Byproducts left over" rows={[...summary.byproducts.entries()]} muted />}
            <Panel className="p-4">
              <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">Runs per facility</div>
              <ul className="divide-y divide-foreground/5 text-sm">
                {[...summary.byFacilityRecipe.values()].sort((a, b) => b.time - a.time).map(({ recipe, runs, time }) => (
                  <li key={recipe.id} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="truncate"><span className="text-muted-foreground">{builtInSpace(recipe) ? 'Build Mode' : shownFacilityNames(recipe).join('/') || '—'}</span> · <ItemLink id={recipe.product} /></span>
                    <span className="shrink-0 tabular-nums"><Qty n={runs} /> <span className="text-foreground/75">× {fmtTime(recipe.time)} = {fmtTime(time)}</span></span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Totals({ title, rows, muted }: { title: string; rows: [number, number][]; muted?: boolean }) {
  const vol = rows.reduce((s, [id, q]) => s + volumeOf(id, q), 0);
  return (
    <Panel className="p-4">
      <div className="flex items-baseline justify-between mb-2"><div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">{title}</div>{vol > 0 && <div className="text-xs text-foreground/75 tabular-nums">{fmtVol(vol)}</div>}</div>
      <ul className="divide-y divide-foreground/5 text-sm">
        {rows.sort((a, b) => b[1] - a[1]).map(([id, q]) => (
          <li key={id} className={cn('py-1.5 flex items-center justify-between gap-3', muted && 'text-muted-foreground')}>
            <ItemLink id={id} icon className={muted ? 'text-muted-foreground' : ''} /><Qty n={q} id={id} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function PlanTree({ node, depth, overrides, owned, onRecipe, onOwned }: { node: PlanNode; depth: number; overrides: Map<number, number>; owned: Set<number>; onRecipe: (id: number, rid: number) => void; onOwned: (id: number, v: boolean) => void }) {
  const [open, setOpen] = useState(depth < 2);
  const { showUnavailable } = useIndustrySettings();
  const options = (producedBy.get(node.item) ?? []).filter((r) => showUnavailable || recipeAvailable(r));
  const isOwned = owned.has(node.item);
  return (
    <div className={cn(depth > 0 && 'ml-4 pl-3 border-l border-foreground/10')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-sm">
        {node.children.length ? (
          <button onClick={() => setOpen((o) => !o)} className="text-muted-foreground hover:text-foreground" aria-label={open ? 'collapse' : 'expand'}>{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</button>
        ) : <span className="inline-block size-4" />}
        <Qty n={node.qty} id={node.item} />
        <ItemLink id={node.item} icon className={cn(!node.recipe && !isOwned && 'text-muted-foreground')} />
        {node.recipe ? (
          <>
            <span className="text-xs text-foreground/75 tabular-nums">{node.runs} run{node.runs === 1 ? '' : 's'}{node.recipe.time ? ` · ${fmtTime(node.runs * node.recipe.time)}` : ''}</span>
            {options.length > 1 ? (
              <select value={overrides.get(node.item) ?? node.recipe.id} onChange={(e) => onRecipe(node.item, Number(e.target.value))} aria-label="recipe"
                className="h-7 max-w-[60vw] rounded-lg bg-background ring-1 ring-foreground/15 px-2 text-xs">
                {options.map((r) => <option key={r.id} value={r.id}>{recipeLabel(r)}</option>)}
              </select>
            ) : <Badge variant="outline" className="h-6">{builtInSpace(node.recipe) ? 'Build Mode' : shownFacilityNames(node.recipe).join(' / ') || 'unassigned'}</Badge>}
          </>
        ) : node.cycle ? <Badge variant="destructive" className="h-6">cycle stopped</Badge> : isOwned ? <Badge variant="secondary" className="h-6">owned</Badge> : <Badge variant="outline" className="h-6 text-muted-foreground">base</Badge>}
        {depth > 0 && options.length > 0 && (
          <label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={isOwned} onChange={(e) => onOwned(node.item, e.target.checked)} className="accent-[var(--color-martian-500)]" /> have it</label>
        )}
      </div>
      {open && node.children.map((c, i) => <PlanTree key={`${c.item}-${i}`} node={c} depth={depth + 1} overrides={overrides} owned={owned} onRecipe={onRecipe} onOwned={onOwned} />)}
    </div>
  );
}

const isBreakdown = (r: Recipe) => r.inputs.some((i) => i.id === r.product);

/** "I have these materials": what the hold can make right now. In-page state only. */
function FromHold() {
  const { showUnavailable } = useIndustrySettings();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const hold = useMemo(() => holdMap(holdings), [holdings]);
  const pool = useMemo(() => recipes.filter((r) => (showUnavailable || recipeAvailable(r)) && r.inputs.length > 0), [showUnavailable]);
  const options = useMemo(() => makeOptions(hold, pool), [hold, pool]);
  const runnable = options.filter((o) => o.runs > 0).sort((a, b) => b.runs - a.runs || a.recipe.time - b.recipe.time);
  const can = runnable.filter((o) => !isBreakdown(o.recipe)), refine = runnable.filter((o) => isBreakdown(o.recipe));
  const almost = options.filter((o) => o.runs === 0 && o.missing.length === 1 && o.recipe.inputs.length > 1).sort((a, b) => (a.missing[0].need - a.missing[0].have) - (b.missing[0].need - b.missing[0].have));
  const refineAll = () => setHoldings((hs) => {
    const used: Holding[] = refine.map((o) => ({ id: o.recipe.inputs[0].id, qty: -o.recipe.inputs[0].qty * o.runs }));
    const got: Holding[] = refine.flatMap((o) => o.recipe.outputs.map((x) => ({ id: x.id, qty: x.qty * o.runs })));
    return addToHold(addToHold(hs, used), got);
  });
  return (
    <div className="flex flex-col gap-4">
      <Panel className="flex flex-col gap-3">
        <ItemPicker placeholder="Add ore, salvage, or materials you have…" onPick={(it) => setHoldings((hs) => (hs.some((h) => h.id === it.id) ? hs : [...hs, { id: it.id, qty: 1000 }]))} />
        {!holdings.length && <SuggestionChips label="Common hauls" items={starterInputs(10, showUnavailable)} onPick={(it) => setHoldings((hs) => [...hs, { id: it.id, qty: 1000 }])} />}
        {holdings.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {holdings.map((h, i) => (
              <li key={h.id} className="inline-flex items-center gap-2 rounded-xl ring-1 ring-foreground/15 pl-2 pr-1 h-10 bg-background">
                <ItemIcon id={h.id} size={22} /><span className="text-sm">{itemName(h.id)}</span>
                <NumberField value={h.qty} onChange={(n) => setHoldings((hs) => hs.map((x, j) => (j === i ? { ...x, qty: n } : x)))} className="h-8 w-24" ariaLabel="quantity" />
                <button onClick={() => setHoldings((hs) => hs.filter((_, j) => j !== i))} className="size-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive" aria-label="remove"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {!holdings.length ? <Empty>Add what is in your hold. You get everything you can run from it, what you could refine further, and what is one input short.</Empty> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Panel className="p-4"><div className="font-heading text-3xl text-[var(--color-martian-500)] tabular-nums">{can.length}</div><div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mt-1">products you can make</div>{valueOf(holdings).priced > 0 && <div className="text-xs mt-1">hold worth <Price n={valueOf(holdings).total} /></div>}</Panel>
            <Panel className="p-4"><div className="font-heading text-3xl tabular-nums">{refine.length}</div><div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mt-1">things to refine first</div></Panel>
            <Panel className="p-4"><div className="font-heading text-3xl tabular-nums">{almost.length}</div><div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mt-1">one input short</div></Panel>
            <Panel className="p-4 flex items-center">{refine.length > 0 ? <button onClick={refineAll} className="w-full rounded-xl bg-foreground text-background px-3 py-2 text-xs font-semibold hover:opacity-85 transition-opacity">Refine everything, then recount</button> : <span className="text-xs text-muted-foreground">Nothing left to refine.</span>}</Panel>
          </div>
          {refine.length > 0 && (
            <Section title={`Refine first · ${refine.length}`} className="mb-0">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{refine.map(({ recipe, runs }) => (
                <Panel key={recipe.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3"><ItemIcon id={recipe.inputs[0].id} size={36} className="rounded-lg" /><div className="min-w-0 flex-1"><div className="font-heading leading-tight truncate">Break down <ItemLink id={recipe.inputs[0].id} /></div><div className="text-xs text-foreground/75 tabular-nums">{runs} run{runs === 1 ? '' : 's'} of {recipe.inputs[0].qty} · {fmtTime(recipe.time * runs)}</div></div></div>
                  <IOList list={recipe.outputs.map((o) => ({ id: o.id, qty: o.qty * runs }))} />
                  <FacilityBadges recipe={recipe} />
                </Panel>
              ))}</div>
            </Section>
          )}
          <Section title={`Can make now · ${can.length}`} className="mb-0">
            {can.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{can.map(({ recipe, runs }) => (
              <Panel key={recipe.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3"><ItemIcon id={recipe.product} size={36} className="rounded-lg" /><div className="min-w-0 flex-1"><div className="font-heading leading-tight truncate"><ItemLink id={recipe.product} /></div><div className="text-xs text-foreground/75 tabular-nums">up to <Qty n={runs} /> run{runs === 1 ? '' : 's'} · {fmtTime(recipe.time * runs)}</div></div></div>
                <IOList list={recipe.outputs} />
                <FacilityBadges recipe={recipe} />
              </Panel>
            ))}</div> : <Empty>Nothing yet. Refine first, or see what is one input short.</Empty>}
          </Section>
          {almost.length > 0 && (
            <Section title={`One input short · ${almost.length}`} className="mb-0">
              <Panel className="p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground"><tr className="border-b border-foreground/10"><th className="text-left font-normal px-4 py-2">Product</th><th className="text-left font-normal px-4 py-2">Missing</th><th className="text-right font-normal px-4 py-2">Have / need</th><th className="text-left font-normal px-4 py-2 hidden md:table-cell">Facility</th></tr></thead>
                  <tbody className="divide-y divide-foreground/5">{almost.slice(0, 40).map(({ recipe, missing }) => (
                    <tr key={recipe.id} className="hover:bg-muted/50"><td className="px-4 py-2"><ItemLink id={recipe.product} icon /></td><td className="px-4 py-2"><ItemLink id={missing[0].id} icon /></td><td className="px-4 py-2 text-right tabular-nums"><span className="text-foreground/75">{missing[0].have.toLocaleString()}</span> / <Qty n={missing[0].need} id={missing[0].id} /></td><td className="px-4 py-2 hidden md:table-cell"><FacilityBadges recipe={recipe} /></td></tr>
                  ))}</tbody>
                </table>
              </Panel>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
