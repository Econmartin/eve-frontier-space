import { useMemo } from 'react';
import { fmtTime, itemOf, legacyRecipes, type Recipe } from '@/lib/industry';
import { Empty, FacilityBadges, IOList, ItemIcon, ItemLink, Panel, Qty, Section } from '../parts';

/** Materials made before 0.7.6.0: nothing uses them now, so all that is left is refining what you still hold. */
export function OldPage() {
  // one section per group (retired parts, old minerals…), each item with its refining schema
  const groups = useMemo(() => {
    const by = new Map<string, Recipe[]>();
    for (const r of legacyRecipes) { const g = itemOf(r.inputs[0].id).group; by.set(g, [...(by.get(g) ?? []), r]); }
    return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([g, rs]) => [g, rs.sort((a, b) => itemOf(a.inputs[0].id).name.localeCompare(itemOf(b.inputs[0].id).name))] as const);
  }, []);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground font-sans max-w-3xl">
        Materials from before 0.7.6.0. No schema makes or uses them any more, so the only thing left to do with old stock is refine it into the new materials. They are kept off the other pages and this tab goes away next cycle.
      </p>
      {!groups.length && <Empty>No old materials in this cycle's data.</Empty>}
      {groups.map(([g, rs]) => (
        <Section key={g} title={`${g} · ${rs.length}`}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rs.map((r) => {
              const input = r.inputs[0];
              return (
                <Panel key={r.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <ItemIcon id={input.id} size={36} className="rounded-lg" />
                    <div className="min-w-0 flex-1"><ItemLink id={input.id} className="font-heading leading-tight" /><div className="text-xs text-muted-foreground"><Qty n={input.qty} id={input.id} /> refines in {fmtTime(r.time)} into</div></div>
                  </div>
                  <IOList list={r.outputs} />
                  <FacilityBadges recipe={r} />
                </Panel>
              );
            })}
          </div>
        </Section>
      ))}
    </div>
  );
}
