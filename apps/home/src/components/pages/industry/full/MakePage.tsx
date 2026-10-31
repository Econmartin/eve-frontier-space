import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { industryItems, itemName, itemOf, producedBy, recipeAvailable, starterProducts } from '@/lib/industry';
import { Empty, Select, ItemIcon, ItemPicker, Panel, RecipeCard, Section, SuggestionChips, useIndustrySettings, useVisible } from '../parts';
import { GraphPanel, GraphPlaceholder, buildItemGraph } from './graph';

/** Step 3: pick a product, see how it is made. */
export function MakePage() {
  const [params, setParams] = useSearchParams();
  const id = params.get('item') ? Number(params.get('item')) : undefined;
  const depth = Math.min(4, Math.max(1, Number(params.get('depth')) || 2));
  const setDepth = (v: string) => { const p = new URLSearchParams(params); p.set('depth', v); setParams(p, { replace: true }); };
  const { showUnavailable } = useIndustrySettings();
  const pool = useMemo(() => industryItems.filter((i) => (producedBy.get(i.id) ?? []).some((r) => showUnavailable || recipeAvailable(r))), [showUnavailable]);
  const made = useVisible(id ? (producedBy.get(id) ?? []).filter((r) => r.product === id) : []);
  const pick = (iid: number) => { const p = new URLSearchParams(params); p.set('item', String(iid)); setParams(p, { replace: true }); };
  return (
    <div className="flex flex-col gap-4">
      <Panel className="flex flex-col gap-3">
        <ItemPicker pool={pool} placeholder="What do you want to make?" onPick={(it) => pick(it.id)} clearOnPick={false} value={id ? itemName(id) : ''} />
        <SuggestionChips label="Early builds" items={starterProducts(12, showUnavailable)} onPick={(it) => pick(it.id)} />
      </Panel>
      {!id ? (
        <>
          <div className="flex items-center gap-3 min-h-11">
            <div className="size-11 rounded-lg bg-foreground/5" />
            <div><div className="text-xs tracking-[0.16em] uppercase text-muted-foreground">Pick a product</div><h2 className="text-2xl font-bold leading-none">How to make it</h2></div>
          </div>
          <GraphPlaceholder>The graph walks back from a product to raw materials, following the usual recipe at each step, and the cards below show every way to make it.</GraphPlaceholder>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap min-h-11">
            <div className="flex items-center gap-3">
              <ItemIcon id={id} size={44} className="rounded-lg" />
              <div><div className="text-xs tracking-[0.16em] uppercase text-muted-foreground">{itemOf(id).group}</div><h2 className="text-2xl font-bold leading-none">How to make {itemName(id)}</h2></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2"><span className="text-xs tracking-[0.16em] uppercase text-muted-foreground">Steps back</span><Select ariaLabel="Depth" value={String(depth)} onChange={setDepth} options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))} /></div>
              <Link to={`/industry/plan?item=${id}`} className="no-underline rounded-xl bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-85 transition-opacity">Shopping list →</Link>
            </div>
          </div>
          <GraphPanel build={() => buildItemGraph(id, { mode: 'up', depth, showUnavailable })} deps={[id, depth, showUnavailable]} onItem={(iid) => { if (producedBy.has(iid)) pick(iid); }}
            note="Orange pills are recipes with their facility and run time; numbers on the arrows are quantities per run. Past the first step the graph follows the usual recipe for each input; click a made item to centre on it." />
          <Section title={`Ways to make it · ${made.length}`} className="mb-0 min-h-[60dvh]">
            {made.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{made.map((r) => <RecipeCard key={r.id} recipe={r} highlight={id} />)}</div> : <Empty>No recipe for this in game this cycle.</Empty>}
          </Section>
        </>
      )}
    </div>
  );
}
