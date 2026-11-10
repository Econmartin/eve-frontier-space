import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  categories, consumedBy, conversionsFor, facilityKind, facilityLive, facilityName, fmtQty, fmtTime, fmtVol, industryItems, isBaseInput, itemAvailable, itemName, itemOf, priceOf, producedBy, propertyOf, recipeAvailable, recipes, searchItems, starterProducts, traitOf, usedIn,
} from '@/lib/industry';
import { Empty, FacilityBadge, FacilityBadges, IOList, ItemAvailabilityBadge, ItemIcon, ItemLink, Panel, Price, Qty, RecipeCard, Section, Select, SuggestionChips, useIndustrySettings, useVisible } from '../parts';

export function BrowserPage() {
  const { id } = useParams();
  const selected = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [kind, setKind] = useState<'all' | 'made' | 'base'>('all');
  const pool = useMemo(() => industryItems.filter((i) => (cat === 'all' || i.category === cat) && (kind === 'all' || (kind === 'made' ? producedBy.has(i.id) : isBaseInput(i.id)))), [cat, kind]);
  const results = useMemo(() => searchItems(q, pool, 500), [q, pool]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Panel className="lg:sticky lg:top-20 lg:self-start flex flex-col gap-3 max-h-[calc(100dvh-7rem)]">
        <div className="flex items-center gap-2 rounded-xl bg-background ring-1 ring-foreground/15 focus-within:ring-[var(--color-martian-500)] px-3 h-10">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items, groups…" className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select className="min-w-0" ariaLabel="Category" value={cat} onChange={setCat} options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]} />
          <Select className="min-w-0" ariaLabel="Kind" value={kind} onChange={(v) => setKind(v as typeof kind)} options={[{ value: 'all', label: 'Everything' }, { value: 'made', label: 'Craftable' }, { value: 'base', label: 'Base inputs' }]} />
        </div>
        <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">{results.length} items</div>
        <ul className="overflow-auto -mx-2 px-2 flex-1 min-h-0 divide-y divide-foreground/5">
          {results.map((it) => (
            <li key={it.id}>
              <button
                onClick={() => navigate(`/industry/item/${it.id}`)}
                className={cn('w-full text-left py-2 px-2 rounded-lg flex items-center justify-between gap-3 text-sm transition-colors', it.id === selected ? 'bg-[var(--color-martian-500)] text-black' : 'hover:bg-muted')}
              >
                <span className="flex items-center gap-2 min-w-0"><ItemIcon id={it.id} size={24} className={cn(!itemAvailable(it.id) && 'opacity-50')} /><span className={cn('truncate', !itemAvailable(it.id) && 'text-muted-foreground')}>{it.name}</span></span>
                <span className={cn('text-[0.65rem] uppercase tracking-wider shrink-0', it.id === selected ? 'text-black/60' : 'text-muted-foreground')}>{it.group}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="min-w-0">
        {selected ? <ItemDetail id={selected} /> : <Overview />}
      </div>
    </div>
  );
}

function Overview() {
  const navigate = useNavigate();
  const { showUnavailable } = useIndustrySettings();
  const live = recipes.filter((r) => showUnavailable || recipeAvailable(r));
  const stats = [
    ['recipes', live.length], ['craftable items', new Set(live.flatMap((r) => r.outputs.map((o) => o.id))).size], ['base inputs', [...new Set(live.flatMap((r) => r.inputs.map((i) => i.id)))].filter(isBaseInput).length], ['facilities', [...new Set(live.flatMap((r) => r.facilities.map((f) => f.id)))].filter(facilityLive).length],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(([k, v]) => (
          <Panel key={k} className="p-4">
            <div className="font-heading text-3xl text-[var(--color-martian-500)] tabular-nums">{v}</div>
            <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mt-1">{k}</div>
          </Panel>
        ))}
      </div>
      <Empty>Reference view: pick any item on the left to see what makes it, what it is used in, and where it runs.
        <SuggestionChips label="Start simple · made straight from raw materials" items={starterProducts(12, showUnavailable)} onPick={(it) => navigate(`/industry/item/${it.id}`)} />
      </Empty>
    </div>
  );
}

export function ItemDetail({ id }: { id: number }) {
  const it = itemOf(id);
  const { showUnavailable } = useIndustrySettings();
  const madeAll = producedBy.get(id) ?? [], usesAll = usedIn.get(id) ?? [], convAll = conversionsFor(id);
  const made = useVisible(madeAll), uses = useVisible(usesAll), conv = useVisible(convAll);
  const hidden = (all: unknown[], shown: unknown[]) => (all.length > shown.length ? <span className="text-xs text-muted-foreground normal-case tracking-normal">{all.length - shown.length} more not in game this cycle</span> : null);
  // one badge per facility name; where legacy and current types share a name, prefer the one players can build
  // one badge per facility name and kind (a structure Printer and a ship-module Printer are both shown)
  const runsAt = [...new Map(made.flatMap((r) => r.facilities.map((f) => f.id)).filter((id) => showUnavailable || facilityLive(id)).map((id) => [`${facilityName(id)}|${facilityKind(id)}`, id] as const)).values()];
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <ItemIcon id={id} size={72} className="rounded-xl ring-1 ring-foreground/10" />
          <div>
          <div className="text-xs tracking-[0.16em] uppercase text-muted-foreground mb-1">{it.group} · {it.category}</div>
          <h2 className="text-3xl sm:text-4xl font-bold leading-none">{it.name}</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            {isBaseInput(id) && it.trait === undefined && <Badge className="bg-[var(--color-martian-500)] text-black">base input</Badge>}
            {it.regolith && <Badge variant="outline">regolith · mined from asteroids</Badge>}
            <ItemAvailabilityBadge id={id} />
            {it.volume != null && it.unit !== 'kg' && <Badge variant="outline">{fmtVol(it.volume)} each</Badge>}
            {priceOf(id) != null && <Badge variant="outline"><Price n={priceOf(id)!} per="unit" /></Badge>}
            {runsAt.map((f) => <FacilityBadge key={f} id={f} />)}
          </div>
          </div>
        </div>
        {it.trait === undefined && <div className="flex gap-2 shrink-0">
          <Link to={`/industry/make?item=${id}`} className="no-underline rounded-xl ring-1 ring-foreground/20 px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors">How it's made</Link>
          {made.length > 0 && (
            <Link to={`/industry/plan?item=${id}`} className="no-underline rounded-xl bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-85 transition-opacity">Plan a build →</Link>
          )}
        </div>}
      </div>
      {it.description && <p className="text-sm text-muted-foreground font-sans max-w-2xl mb-6">{it.description}</p>}

      {it.trait !== undefined && <TraitSlot trait={it.trait} />}
      {!!it.traits?.length && (
        <Section title={`Can fill · ${it.traits.length}`}>
          <div className="flex flex-wrap gap-2">{it.traits.map((t) => <Link key={t} to={`/industry/item/${-t}`} className="no-underline"><Badge variant="outline" className="h-7 px-2 text-foreground hover:bg-muted">{traitOf(t)?.name}</Badge></Link>)}</div>
          <p className="text-xs text-muted-foreground font-sans mt-2">Schema slots that ask for these traits accept this item, as long as the stack's properties fall inside the trait's ranges.</p>
        </Section>
      )}
      {!!it.props?.length && <Properties props={it.props} />}

      {it.trait === undefined && <Section title={`Made by · ${made.length}`} aside={hidden(madeAll, made)}>
        {made.length ? <div className="grid gap-3 md:grid-cols-2">{made.map((r) => <RecipeCard key={r.id} recipe={r} highlight={id} />)}</div>
          : madeAll.length ? <Empty>Every recipe for this item runs on a facility that is not in game this cycle. Turn on "show not in game" to see them.</Empty>
          : <Empty>No schema produces this. It is gathered, mined, salvaged, or looted.</Empty>}
      </Section>}

      {conv.length > 0 && (
        <Section title="Breaks down into">
          <div className="grid gap-3 md:grid-cols-2">{conv.map((r) => (
            <Panel key={r.id} className="p-4">
              <div className="flex items-baseline justify-between gap-3 mb-2"><FacilityBadges recipe={r} /><span className="text-xs text-foreground/75 tabular-nums">{fmtTime(r.time)} / run</span></div>
              <div className="text-sm mb-2"><Qty n={r.inputs[0].qty} id={id} /> <span className="text-muted-foreground">{it.name} →</span></div>
              <IOList list={r.outputs} />
            </Panel>
          ))}</div>
        </Section>
      )}

      {consumedBy(id).length > 0 && (
        <Section title="Consumed by">
          <div className="flex flex-wrap gap-2">{consumedBy(id).map((c) => <Link key={c} to={`/industry/item/${c}`} className="no-underline"><Badge variant="outline" className="h-7 px-2 gap-1.5 text-foreground hover:bg-muted"><ItemIcon id={c} size={18} />{itemOf(c).name}</Badge></Link>)}</div>
          <p className="text-xs text-muted-foreground font-sans mt-2">Fitted or deployed things that burn this item to run.</p>
        </Section>
      )}

      <Section title={`Used in · ${uses.length}`} aside={hidden(usesAll, uses)}>
        {uses.length ? (
          <Panel className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground"><tr className="border-b border-foreground/10"><th className="text-left font-normal px-4 py-2">Product</th><th className="text-right font-normal px-4 py-2">Needs</th><th className="text-left font-normal px-4 py-2 hidden sm:table-cell">Facility</th><th className="text-right font-normal px-4 py-2">Time</th></tr></thead>
              <tbody className="divide-y divide-foreground/5">
                {uses.sort((a, b) => a.inputs.find((x) => x.id === id)!.qty - b.inputs.find((x) => x.id === id)!.qty).map((r) => (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td className="px-4 py-2"><ItemLink id={r.product} icon /> <span className="text-foreground/75">× {fmtQty(r.outputs.find((o) => o.id === r.product)?.qty ?? 1, r.product)}</span></td>
                    <td className="px-4 py-2 text-right"><Qty n={r.inputs.find((x) => x.id === id)!.qty} id={id} /></td>
                    <td className="px-4 py-2 hidden sm:table-cell"><FacilityBadges recipe={r} /></td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground/75">{fmtTime(r.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        ) : usesAll.length ? <Empty>Only consumed by recipes that are not in game this cycle.</Empty> : <Empty>Nothing consumes this item. It is an end product.</Empty>}
      </Section>
    </div>
  );
}

const fmtProp = (n: number) => (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString() : Number(n.toPrecision(3)).toLocaleString()).replace(/^-/, '−');
const fmtRange = (min?: number, max?: number) =>
  min !== undefined && max !== undefined ? (fmtProp(min) === fmtProp(max) ? fmtProp(min) : `${fmtProp(min)} to ${fmtProp(max)}`) : min !== undefined ? `≥ ${fmtProp(min)}` : max !== undefined ? `≤ ${fmtProp(max)}` : '–';

/** Property ranges across the variants the game can produce of this item. */
function Properties({ props }: { props: { id: number; min: number; max: number }[] }) {
  return (
    <Section title={`Properties · ${props.length}`}>
      <Panel className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-foreground/5">
            {props.map((p) => (
              <tr key={p.id}><td className="px-4 py-1.5">{propertyOf(p.id)?.name ?? `property ${p.id}`}</td><td className="px-4 py-1.5 text-right tabular-nums">{fmtRange(p.min, p.max)}</td></tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="text-xs text-muted-foreground font-sans mt-2">Each stack is one variant with its own values inside these ranges. Hover a stack in game to see its exact values.</p>
    </Section>
  );
}

/** A schema slot that takes any material with a trait: what the trait asks for, and what can fill it. */
function TraitSlot({ trait }: { trait: number }) {
  const t = traitOf(trait);
  if (!t) return null;
  return (
    <>
      <Section title="The trait asks for">
        <Panel className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-foreground/5">
              {t.needs.map((n) => <tr key={n.prop}><td className="px-4 py-1.5">{propertyOf(n.prop)?.name ?? `property ${n.prop}`}</td><td className="px-4 py-1.5 text-right tabular-nums">{fmtRange(n.min, n.max)}</td></tr>)}
            </tbody>
          </table>
        </Panel>
      </Section>
      <Section title={`Can be filled by · ${t.members.length}`}>
        <div className="flex flex-wrap gap-2">{t.members.map((m) => <Link key={m} to={`/industry/item/${m}`} className="no-underline"><Badge variant="outline" className="h-7 px-2 gap-1.5 text-foreground hover:bg-muted"><ItemIcon id={m} size={18} />{itemName(m)}</Badge></Link>)}</div>
        <p className="text-xs text-muted-foreground font-sans mt-2">Any of these can go in the slot if the stack's properties fall inside the ranges above. Some variants of a material qualify and others don't.</p>
      </Section>
    </>
  );
}
