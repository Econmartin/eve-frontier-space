import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { computeYield, conversionsFor, FAMILY_HINTS, facilityName, shownFacilityNames, fmtTime, industryItems, isBaseInput, itemName, itemOf, recipeAvailable, regolithFamilies, regoliths, reprocessing, rockFor, rocks, compositeMaterials, compositeRocks, composites, rocksWith, CLASS_LABEL, priceOf, valueOf, type QtyClass, type Item } from '@/lib/industry';
import { Empty, FacilityBadges, IOList, ItemIcon, ItemLink, ItemPicker, NumberField, Panel, Price, Qty, Section, SuggestionChips, useIndustrySettings } from '../parts';
import { GamelogPanel } from '../GamelogPanel';

/** Step 1: pick a rock, see what comes out of it. */
export function MinePage() {
  const [params, setParams] = useSearchParams();
  // ?rock= is a composite asteroid name (Flint, Mire…); ?item= is a regolith / salvage
  const comp = params.get('rock') ? compositeRocks.find((r) => r.name === params.get('rock')) : undefined;
  const rock = params.get('item') ? Number(params.get('item')) : undefined;
  const legacyIcon = (name: string, materials: { id: number }[]) => rocks.find((r) => itemOf(r.id).name === name)?.id ?? materials[0]?.id;
  const clsStyle: Record<QtyClass, string> = { L: 'bg-[var(--color-martian-500)] text-black', S: 'bg-[var(--color-martian-500)]/25 text-foreground', T: 'bg-foreground/10 text-muted-foreground' };
  const [qty, setQty] = useState(1000);
  const [family, setFamily] = useState<string>('all');
  const { showUnavailable } = useIndustrySettings();
  const conv = (id: number) => conversionsFor(id).filter((r) => showUnavailable || recipeAvailable(r));
  const minable = useMemo(() => industryItems.filter((i) => isBaseInput(i.id) && conv(i.id).length > 0), [showUnavailable]);
  const rockConv = rock ? conv(rock) : [];
  const pick = (id: number) => setParams({ item: String(id) }, { replace: true });
  const pickRock = (name: string) => setParams({ rock: name }, { replace: true });
  // community clears submitted through "My rocks" (optional; absent when the API is not deployed)
  type RockSummary = { samples: number; units: number; prefixes: Record<string, number>; regoliths: Record<string, { seen: number; units: number; share: number; presence: number; min: number; max: number }> };
  const [community, setCommunity] = useState<Record<string, RockSummary> | null>(null);
  useEffect(() => { fetch(`/api/mining-sessions/summary?cycle=${encodeURIComponent(composites.cycle)}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => setCommunity(j?.rocks ?? null)).catch(() => setCommunity(null)); }, []);

  // material -> regolith sources (first hop only)
  const sources = useMemo(() => {
    const m = new Map<number, { regolith: Item; per: number; of: number }[]>();
    for (const r of regoliths) for (const c of conv(r.id)) for (const o of c.outputs) {
      const list = m.get(o.id) ?? []; if (!list.some((x) => x.regolith.id === r.id)) list.push({ regolith: r, per: o.qty, of: c.inputs[0].qty }); m.set(o.id, list);
    }
    return [...m.entries()].sort((a, b) => itemName(a[0]).localeCompare(itemName(b[0])));
  }, [showUnavailable]);
  const shown = regoliths.filter((r) => family === 'all' || r.group === family);

  return (
    <div className="flex flex-col gap-2">
      <Section title="Which rock did you find?">
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          {compositeRocks.map((r) => { const on = comp?.name === r.name; return (
            <button key={r.name} onClick={() => pickRock(r.name)} aria-pressed={on}
              className={cn('text-left rounded-xl p-2.5 ring-1 flex items-center gap-2.5 transition-colors', on ? 'bg-[var(--color-martian-500)] text-black ring-transparent' : 'bg-card ring-foreground/10 hover:bg-muted')}>
              <ItemIcon id={legacyIcon(r.name, r.materials)} size={36} className="rounded-lg" />
              <div className="min-w-0">
                <div className="font-heading leading-tight">{r.name}</div>
                <div className={cn('text-[0.6rem] uppercase tracking-wider truncate', on ? 'text-black/70' : 'text-muted-foreground')}>{r.materials.length} regolith{r.materials.length === 1 ? '' : 's'}</div>
              </div>
            </button>
          ); })}
        </div>
        <p className="text-xs text-muted-foreground font-sans mt-2">Composite asteroids as named in game, with what they contain, from the community table for {composites.cycle}, corrected with measured clears from My rocks (last updated {composites.seen?.updated}). Percentages are estimates from those clears; large, small, and trace come from the table where nobody has cleared one yet; exact numbers depend on the rock's voxel layers. Mined one? <Link to="/industry/rocks" className="text-[var(--color-martian-500)]">Add your log in My rocks</Link> and the averages here grow.</p>

        {comp && (
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Panel className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3"><ItemIcon id={legacyIcon(comp.name, comp.materials)} size={48} className="rounded-lg" /><div><div className="text-xs tracking-[0.16em] uppercase text-muted-foreground">composite asteroid</div><h3 className="font-heading text-2xl leading-none">{comp.name}</h3></div></div>
              <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">Contains</div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {comp.materials.map((mat) => { const c = conv(mat.id)[0]; return (
                  <li key={mat.id} className="rounded-xl ring-1 ring-foreground/10 p-3 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => pick(mat.id)} className="inline-flex items-center gap-2 text-left hover:text-[var(--color-martian-500)] min-w-0"><ItemIcon id={mat.id} size={26} /><span className="text-sm truncate">{itemName(mat.id)}</span></button>
                      <span className={cn('shrink-0 rounded-full px-2 h-5 inline-flex items-center text-[0.6rem] uppercase tracking-wider', clsStyle[mat.cls])}>{mat.share != null ? `est. ${Math.round(mat.share)}%` : CLASS_LABEL[mat.cls]}</span>
                    </div>
                    <div className="text-[0.65rem] text-muted-foreground">
                      {mat.share == null ? (comp.seen ? 'in the table, not seen in clears yet' : 'from the community table')
                        : !mat.tableCls ? <span className="text-[var(--color-martian-500)]">seen in clears, not in the table</span>
                        : mat.tableCls !== mat.cls ? `measured ${CLASS_LABEL[mat.cls]}, table says ${CLASS_LABEL[mat.tableCls]}`
                        : `measured ${CLASS_LABEL[mat.cls]}, matches the table`}
                      {comp.seen?.clears && mat.presence != null ? ` · in ${mat.presence} of ${comp.seen.clears} clear${comp.seen.clears === 1 ? '' : 's'}` : ''}
                    </div>
                    {c ? <div className="text-xs text-foreground/75">{c.inputs[0].qty} → {c.outputs.map((o) => `${o.qty} ${itemName(o.id)}`).join(', ')}</div> : <div className="text-xs text-muted-foreground">no refine recipe yet</div>}
                    {priceOf(mat.id) != null && <div className="text-xs"><Price n={priceOf(mat.id)!} per="unit raw" /></div>}
                  </li>
                ); })}
              </ul>
              {comp.seen ? (
                <div className="text-xs text-foreground/75 font-sans">
                  {comp.seen.clears ? `Estimated from ${comp.seen.clears} clear${comp.seen.clears === 1 ? '' : 's'} of 100+ voxels` : `Estimated from ${comp.seen.samples} small sample${comp.seen.samples === 1 ? '' : 's'}, so treat them as rough`} · {comp.seen.voxels.toLocaleString()} voxels · {comp.seen.pilots} pilot{comp.seen.pilots === 1 ? '' : 's'}.{(comp.seen.clears < 3 || comp.seen.pilots < 2) ? ' Early numbers, likely to move.' : ''}
                  {comp.seen.variants && <ul className="mt-2 flex flex-col gap-1">{Object.entries(comp.seen.variants).map(([v, x]) => <li key={v}><span className="capitalize font-semibold">{v}</span> ({x.clears} clears): {Object.entries(x.shares).filter(([, pct]) => pct >= 3).map(([id, pct]) => `${itemName(Number(id))} est. ${Math.round(pct)}%`).join(', ')}</li>)}</ul>}
                </div>
              ) : <div className="text-xs text-muted-foreground font-sans">No clears of this rock yet, so this is the community table only. Add yours in My rocks.</div>}
              {community?.[comp.name] && (() => { const c = community[comp.name]; const rows = Object.entries(c.regoliths).map(([id, g]) => ({ id: Number(id), ...g })).sort((a, b) => b.share - a.share); return (
                <div className="pt-3 border-t border-foreground/10">
                  <div className="flex items-baseline justify-between gap-2 mb-2"><div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">Community clears · {c.samples} sample{c.samples === 1 ? '' : 's'}</div><span className="text-xs text-foreground/75 tabular-nums">{c.units.toLocaleString()} units logged</span></div>
                  <ul className="flex flex-col gap-1.5">{rows.map((g) => (
                    <li key={g.id} className="text-sm"><div className="flex items-center justify-between gap-2"><button onClick={() => pick(g.id)} className="inline-flex items-center gap-1.5 hover:text-[var(--color-martian-500)] min-w-0"><ItemIcon id={g.id} size={18} /><span className="truncate">{itemName(g.id)}</span></button><span className="tabular-nums shrink-0 text-xs"><span className="font-semibold">{Math.round(100 * g.share)}%</span> <span className="text-foreground/75">avg · {Math.round(100 * g.min)}–{Math.round(100 * g.max)}% · in {Math.round(100 * g.presence)}% of clears</span></span></div><div className="h-1 rounded-full bg-foreground/10 mt-1"><div className="h-1 rounded-full bg-[var(--color-ocean-500)]" style={{ width: `${100 * g.share}%` }} /></div></li>
                  ))}</ul>
                  {Object.keys(c.prefixes).length > 0 && <div className="text-xs text-muted-foreground mt-2">prefixes seen: {Object.entries(c.prefixes).map(([p, n]) => `${p} ×${n}`).join(', ')}</div>}
                </div>
              ); })()}
              {composites.observed.filter((o) => o.name === comp.name).map((o) => { const total = Object.values(o.yields).reduce((a, b) => a + b, 0); return (
                <div key={o.variant ?? o.name} className="pt-3 border-t border-foreground/10">
                  <div className="flex items-baseline justify-between gap-2 mb-2"><div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">Recorded clear{o.variant ? ` · ${o.variant}` : ''}</div><span className="text-xs text-foreground/75 tabular-nums">{total.toLocaleString()} units</span></div>
                  <ul className="flex flex-col gap-1.5">{Object.entries(o.yields).map(([id, q]) => ({ id: Number(id), q })).sort((a, b) => b.q - a.q).map(({ id, q }) => (
                    <li key={id} className="text-sm"><div className="flex items-center justify-between gap-2"><button onClick={() => pick(id)} className="inline-flex items-center gap-1.5 hover:text-[var(--color-martian-500)] min-w-0"><ItemIcon id={id} size={18} /><span className="truncate">{itemName(id)}</span></button><span className="tabular-nums shrink-0"><Qty n={q} /> <span className="text-foreground/75">· {Math.round((100 * q) / total)}%</span></span></div><div className="h-1 rounded-full bg-foreground/10 mt-1"><div className="h-1 rounded-full bg-[var(--color-martian-500)]" style={{ width: `${(100 * q) / total}%` }} /></div></li>
                  ))}</ul>
                  {o.note && <div className="text-xs text-muted-foreground font-sans mt-2">{o.note}</div>}
                </div>
              ); })}
            </Panel>
            <Panel className="p-4 flex flex-col gap-3 self-start">
              <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">How composites work</div>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">A composite asteroid is a voxel body generated from a server-side recipe: a shape, a prefix such as hollow or shocked, and layers of up to eight materials placed by depth. Mining removes voxels, so the mix you get is the materials you cut through. The server names them and picks the mix, so the client files cannot list them; this catalog is player knowledge.</p>
              <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">The eight material slots</div>
              <ul className="text-xs flex flex-col gap-1">{compositeMaterials.map((mm) => <li key={mm.material} className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{mm.material}</span><button onClick={() => pick(mm.regolith)} className="inline-flex items-center gap-1.5 hover:text-[var(--color-martian-500)]"><ItemIcon id={mm.regolith} size={18} />{itemName(mm.regolith)}</button></li>)}</ul>
              <a href="/tools/asteroid-lab.html" className="text-xs text-[var(--color-martian-500)] no-underline">Open the asteroid lab to generate one →</a>
            </Panel>
          </div>
        )}
      </Section>

      <Section title="Or start from a regolith, ore, or salvage">
        <Panel className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1 min-w-0"><ItemPicker pool={minable} placeholder="Regolith, ore, or salvage…" onPick={(it) => pick(it.id)} clearOnPick={false} value={rock ? itemName(rock) : ''} /></div>
            <div className="flex items-center gap-2"><span className="text-xs tracking-[0.16em] uppercase text-muted-foreground">I mined</span><NumberField value={qty} onChange={setQty} ariaLabel="quantity mined" /></div>
          </div>
          {!rock && <SuggestionChips label="Salvage and other finds" items={minable.filter((i) => !i.regolith).slice(0, 10)} onPick={(it) => pick(it.id)} />}
        </Panel>
        {rock && (
          <div className="mt-3 grid gap-3 md:grid-cols-[300px_minmax(0,1fr)]">
            <Panel className="p-4 flex flex-col gap-3 self-start">
              <div className="flex items-center gap-3"><ItemIcon id={rock} size={56} className="rounded-lg" /><div><div className="font-heading text-lg leading-tight"><ItemLink id={rock} /></div><div className="text-xs text-muted-foreground">{itemOf(rock).group}</div></div></div>
              {itemOf(rock).volume != null && <div className="text-xs text-foreground/75 tabular-nums">{qty.toLocaleString()} × {itemOf(rock).volume} m³ = {(qty * (itemOf(rock).volume ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })} m³ of hold</div>}
              {itemOf(rock).regolith && <Badge variant="outline">{itemOf(rock).group.replace(' Regoliths', '')} family</Badge>}
              {priceOf(rock) != null && <div className="text-sm">NPC trade value <Price n={priceOf(rock)!} per="unit" /> · {qty.toLocaleString()} units ≈ <Price n={priceOf(rock)! * qty} /></div>}
              {rocksWith(rock).length > 0 && (
                <div className="pt-3 border-t border-foreground/10 flex flex-col gap-2">
                  <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">Found in</div>
                  <div className="flex flex-wrap gap-1.5">{rocksWith(rock).map(({ rock: r, cls }) => <button key={r.name} onClick={() => pickRock(r.name)} className={cn('rounded-full px-2.5 h-6 text-xs inline-flex items-center gap-1', clsStyle[cls])}>{r.name}<span className="opacity-70">· {CLASS_LABEL[cls]}</span></button>)}</div>
                  {rockFor(rock) && itemOf(rockFor(rock)!.id).description && <p className="text-xs text-muted-foreground font-sans leading-relaxed">{itemOf(rockFor(rock)!.id).description}</p>}
                </div>
              )}
            </Panel>
            <div className="grid gap-3 sm:grid-cols-2">
              {rockConv.length ? rockConv.map((r) => { const y = computeYield(rock, qty, r); return (
                <Panel key={r.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3"><FacilityBadges recipe={r} /><span className="text-xs text-foreground/75 tabular-nums">{fmtTime(r.time)} / run</span></div>
                  <div className="text-sm"><Qty n={r.inputs[0].qty} /> <span className="text-muted-foreground">{itemName(rock)} per run →</span></div>
                  <IOList list={r.outputs} />
                  <div className="mt-1 pt-2 border-t border-foreground/10 text-xs text-foreground/75">
                    <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mb-1">From your {qty.toLocaleString()} · {y.runs} runs · {fmtTime(y.runs * r.time)}</div>
                    <ul className="flex flex-col gap-0.5">{y.outputs.map((o) => <li key={o.id} className="flex justify-between gap-2"><Link to={`/industry/materials?item=${o.id}`} className="no-underline text-foreground hover:text-[var(--color-martian-500)]">{itemName(o.id)} →</Link><Qty n={o.qty} /></li>)}</ul>
                    {y.leftover > 0 && <div className="text-muted-foreground mt-1">{y.leftover.toLocaleString()} left over</div>}
                    {(() => { const vo = valueOf(y.outputs); const vi = priceOf(rock); return vo.priced > 0 ? <div className="mt-1 flex justify-between gap-2"><span className="text-muted-foreground">outputs' trade value{vo.priced < y.outputs.length ? ' (partial)' : ''}</span><span><Price n={vo.total} />{vi ? <span className="text-muted-foreground"> vs raw {Math.round((100 * vo.total) / (vi * y.used))}%</span> : null}</span></div> : null; })()}
                  </div>
                </Panel>
              ); }) : <Empty>No facility in game refines this yet.</Empty>}
            </div>
          </div>
        )}
        {rock && rockConv.length > 0 && <p className="text-xs text-muted-foreground font-sans mt-2">Click an output to see what it becomes in step 2.</p>}
      </Section>

      <Section title="Read your own game log">
        <GamelogPanel onPickMaterial={pick} />
      </Section>

      <Section title="Which regolith to mine for a material">
        <Panel className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground"><tr className="border-b border-foreground/10"><th className="text-left font-normal px-4 py-2">Material</th><th className="text-left font-normal px-4 py-2">Mine</th><th className="text-right font-normal px-4 py-2">Best yield</th><th className="text-left font-normal px-4 py-2 hidden md:table-cell">Family</th></tr></thead>
            <tbody className="divide-y divide-foreground/5">
              {sources.map(([mat, list]) => list.sort((a, b) => b.per / b.of - a.per / a.of).map((s, i) => (
                <tr key={`${mat}-${s.regolith.id}`} className="hover:bg-muted/50">
                  <td className="px-4 py-2">{i === 0 && <ItemLink id={mat} icon className="font-semibold" />}</td>
                  <td className="px-4 py-2"><button onClick={() => pick(s.regolith.id)} className="inline-flex items-center gap-1.5 text-left hover:text-[var(--color-martian-500)]"><ItemIcon id={s.regolith.id} size={20} />{s.regolith.name}</button></td>
                  <td className="px-4 py-2 text-right tabular-nums"><Qty n={s.per} /> <span className="text-foreground/75">per {s.of}</span></td>
                  <td className="px-4 py-2 hidden md:table-cell text-muted-foreground">{s.regolith.group}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </Panel>
      </Section>

      <Section title={`Regolith atlas · ${shown.length}`} aside={
        <div className="flex flex-wrap gap-1.5 justify-end">
          {['all', ...regolithFamilies].map((f) => <button key={f} onClick={() => setFamily(f)} className={cn('rounded-full px-3 h-7 text-xs ring-1 transition-colors', family === f ? 'bg-[var(--color-martian-500)] text-black ring-transparent' : 'ring-foreground/15 hover:bg-muted')}>{f === 'all' ? 'All' : f.replace(' Regoliths', '')}</button>)}
        </div>}>
        {family !== 'all' && FAMILY_HINTS[family] && <p className="text-sm text-muted-foreground font-sans mb-4 max-w-2xl">{FAMILY_HINTS[family]}</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.sort((a, b) => Number(conv(b.id).length > 0) - Number(conv(a.id).length > 0) || a.name.localeCompare(b.name)).map((r) => {
            const c = conv(r.id);
            return (
              <Panel key={r.id} className={cn('p-4 flex flex-col gap-2', !c.length && 'opacity-70')}>
                <div className="flex items-start justify-between gap-2"><button onClick={() => pick(r.id)} className="font-heading leading-tight text-left inline-flex items-center gap-2 hover:text-[var(--color-martian-500)]"><ItemIcon id={r.id} size={28} />{r.name}</button><Badge variant="outline" className="shrink-0">{r.group.replace(' Regoliths', '')}</Badge></div>
                {rocksWith(r.id).length > 0 && <div className="text-xs text-foreground/75">in {rocksWith(r.id).map((x) => x.rock.name).join(', ')}</div>}
                {c.length ? (
                  <ul className="text-sm flex flex-col gap-1">
                    {c.map((x) => <li key={x.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><span className="text-xs text-foreground/70 w-full">{[...new Set(x.facilities.map((f) => facilityName(f.id)))].join(' / ')} · {x.inputs[0].qty} in</span>{x.outputs.map((o) => <span key={o.id}><Qty n={o.qty} /> <ItemLink id={o.id} /></span>)}</li>)}
                  </ul>
                ) : <div className="text-xs text-muted-foreground font-sans">Defined in the client as a mineable block, but no facility accepts it yet.</div>}
              </Panel>
            );
          })}
        </div>
      </Section>

      <Section title="Reprocessing table (type materials)">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reprocessing.map((r) => (
            <Panel key={r.id} className="p-4">
              <div className="font-heading mb-1"><ItemLink id={r.id} icon iconSize={24} /></div>
              <div className="text-xs text-foreground/75 mb-2">per portion of {r.portionSize?.toLocaleString() ?? '?'} {itemName(r.id)}</div>
              <IOList list={r.materials} />
            </Panel>
          ))}
        </div>
        <p className="text-xs text-muted-foreground font-sans mt-2">These five come from the client's separate reprocessing table rather than blueprints; yields there are before any skill or facility modifiers.</p>
      </Section>

      <Section title="Where belts come in">
        <Empty>
          Belt sites in the client carry tags such as <code>carbonaceous</code>, <code>icy</code>, <code>rocky</code>, belt temperature, and star chemistry.
          The server's spawn rules turn those into a weighted mix of the five families, so a tag is a hint about which regoliths to expect, not a guarantee.
          Only 8 of the 64 regoliths refine today; the rest are defined but unused, which usually means more are on the way.
        </Empty>
      </Section>
    </div>
  );
}
