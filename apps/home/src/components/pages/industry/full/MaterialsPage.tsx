import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { computeYield, conversionsFor, FAMILY_HINTS, facilityName, shownFacilityNames, fmtTime, industryItems, isBaseInput, itemName, itemOf, recipeAvailable, regolithFamilies, regoliths, reprocessing, asteroidKinds, minedNow, ABUNDANCE_LABEL, priceOf, valueOf, type Item } from '@/lib/industry';
import { Empty, FacilityBadges, IOList, ItemIcon, ItemLink, ItemPicker, NumberField, Panel, Price, Qty, Section, SuggestionChips, useIndustrySettings } from '../parts';

/** Step 1: pick a rock, see what comes out of it. */
export function MinePage() {
  const [params, setParams] = useSearchParams();
  // ?rock= is an asteroid kind by name (Marrow, Char…); ?item= is a regolith / salvage
  const short = (name: string) => name.replace(/\s*\(.*\)$/, '');
  const kind = params.get('rock') ? asteroidKinds.find((a) => short(a.name).toLowerCase() === params.get('rock')!.toLowerCase() || a.kind === params.get('rock')) : undefined;
  const rock = params.get('item') ? Number(params.get('item')) : undefined;
  // Dominant and Major stand out, Moderate is plain, Minor and Trace fade
  const abundanceStyle = (a: number) => (a >= 4 ? 'bg-[var(--color-martian-500)] text-black' : a === 3 ? 'bg-[var(--color-martian-500)]/25 text-foreground' : 'bg-foreground/10 text-muted-foreground');
  const kindsHolding = (id: number) => asteroidKinds.map((k) => ({ k, a: k.holds.find(([r]) => r === id)?.[1] })).filter((x): x is { k: typeof asteroidKinds[number]; a: number } => x.a !== undefined).sort((x, y) => y.a - x.a);
  const [qty, setQty] = useState(1000);
  const [family, setFamily] = useState<string>('all');
  const { showUnavailable } = useIndustrySettings();
  const conv = (id: number) => conversionsFor(id).filter((r) => showUnavailable || recipeAvailable(r));
  // regoliths no asteroid holds any more (before 0.7.6.0) stay behind the "show not in game" toggle
  const current = (i: Item) => !i.regolith || minedNow.has(i.id) || showUnavailable;
  const minable = useMemo(() => industryItems.filter((i) => isBaseInput(i.id) && conv(i.id).length > 0 && current(i)), [showUnavailable]);
  const rockConv = rock ? conv(rock) : [];
  const pick = (id: number) => setParams({ item: String(id) }, { replace: true });
  const pickRock = (name: string) => setParams({ rock: short(name) }, { replace: true });
  // material -> regolith sources (first hop only)
  const sources = useMemo(() => {
    const m = new Map<number, { regolith: Item; per: number; of: number }[]>();
    for (const r of regoliths.filter(current)) for (const c of conv(r.id)) for (const o of c.outputs) {
      const list = m.get(o.id) ?? []; if (!list.some((x) => x.regolith.id === r.id)) list.push({ regolith: r, per: o.qty, of: c.inputs[0].qty }); m.set(o.id, list);
    }
    return [...m.entries()].sort((a, b) => itemName(a[0]).localeCompare(itemName(b[0])));
  }, [showUnavailable]);
  // regoliths nothing refines yet stay behind the "show not in game" toggle
  const usable = regoliths.filter((r) => current(r) && (showUnavailable || conv(r.id).length > 0));
  const families = regolithFamilies.filter((f) => usable.some((r) => r.group === f));
  const shown = usable.filter((r) => family === 'all' || r.group === family);

  return (
    <div className="flex flex-col gap-2">
      <Section title="Which rock did you find?">
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {asteroidKinds.map((a) => { const on = kind?.kind === a.kind; return (
            <button key={a.kind} onClick={() => pickRock(a.name)} aria-pressed={on}
              className={cn('text-left rounded-xl p-2.5 ring-1 flex items-center gap-2.5 transition-colors', on ? 'bg-[var(--color-martian-500)] text-black ring-transparent' : 'bg-card ring-foreground/10 hover:bg-muted')}>
              <img src={a.icon} alt="" width={40} height={40} loading="lazy" className="size-10 shrink-0 object-contain" />
              <div className="min-w-0">
                <div className="font-heading leading-tight">{short(a.name)}</div>
                <div className={cn('text-[0.6rem] uppercase tracking-wider truncate', on ? 'text-black/70' : 'text-muted-foreground')}>{a.kind} · {a.holds.length} regolith{a.holds.length === 1 ? '' : 's'}</div>
              </div>
            </button>
          ); })}
        </div>
        <p className="text-xs text-muted-foreground font-sans mt-2">The asteroid kinds in game since 0.7.6.0 and what each one holds, from the client's own Mined From table: Dominant, Major, Moderate, Minor or Trace. How much of each you get from one rock depends on its layers and where you cut. Mined one? <Link to="/industry/rocks" className="text-[var(--color-martian-500)]">Add your log in My rocks</Link>.</p>

        {kind && (
          <Panel className="mt-3 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3"><img src={kind.icon} alt="" width={56} height={56} className="size-14 object-contain" /><div><div className="text-xs tracking-[0.16em] uppercase text-muted-foreground">{kind.kind} asteroid</div><h3 className="font-heading text-2xl leading-none">{short(kind.name)}</h3></div></div>
            {kind.description && <p className="text-xs text-muted-foreground font-sans leading-relaxed max-w-3xl">{kind.description}</p>}
            <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">Holds</div>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {kind.holds.map(([id, a]) => { const c = conv(id)[0]; return (
                <li key={id} className="rounded-xl ring-1 ring-foreground/10 p-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={() => pick(id)} className="inline-flex items-center gap-2 text-left hover:text-[var(--color-martian-500)] min-w-0"><ItemIcon id={id} size={26} /><span className="text-sm truncate">{itemName(id)}</span></button>
                    <span className={cn('shrink-0 rounded-full px-2 h-5 inline-flex items-center text-[0.6rem] uppercase tracking-wider', abundanceStyle(a))}>{ABUNDANCE_LABEL[a]}</span>
                  </div>
                  {c ? <div className="text-xs text-foreground/75">refines to {c.outputs.map((o) => itemName(o.id)).join(', ')}</div> : <div className="text-xs text-muted-foreground">no refining schema yet</div>}
                  {priceOf(id) != null && <div className="text-xs"><Price n={priceOf(id)!} per="unit raw" /></div>}
                </li>
              ); })}
            </ul>
          </Panel>
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
              {kindsHolding(rock).length > 0 && (
                <div className="pt-3 border-t border-foreground/10 flex flex-col gap-2">
                  <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">Found in</div>
                  <div className="flex flex-wrap gap-1.5">{kindsHolding(rock).map(({ k, a }) => <button key={k.kind} onClick={() => pickRock(k.name)} className={cn('rounded-full px-2.5 h-6 text-xs inline-flex items-center gap-1', abundanceStyle(a))}>{short(k.name)}<span className="opacity-70">· {ABUNDANCE_LABEL[a]}</span></button>)}</div>
                </div>
              )}
              {itemOf(rock).regolith && !minedNow.has(rock) && <div className="text-xs text-muted-foreground">No asteroid holds this one since 0.7.6.0.</div>}
            </Panel>
            <div className="grid gap-3 sm:grid-cols-2">
              {rockConv.length ? rockConv.map((r) => { const y = computeYield(rock, qty, r); return (
                <Panel key={r.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3"><FacilityBadges recipe={r} /><span className="text-xs text-foreground/75 tabular-nums">{fmtTime(r.time)} / run</span></div>
                  <div className="text-sm"><Qty n={r.inputs[0].qty} /> <span className="text-muted-foreground">{itemName(rock)} per run →</span></div>
                  <IOList list={r.outputs} />
                  <div className="mt-1 pt-2 border-t border-foreground/10 text-xs text-foreground/75">
                    <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mb-1">From your {qty.toLocaleString()} · {y.runs} runs · {fmtTime(y.runs * r.time)}</div>
                    <ul className="flex flex-col gap-0.5">{y.outputs.map((o) => <li key={o.id} className="flex justify-between gap-2"><Link to={`/industry/materials?item=${o.id}`} className="no-underline text-foreground hover:text-[var(--color-martian-500)]">{itemName(o.id)} →</Link><Qty n={o.qty} id={o.id} /></li>)}</ul>
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

      <Section title="Mined something already?">
        <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground font-sans">Drop your game logs into My rocks to see every rock you mined, rebuilt in 3D, and add it to the community numbers.</p>
          <Link to="/industry/rocks" className="no-underline shrink-0 text-center rounded-xl bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-85 transition-opacity">Open My rocks →</Link>
        </Panel>
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
          {['all', ...families].map((f) => <button key={f} onClick={() => setFamily(f)} className={cn('rounded-full px-3 h-7 text-xs ring-1 transition-colors', family === f ? 'bg-[var(--color-martian-500)] text-black ring-transparent' : 'ring-foreground/15 hover:bg-muted')}>{f === 'all' ? 'All' : f.replace(' Regoliths', '')}</button>)}
        </div>}>
        {family !== 'all' && FAMILY_HINTS[family] && <p className="text-sm text-muted-foreground font-sans mb-4 max-w-2xl">{FAMILY_HINTS[family]}</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.sort((a, b) => Number(conv(b.id).length > 0) - Number(conv(a.id).length > 0) || a.name.localeCompare(b.name)).map((r) => {
            const c = conv(r.id);
            return (
              <Panel key={r.id} className={cn('p-4 flex flex-col gap-2', !c.length && 'opacity-70')}>
                <div className="flex items-start justify-between gap-2"><button onClick={() => pick(r.id)} className="font-heading leading-tight text-left inline-flex items-center gap-2 hover:text-[var(--color-martian-500)]"><ItemIcon id={r.id} size={28} />{r.name}</button><Badge variant="outline" className="shrink-0">{r.group.replace(' Regoliths', '')}</Badge></div>
                {kindsHolding(r.id).length > 0 && <div className="text-xs text-foreground/75">in {kindsHolding(r.id).map((x) => `${short(x.k.name)} (${ABUNDANCE_LABEL[x.a].toLowerCase()})`).join(', ')}</div>}
                {c.length ? (
                  <ul className="text-sm flex flex-col gap-1">
                    {c.map((x) => <li key={x.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><span className="text-xs text-foreground/70 w-full">{[...new Set(x.facilities.map((f) => facilityName(f.id)))].join(' / ')} · {x.inputs[0].qty} in</span>{x.outputs.map((o) => <span key={o.id}><Qty n={o.qty} id={o.id} /> <ItemLink id={o.id} /></span>)}</li>)}
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
        <p className="text-xs text-muted-foreground font-sans mt-2">These five come from the client's separate reprocessing table rather than schemas; yields there are before any skill or facility modifiers.</p>
      </Section>

      <Section title="Where belts come in">
        <Empty>
          Belt sites in the client carry tags such as <code>carbonaceous</code>, <code>icy</code>, <code>rocky</code>, belt temperature, and star chemistry.
          The server's spawn rules turn those into a weighted mix of asteroid kinds, so a tag is a hint about which rocks to expect, not a guarantee.
        </Empty>
      </Section>
    </div>
  );
}
