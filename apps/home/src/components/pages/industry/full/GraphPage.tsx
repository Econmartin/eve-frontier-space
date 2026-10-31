import { useSearchParams } from 'react-router';
import { cn } from '@/lib/utils';
import { industryItems, itemName, producedBy, recipeAvailable, starterProducts } from '@/lib/industry';
import { Empty, ItemPicker, Panel, Select, SuggestionChips, useIndustrySettings } from '../parts';
import { GraphPanel, buildItemGraph, type Mode } from './graph';

/** Reference view: the full graph with every control. */
export function GraphPage() {
  const [params, setParams] = useSearchParams();
  const root = params.get('item') ? Number(params.get('item')) : undefined;
  const { showUnavailable } = useIndustrySettings();
  const hasRecipes = !!root && (producedBy.get(root) ?? []).some((r) => showUnavailable || recipeAvailable(r));
  const mode = (params.get('mode') as Mode) || (hasRecipes ? 'up' : 'down');
  const depth = Math.min(5, Math.max(1, Number(params.get('depth')) || (mode === 'down' ? 2 : 3)));
  const productsOnly = params.get('view') === 'products';
  const set = (patch: Record<string, string | undefined>) => { const p = new URLSearchParams(params); for (const [k, v] of Object.entries(patch)) v === undefined ? p.delete(k) : p.set(k, v); setParams(p, { replace: true }); };
  return (
    <div className="flex flex-col gap-4">
      <Panel className="flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap">
        <div className="flex-1 min-w-[240px]"><ItemPicker pool={industryItems} placeholder="Graph an item…" onPick={(it) => set({ item: String(it.id), mode: undefined, depth: undefined })} clearOnPick={false} value={root ? itemName(root) : ''} /></div>
        <div className="inline-flex rounded-xl ring-1 ring-foreground/15 p-0.5 bg-background" role="group" aria-label="Direction">
          {([['up', 'Made from'], ['down', 'Used in'], ['both', 'Both']] as [Mode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => set({ mode: m })} className={cn('rounded-lg px-3 h-8 text-xs font-semibold transition-colors', mode === m ? 'bg-[var(--color-martian-500)] text-black' : 'text-muted-foreground hover:text-foreground')}>{label}</button>
          ))}
        </div>
        <div className="inline-flex rounded-xl ring-1 ring-foreground/15 p-0.5 bg-background" role="group" aria-label="Detail">
          {([['full', 'Recipes'], ['products', 'Products only']] as const).map(([v, label]) => (
            <button key={v} onClick={() => set({ view: v === 'full' ? undefined : v })} className={cn('rounded-lg px-3 h-8 text-xs font-semibold transition-colors', (v === 'products') === productsOnly ? 'bg-[var(--color-martian-500)] text-black' : 'text-muted-foreground hover:text-foreground')}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2"><span className="text-xs tracking-[0.16em] uppercase text-muted-foreground">Levels</span><Select ariaLabel="Depth" value={String(depth)} onChange={(v) => set({ depth: v })} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))} /></div>
      </Panel>
      {!root ? (
        <Empty>Pick an item to draw its production graph. "Made from" walks upstream to raw materials, "Used in" walks outward through everything that consumes it. Click a node to re-centre, double-click to open the item.
          <SuggestionChips label="Try one" items={starterProducts(10, showUnavailable)} onPick={(it) => set({ item: String(it.id), mode: undefined, depth: undefined })} />
        </Empty>
      ) : (
        <GraphPanel className="h-[72dvh] min-h-[480px]" build={() => buildItemGraph(root, { mode, depth, showUnavailable, productsOnly })} deps={[root, mode, depth, showUnavailable, productsOnly]}
          onItem={(id) => { if (id !== root) set({ item: String(id) }); }}
          note="Orange pills are recipes, labelled with their facility and run time; blue means built in open space; greyed pills are not in game this cycle. Edge labels are quantities per run. Upstream follows the planner's default recipe for each input; downstream draws only the edge from the item being followed." />
      )}
    </div>
  );
}
