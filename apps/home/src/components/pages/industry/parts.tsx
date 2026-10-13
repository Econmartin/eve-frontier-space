import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Factory, Rocket, Search, Ship, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { builtInSpace, FACILITY_KIND_LABEL, facilityKind, facilityName, fmtPrice, fmtTime, industryItems, itemAvailable, itemName, itemOf, recipeAvailable, searchItems, type Item, type Recipe, type RecipeIO } from '@/lib/industry';

/** Item picture from the client (64 px UI icon, or a 128 px render for ships and structures). */
export function ItemIcon({ id, size = 24, className }: { id: number; size?: number; className?: string }) {
  const src = itemOf(id).icon;
  if (!src) return <span className={cn('inline-block shrink-0 rounded-md bg-foreground/5', className)} style={{ width: size, height: size }} aria-hidden />;
  return <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" className={cn('inline-block shrink-0 object-contain', className)} style={{ width: size, height: size }} />;
}

export const ItemLink = ({ id, className, icon, iconSize = 20 }: { id: number; className?: string; icon?: boolean; iconSize?: number }) => (
  <Link to={`/industry/item/${id}`} className={cn('no-underline text-foreground hover:text-[var(--color-martian-500)] transition-colors', icon && 'inline-flex items-center gap-1.5 align-middle', className)}>
    {icon && <ItemIcon id={id} size={iconSize} />}
    {itemName(id)}
  </Link>
);

export const Price = ({ n, per }: { n: number; per?: string }) => <span className="tabular-nums text-[var(--color-ocean-500)] dark:text-[var(--color-ocean-300)]" title="NPC roaming-trade base price from the client; actual trades vary.">{fmtPrice(n)}{per ? <span className="opacity-70"> / {per}</span> : null}</span>;
export const Qty = ({ n }: { n: number }) => <span className="tabular-nums text-[var(--color-martian-500)] font-semibold">{n.toLocaleString()}</span>;

export function IOList({ list, className }: { list: RecipeIO[]; className?: string }) {
  return (
    <ul className={cn('flex flex-col gap-1', className)}>
      {list.map((x) => (
        <li key={x.id} className="flex items-center gap-2 text-sm">
          <ItemIcon id={x.id} size={22} />
          <Qty n={x.qty} />
          <ItemLink id={x.id} />
        </li>
      ))}
    </ul>
  );
}

// ---------- visibility of things that are not in game this cycle ----------
export interface Holding { id: number; qty: number }
export const IndustrySettingsContext = createContext<{ showUnavailable: boolean; setShowUnavailable: (v: boolean) => void }>({ showUnavailable: false, setShowUnavailable: () => {} });
export const useIndustrySettings = () => useContext(IndustrySettingsContext);
/** add quantities to a hold, merging with what is already there */
export const addToHold = (hs: Holding[], adds: Holding[]): Holding[] => {
  const m = new Map(hs.map((h) => [h.id, h.qty]));
  for (const a of adds) m.set(a.id, (m.get(a.id) ?? 0) + a.qty);
  return [...m.entries()].filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty }));
};
export const holdMap = (hs: Holding[]) => new Map(hs.map((h) => [h.id, h.qty]));

/** Filters recipes by the "show not in game" toggle. */
export function useVisible<T extends Recipe>(list: T[]): T[] {
  const { showUnavailable } = useIndustrySettings();
  return useMemo(() => (showUnavailable ? list : list.filter(recipeAvailable)), [list, showUnavailable]);
}

export const NotInGame = ({ className }: { className?: string }) => (
  <Badge variant="outline" className={cn('text-muted-foreground border-dashed', className)} title="Defined in the client, but you cannot build or use it in game this cycle.">not in game this cycle</Badge>
);

export function FacilityBadge({ id }: { id: number }) {
  const kind = facilityKind(id);
  const Icon = kind === 'deployable' ? Factory : kind === 'shipModule' ? Ship : null;
  return (
    <Badge variant="outline" title={FACILITY_KIND_LABEL[kind] || undefined}
      className={cn('gap-1', kind === 'unavailable' && 'line-through decoration-[var(--color-martian-500)] text-muted-foreground')}>
      {Icon && <Icon className="size-3 opacity-70" />}
      {facilityName(id)}
    </Badge>
  );
}

export function FacilityBadges({ recipe }: { recipe: Recipe }) {
  const seen = new Set<string>();
  const ids = recipe.facilities.map((f) => f.id).filter((id) => { const k = `${facilityName(id)}|${facilityKind(id)}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const available = recipeAvailable(recipe);
  return (
    <div className="flex flex-wrap gap-1">
      {builtInSpace(recipe) && <Badge className="gap-1 bg-[var(--color-ocean-500)]/15 text-[var(--color-ocean-700)] dark:text-[var(--color-ocean-300)]" title="Players build this directly in open space, no structure needed."><Rocket className="size-3" /> built in space</Badge>}
      {ids.length === 0 && !builtInSpace(recipe) && <Badge variant="outline" className="text-muted-foreground">no facility assigned</Badge>}
      {ids.map((id) => <FacilityBadge key={id} id={id} />)}
      {!available && <NotInGame />}
    </div>
  );
}

export const ItemAvailabilityBadge = ({ id }: { id: number }) => (itemAvailable(id) ? null : <NotInGame />);

export function RecipeCard({ recipe, highlight, compact }: { recipe: Recipe; highlight?: number; compact?: boolean }) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <ItemIcon id={recipe.product} size={40} className="rounded-lg" />
          <div className="min-w-0">
            <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">Blueprint {recipe.id}</div>
            <div className="font-heading text-lg leading-tight truncate">
              <ItemLink id={recipe.product} className={highlight === recipe.product ? 'text-[var(--color-martian-500)]' : ''} />
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">Run time</div>
          <div className="tabular-nums">{fmtTime(recipe.time)}</div>
        </div>
      </div>
      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
        <div>
          <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mb-1">Inputs</div>
          <IOList list={recipe.inputs} />
        </div>
        <div>
          <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mb-1">Outputs</div>
          <IOList list={recipe.outputs} />
        </div>
      </div>
      <FacilityBadges recipe={recipe} />
    </div>
  );
}

export function Section({ title, children, aside, className }: { title: ReactNode; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={cn('mb-8', className)}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-sm tracking-[0.16em] uppercase text-muted-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl ring-1 ring-dashed ring-foreground/15 p-6 text-sm text-muted-foreground font-sans">{children}</div>;
}

export function Panel({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return <div id={id} className={cn('rounded-2xl bg-card ring-1 ring-foreground/10 p-4 sm:p-5', className)}>{children}</div>;
}

/** Search box with a result dropdown. Items that are not in game are left out unless the toggle is on. */
export function ItemPicker({ onPick, placeholder = 'Search items…', pool, autoFocus, clearOnPick = true, value }: {
  onPick: (item: Item) => void; placeholder?: string; pool?: Item[]; autoFocus?: boolean; clearOnPick?: boolean; value?: string;
}) {
  const [q, setQ] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const { showUnavailable } = useIndustrySettings();
  const visiblePool = useMemo(() => { const base = pool ?? industryItems; return showUnavailable ? base : base.filter((i) => itemAvailable(i.id)); }, [pool, showUnavailable]);
  const results = useMemo(() => searchItems(q, visiblePool, 12), [q, visiblePool]);
  useEffect(() => { if (value !== undefined) setQ(value); }, [value]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc); return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const pick = (it: Item) => { onPick(it); setOpen(false); setQ(clearOnPick ? '' : it.name); };
  return (
    <div ref={box} className="relative">
      <div className="flex items-center gap-2 rounded-xl bg-background ring-1 ring-foreground/15 focus-within:ring-[var(--color-martian-500)] px-3 h-10">
        <Search className="size-4 text-muted-foreground shrink-0" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { setHi((h) => Math.min(h + 1, results.length - 1)); e.preventDefault(); }
            if (e.key === 'ArrowUp') { setHi((h) => Math.max(h - 1, 0)); e.preventDefault(); }
            if (e.key === 'Enter' && results[hi]) { pick(results[hi]); }
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
        {q && <button onClick={() => { setQ(''); setOpen(false); }} className="text-muted-foreground hover:text-foreground" aria-label="clear"><X className="size-4" /></button>}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full max-h-80 overflow-auto rounded-xl bg-popover text-popover-foreground ring-1 ring-foreground/10 shadow-xl py-1">
          {results.map((it, i) => (
            <li key={it.id}>
              <button
                onMouseEnter={() => setHi(i)}
                onClick={() => pick(it)}
                className={cn('w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-3', i === hi ? 'bg-muted' : '')}
              >
                <span className="flex items-center gap-2 min-w-0"><ItemIcon id={it.id} size={22} /><span className="truncate">{it.name}</span>{!itemAvailable(it.id) && <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground shrink-0">not in game</span>}</span>
                <span className="text-xs text-muted-foreground shrink-0">{it.group}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NumberField({ value, onChange, min = 1, className, ariaLabel }: { value: number; onChange: (n: number) => void; min?: number; className?: string; ariaLabel?: string }) {
  return (
    <input
      type="number" min={min} value={value} aria-label={ariaLabel}
      onChange={(e) => onChange(Math.max(min, Math.floor(Number(e.target.value) || min)))}
      className={cn('h-10 w-28 rounded-xl bg-background ring-1 ring-foreground/15 focus:ring-[var(--color-martian-500)] outline-none px-3 text-sm tabular-nums', className)}
    />
  );
}

export function Select({ value, onChange, options, className, ariaLabel }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string; ariaLabel?: string }) {
  return (
    <select value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)}
      className={cn('h-10 rounded-xl bg-background ring-1 ring-foreground/15 focus:ring-[var(--color-martian-500)] outline-none px-3 text-sm', className)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export const groupLabel = (id: number) => `${itemOf(id).group} · ${itemOf(id).category}`;

/** Row of clickable item chips used in empty states. */
export function SuggestionChips({ label, items, onPick }: { label: string; items: Item[]; onPick: (item: Item) => void }) {
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <button key={it.id} onClick={() => onPick(it)} className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-3 h-8 text-xs ring-1 ring-foreground/15 bg-card hover:bg-muted hover:ring-[var(--color-martian-500)] transition-colors">
            <ItemIcon id={it.id} size={22} />{it.name}
          </button>
        ))}
      </div>
    </div>
  );
}
