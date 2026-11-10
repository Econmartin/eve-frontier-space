import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { fmtQty, fmtTime, industryItems, itemName, itemOf, producedBy, recipeAvailable, slotFor, usedIn, usedViaTrait } from '@/lib/industry';
import { Empty, Select, FacilityBadges, IOList, ItemIcon, ItemLink, ItemPicker, Panel, Qty, Section, SuggestionChips, useIndustrySettings, useVisible } from '../parts';
import { GraphPanel, GraphPlaceholder, buildItemGraph } from './graph';

const useCount = (id: number) => (usedIn.get(id)?.length ?? 0) + (usedViaTrait.get(id)?.length ?? 0);

/** Step 2: pick a material, see what it becomes. */
export function MaterialPage() {
  const [params, setParams] = useSearchParams();
  const id = params.get('item') ? Number(params.get('item')) : undefined;
  const depth = Math.min(4, Math.max(1, Number(params.get('depth')) || 1));
  const setDepth = (v: string) => { const p = new URLSearchParams(params); p.set('depth', v); setParams(p, { replace: true }); };
  const { showUnavailable } = useIndustrySettings();
  const pool = useMemo(() => industryItems.filter((i) => [...(usedIn.get(i.id) ?? []), ...(usedViaTrait.get(i.id) ?? [])].some((r) => showUnavailable || recipeAvailable(r))), [showUnavailable]);
  // what ores refine into: the bulk materials schemas ask for
  const suggestions = useMemo(() => pool.filter((i) => i.unit === 'kg' && (producedBy.get(i.id) ?? []).some((r) => r.kind === 'reprocessing' && (showUnavailable || recipeAvailable(r)))).sort((a, b) => useCount(b.id) - useCount(a.id)).slice(0, 12), [pool, showUnavailable]);
  const uses = useVisible(id ? [...(usedIn.get(id) ?? []), ...(usedViaTrait.get(id) ?? [])] : []);
  const pick = (iid: number) => { const p = new URLSearchParams(params); p.set('item', String(iid)); setParams(p, { replace: true }); };
  return (
    <div className="flex flex-col gap-4">
      <Panel className="flex flex-col gap-3">
        <ItemPicker pool={pool} placeholder="Which material? Silica, Nickel-iron, Pyroxene…" onPick={(it) => pick(it.id)} clearOnPick={false} value={id ? itemName(id) : ''} />
        <SuggestionChips label="Refined materials, most used first" items={suggestions} onPick={(it) => pick(it.id)} />
      </Panel>
      {!id ? (
        <>
          <div className="flex items-center gap-3 min-h-11">
            <div className="size-11 rounded-lg bg-foreground/5" />
            <div><div className="text-xs tracking-[0.16em] uppercase text-muted-foreground">Pick a material</div><h2 className="text-2xl font-bold leading-none">What it becomes</h2></div>
          </div>
          <GraphPlaceholder>Pick something you refined or picked up. The graph shows every product it goes into; raise "steps out" to follow those products further. The table below lists each recipe with how much it needs.</GraphPlaceholder>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap min-h-11">
            <ItemIcon id={id} size={44} className="rounded-lg" />
            <div><div className="text-xs tracking-[0.16em] uppercase text-muted-foreground">{itemOf(id).group}</div><h2 className="text-2xl font-bold leading-none">What {itemName(id)} becomes</h2></div>
            <div className="ml-auto flex items-center gap-2"><span className="text-xs tracking-[0.16em] uppercase text-muted-foreground">Steps out</span><Select ariaLabel="Depth" value={String(depth)} onChange={setDepth} options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))} /></div>
          </div>
          <GraphPanel build={() => buildItemGraph(id, { mode: 'down', depth, showUnavailable, productsOnly: true, perItem: 10 })} deps={[id, depth, showUnavailable]} onItem={pick}
            note="Products only: each arrow is a recipe, labelled with the facility and the input-to-output quantities per run. Click a product to follow it further." />
          <Section title={`Used directly in · ${uses.length}`} className="mb-0 min-h-[60dvh]">
            {uses.length ? (
              <Panel className="p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground"><tr className="border-b border-foreground/10"><th className="text-left font-normal px-4 py-2">Product</th><th className="text-right font-normal px-4 py-2">Needs</th><th className="text-left font-normal px-4 py-2 hidden sm:table-cell">Facility</th><th className="text-right font-normal px-4 py-2">Time</th></tr></thead>
                  <tbody className="divide-y divide-foreground/5">
                    {[...uses].sort((a, b) => slotFor(a, id)!.qty - slotFor(b, id)!.qty).map((r) => (
                      <tr key={r.id} className="hover:bg-muted/50">
                        <td className="px-4 py-2">{r.kind === 'reprocessing'
                          ? <IOList list={r.outputs} />
                          : <><ItemLink id={r.product} icon /> <span className="text-foreground/75">× {fmtQty(r.outputs.find((o) => o.id === r.product)?.qty ?? 1, r.product)}</span></>}</td>
                        <td className="px-4 py-2 text-right align-top"><Qty n={slotFor(r, id)!.qty} id={id} />{slotFor(r, id)!.id !== id && <div className="text-xs text-muted-foreground">as {itemName(slotFor(r, id)!.id)}</div>}</td>
                        <td className="px-4 py-2 hidden sm:table-cell"><FacilityBadges recipe={r} /></td>
                        <td className="px-4 py-2 text-right tabular-nums text-foreground/75">{fmtTime(r.time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            ) : <Empty>Nothing in game uses this directly.</Empty>}
          </Section>
        </>
      )}
    </div>
  );
}
