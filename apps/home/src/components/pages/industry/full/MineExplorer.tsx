import { useEffect, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { cn } from '@/lib/utils';
import { asteroidKinds, itemName, minedNow, regoliths, type Recipe } from '@/lib/industry';
import { ItemIcon, Panel } from '../parts';

const short = (name: string) => name.replace(/\s*\(.*\)$/, '');
const fmtKg = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(kg >= 10000 ? 0 : 1)}k` : `${Math.round(kg)}`);

/**
 * Which regolith to mine for a material: pick it on the wheel, see every regolith in game as a bar (kg of it one unit
 * refines into), and the rocks to look for, ranked by what they hold of those regoliths.
 */
export function MineExplorer({ conv, onRegolith, onRock }: { conv: (id: number) => Recipe[]; onRegolith: (id: number) => void; onRock: (name: string) => void }) {
  const [params, setParams] = useSearchParams();
  const setMat = (id: number) => setParams((p) => { p.set('mat', String(id)); return p; }, { replace: true });

  // every regolith an asteroid holds today, always in the same order so each material has a recognisable shape
  const regs = regoliths.filter((r) => minedNow.has(r.id)).sort((a, b) => a.name.localeCompare(b.name));
  // per regolith: kg of each material from one unit, and that material's share of everything the refine gives
  const yieldOf = new Map(regs.map((r) => {
    const c = conv(r.id)[0]; const per = c?.inputs[0].qty || 1; const total = (c?.outputs ?? []).reduce((a, o) => a + o.qty, 0) || 1;
    return [r.id, new Map((c?.outputs ?? []).map((o) => [o.id, { kg: o.qty / per, share: o.qty / total }]))] as const;
  }));
  const materials = [...new Set([...yieldOf.values()].flatMap((m) => [...m.keys()]))]
    .map((id) => ({ id, sources: regs.filter((r) => yieldOf.get(r.id)?.has(id)).length }))
    .sort((a, b) => itemName(a.id).localeCompare(itemName(b.id)));
  const mostSourced = [...materials].sort((a, b) => b.sources - a.sources)[0]?.id;
  const mat = materials.find((m) => m.id === Number(params.get('mat')))?.id ?? mostSourced;
  if (!regs.length || mat === undefined) return null;

  const kgOf = (r: number) => yieldOf.get(r)?.get(mat)?.kg ?? 0;
  // rocks ranked by how much they hold of each regolith that gives it, times its share of that refine
  const rockScores = asteroidKinds.map((k) => ({ k, s: k.holds.reduce((a, [r, ab]) => a + ab * (yieldOf.get(r)?.get(mat)?.share ?? 0), 0) }))
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const sources = materials.find((m) => m.id === mat)?.sources ?? 0;

  return (
    <Panel className="p-4 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[190px_minmax(0,1fr)_230px] items-start">
        <Wheel items={materials.map((m) => m.id)} selected={mat} onPick={setMat}
          render={(id) => <><ItemIcon id={id} size={24} /><span className="min-w-0"><span className="block truncate">{itemName(id)}</span><span className="block text-[0.6rem] uppercase tracking-wider text-muted-foreground">{materials.find((m) => m.id === id)?.sources} regolith{materials.find((m) => m.id === id)?.sources === 1 ? '' : 's'}</span></span></>} />

        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <ItemIcon id={mat} size={40} className="rounded-lg" />
            <div className="min-w-0">
              <div className="text-xs tracking-[0.16em] uppercase text-muted-foreground">kg per regolith unit · from {sources} regolith{sources === 1 ? '' : 's'}</div>
              <h3 className="font-heading text-2xl leading-none truncate">{itemName(mat)}</h3>
            </div>
          </div>
          <Bars regs={regs.map((r) => r.id)} onPick={onRegolith} value={kgOf} max={Math.max(...regs.map((r) => kgOf(r.id)), 1)} label={fmtKg}
            title={(r, v) => `${itemName(r)}: ${v ? `${Math.round(v).toLocaleString()} kg of ${itemName(mat)} per unit` : 'none'}`} />
          <p className="mt-2 text-xs text-muted-foreground font-sans">Every regolith you can mine now, along the bottom. Click a bar for its full refine.</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">Rocks to look for</div>
          {rockScores.slice(0, 8).map(({ k, s }, i) => (
            <SideRow key={k.kind} onClick={() => onRock(k.name)} width={s / rockScores[0].s}
              left={<><span className="text-muted-foreground tabular-nums w-4">{i + 1}</span><img src={k.icon} alt="" width={20} height={20} className="size-5 object-contain" /><span className="truncate">{short(k.name)}</span><span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">{k.kind}</span></>} />
          ))}
          <p className="text-[0.7rem] text-muted-foreground font-sans">Ranked by how much of each of those regoliths a rock holds (the game's Mined From table) and how much of this material it refines into. A ranking, not a yield: one rock's mix depends on its layers.</p>
        </div>
      </div>
    </Panel>
  );
}

function SideRow({ left, right, width, onClick }: { left: ReactNode; right?: string; width: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left text-sm flex flex-col gap-1 rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-foreground/5 transition-colors">
      <span className="flex items-center gap-2 min-w-0">{left}{right && <span className="ml-auto text-xs text-muted-foreground tabular-nums">{right}</span>}</span>
      <span className="h-1 rounded-full bg-foreground/10"><span className="block h-1 rounded-full bg-[var(--color-martian-500)]" style={{ width: `${Math.max(3, 100 * width)}%` }} /></span>
    </button>
  );
}

/** every regolith as a column; ones that do not apply stay as a faint stub so the shape stays comparable */
function Bars({ regs, value, max, label, title, onPick }: {
  regs: number[]; value: (r: number) => number; max: number; label: (v: number) => string; title: (r: number, v: number) => string; onPick: (r: number) => void;
}) {
  return (
    <div className="overflow-x-auto [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,currentColor_20%,transparent)_transparent] -mx-1 px-1">
      <div className="min-w-[540px] flex items-end gap-1">
        {regs.map((r) => {
          const v = value(r); const on = v > 0;
          return (
            <button key={r} onClick={() => onPick(r)} title={title(r, v)} className="group flex-1 min-w-0 flex flex-col items-center gap-1">
              <span className={cn('text-[0.6rem] tabular-nums h-3', on ? 'text-foreground' : 'text-transparent')}>{on ? label(v) : '·'}</span>
              <span className="h-44 w-full flex items-end">
                <span className={cn('w-full rounded-t-md transition-[height] duration-300', on ? 'bg-[var(--color-martian-500)] group-hover:brightness-110' : 'bg-foreground/10')}
                  style={{ height: on ? `${Math.max(3, (100 * v) / max)}%` : '3%' }} />
              </span>
              <span className={cn('transition-opacity', on ? '' : 'opacity-30')}><ItemIcon id={r} size={20} /></span>
              <span className={cn('h-20 text-[0.65rem] leading-none [writing-mode:vertical-rl] rotate-180 whitespace-nowrap', on ? 'text-foreground' : 'text-muted-foreground/50')}>{itemName(r)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A scroll wheel: the item in the middle band is the one picked, as on a phone's picker. Vertical beside the chart on
 * wide screens, a sideways strip on phones. Clicking an item picks it too.
 */
function Wheel<T>({ items, selected, onPick, render }: { items: T[]; selected: T | undefined; onPick: (t: T) => void; render: (t: T, on: boolean) => ReactNode }) {
  const list = useRef<HTMLUListElement>(null); const settle = useRef<number>(undefined); const steering = useRef(false);
  const vertical = () => { const el = list.current; return !!el && el.scrollHeight > el.clientHeight + 1; };
  // bring the picked item to the middle band when it changes from outside (a link, the other mode, a side row)
  useEffect(() => {
    const el = list.current; const i = items.indexOf(selected as T); const li = el?.children[i] as HTMLElement | undefined;
    if (!el || !li) return;
    steering.current = true;
    if (vertical()) el.scrollTop = li.offsetTop - (el.clientHeight - li.offsetHeight) / 2;
    else el.scrollLeft = li.offsetLeft - (el.clientWidth - li.offsetWidth) / 2;
    window.setTimeout(() => { steering.current = false; }, 60);
  }, [selected, items]);
  const onScroll = () => {
    if (steering.current) return;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = list.current; if (!el) return;
      const v = vertical(); const mid = v ? el.scrollTop + el.clientHeight / 2 : el.scrollLeft + el.clientWidth / 2;
      let best = -1, bd = Infinity;
      [...el.children].forEach((c, i) => { const h = c as HTMLElement; const d = Math.abs((v ? h.offsetTop + h.offsetHeight / 2 : h.offsetLeft + h.offsetWidth / 2) - mid); if (d < bd) { bd = d; best = i; } });
      if (best >= 0 && items[best] !== selected) onPick(items[best]);
    }, 120);
  };
  return (
    <div className="relative min-w-0">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-14 rounded-xl ring-1 ring-foreground/15 bg-foreground/[0.03] hidden lg:block" />
      <ul ref={list} onScroll={onScroll} aria-label="picker"
        className="relative flex gap-1 overflow-auto [scrollbar-width:none] snap-mandatory snap-x px-[35%] lg:px-0 lg:flex-col lg:snap-y lg:h-[400px] lg:py-[172px] [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] lg:[mask-image:linear-gradient(to_bottom,transparent,black_28%,black_72%,transparent)]">
        {items.map((t, i) => {
          const on = t === selected;
          return (
            <li key={i} className="snap-center shrink-0">
              <button onClick={() => onPick(t)} aria-pressed={on}
                className={cn('w-full h-14 flex items-center gap-2.5 px-3 rounded-xl text-left transition-all', on ? 'text-foreground font-semibold text-[0.95rem]' : 'text-muted-foreground text-sm hover:text-foreground', !on && 'lg:scale-95')}>
                {render(t, on)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
