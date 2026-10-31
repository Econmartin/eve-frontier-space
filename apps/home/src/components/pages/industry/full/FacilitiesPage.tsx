import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Factory, Ship } from 'lucide-react';
import { cn } from '@/lib/utils';
import { facilities, facilityKind, facilityName, recipeAvailable, recipes } from '@/lib/industry';
import { Empty, ItemIcon, Panel, RecipeCard, Section, useIndustrySettings } from '../parts';
import { GraphPanel, buildFacilityGraph } from './graph';

/** Step 4: pick a building, see what it can build. */
export function BasePage() {
  const [params, setParams] = useSearchParams();
  const id = params.get('facility') ? Number(params.get('facility')) : undefined;
  const withInputs = params.get('inputs') === '1';
  const { showUnavailable } = useIndustrySettings();
  const listed = useMemo(() => facilities
    .filter((f) => showUnavailable || facilityKind(f.id) !== 'unavailable')
    .map((f) => ({ ...f, kind: facilityKind(f.id), count: recipes.filter((r) => (showUnavailable || recipeAvailable(r)) && r.facilities.some((x) => x.id === f.id)).length }))
    .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'deployable' ? -1 : 1)), [showUnavailable]);
  const rs = useMemo(() => (id ? recipes.filter((r) => (showUnavailable || recipeAvailable(r)) && r.facilities.some((x) => x.id === id)) : []), [id, showUnavailable]);
  const set = (patch: Record<string, string | undefined>) => { const p = new URLSearchParams(params); for (const [k, v] of Object.entries(patch)) v === undefined ? p.delete(k) : p.set(k, v); setParams(p, { replace: true }); };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {listed.map((f) => { const Icon = f.kind === 'shipModule' ? Ship : Factory; const on = f.id === id; return (
          <button key={f.id} onClick={() => set({ facility: String(f.id) })} aria-pressed={on}
            className={cn('text-left rounded-xl p-3 ring-1 flex items-center gap-3 transition-colors', on ? 'bg-[var(--color-martian-500)] text-black ring-transparent' : 'bg-card ring-foreground/10 hover:bg-muted', f.kind === 'unavailable' && 'opacity-60')}>
            <ItemIcon id={f.id} size={40} className="rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="font-heading leading-tight truncate">{f.name}</div>
              <div className={cn('text-[0.65rem] uppercase tracking-wider flex items-center gap-1', on ? 'text-black/70' : 'text-muted-foreground')}><Icon className="size-3" />{f.kind === 'shipModule' ? 'ship module' : f.kind === 'deployable' ? 'structure' : 'not in game'} · {f.count} recipes</div>
            </div>
          </button>
        ); })}
      </div>
      {!id ? (
        <Empty>Pick a building or ship module to see everything it can produce. Structures are what you deploy at a base; ship modules are fitted and travel with you.</Empty>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-2xl font-bold leading-none">What a {facilityName(id)} can build</h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none"><input type="checkbox" checked={withInputs} onChange={(e) => set({ inputs: e.target.checked ? '1' : undefined })} className="accent-[var(--color-martian-500)]" /> show inputs</label>
          </div>
          <GraphPanel className="h-[75dvh] min-h-[560px]" build={() => buildFacilityGraph(id, showUnavailable, withInputs)} deps={[id, showUnavailable, withInputs]}
            note={'Every product this facility makes, grouped by type, with run time beside each. Breakdown outputs are labelled with the ore they come from. Tick "show inputs" to see what each product needs; click a product to open it.'} />
          <Section title={`Recipes · ${rs.length}`} className="mb-0">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rs.map((r) => <RecipeCard key={r.id} recipe={r} compact />)}</div>
          </Section>
        </>
      )}
    </div>
  );
}
