import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AppHeader } from '@eve-frontier-space/ui';
import { PageWrapper } from '@/components/templates/index.ts';
import { HeaderActions, Footer } from '@/components/organisms/index.ts';
import { fmtTime, itemName, priceOf } from '@/lib/industry';
import { Empty, ItemIcon, Panel, Price, Qty } from './parts';
import { AsteroidPreview, generateFor } from './AsteroidPreview';

interface Card { id: string; rock: string | null; prefix: string; units: number; voxels: number; ticks: number; start: string; end: string; seed: number; peak?: number; materials: Record<string, number> }
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const cardTitle = (c: { rock?: string | null; prefix?: string }) => `${c.prefix ? cap(c.prefix) + ' ' : ''}${c.rock || 'Unlabelled rock'}`;

/** A rock someone shared: rebuilt live from the numbers behind the card. */
export function RockSharePage() {
  const { id = '' } = useParams();
  const [card, setCard] = useState<Card | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetch(`/api/rock-cards/${encodeURIComponent(id)}`).then((r) => (r.ok ? r.json() : null)).then((c) => alive && setCard(c)).catch(() => alive && setCard(null));
    return () => { alive = false; };
  }, [id]);
  const materials = useMemo(() => (card ? Object.entries(card.materials).map(([k, n]) => ({ id: Number(k), n })).sort((a, b) => b.n - a.n) : []), [card]);
  const cells = useMemo(() => (card ? generateFor(materials.map((m) => ({ id: m.id, qty: m.n })), card.seed, card.prefix, card.voxels) : []), [card, materials]);
  const total = materials.reduce((s, m) => s + m.n, 0);
  const value = materials.reduce((s, m) => s + (priceOf(m.id) ?? 0) * m.n, 0);
  useEffect(() => { if (card) { const prev = document.title; document.title = `${cardTitle(card)} · ${card.units.toLocaleString()} units | EVE Frontier Community`; return () => { document.title = prev; }; } }, [card]);

  return (
    <PageWrapper>
      <AppHeader right={<HeaderActions />} />
      <main className="px-4 sm:px-6 lg:px-8 pb-10">
        <div className="mx-auto max-w-4xl pt-8 flex flex-col gap-4">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">My rocks · shared</div>
          {card === undefined && <Empty>Loading…</Empty>}
          {card === null && <Empty>That rock is not here any more. <Link to="/industry/rocks" className="underline">Visualise your own</Link>.</Empty>}
          {card && (
            <Panel className="p-5 grid gap-6 sm:grid-cols-[320px_minmax(0,1fr)] items-start">
              <div className="flex flex-col items-center gap-2">
                <AsteroidPreview cells={cells} size={320} className="rounded-2xl bg-black/40" />
                <div className="text-[0.7rem] text-muted-foreground tabular-nums">{cells.length} voxel{cells.length === 1 ? '' : 's'}{card.peak ? ` · biggest ${card.peak} units` : ''}</div>
              </div>
              <div className="flex flex-col gap-3 min-w-0">
                <h1 className="font-heading text-3xl leading-tight">{cardTitle(card)}</h1>
                <div className="font-heading text-xl">{card.units.toLocaleString()} units{value > 0 && <span className="text-base font-normal"> · <Price n={value} /></span>}</div>
                <div className="text-sm text-muted-foreground tabular-nums">{card.start.slice(0, 10)} · {card.ticks} ticks · {fmtTime((Date.parse(card.end) - Date.parse(card.start)) / 1000)} of mining</div>
                <ul className="flex flex-col gap-1.5">
                  {materials.map((m) => (
                    <li key={m.id} className="text-sm">
                      <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 min-w-0"><ItemIcon id={m.id} size={18} /><span className="truncate">{itemName(m.id)}</span></span><span className="tabular-nums shrink-0"><Qty n={m.n} /> <span className="text-foreground/75">· {Math.round((100 * m.n) / Math.max(1, total))}%</span></span></div>
                      <div className="h-1 rounded-full bg-foreground/10 mt-0.5"><div className="h-1 rounded-full bg-[var(--color-martian-500)]" style={{ width: `${(100 * m.n) / Math.max(1, total)}%` }} /></div>
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-foreground/10 text-sm">
                  <Link to="/industry/rocks" className="inline-flex h-9 items-center rounded-xl bg-foreground text-background px-4 font-semibold hover:opacity-85 transition-opacity no-underline">Visualise your own rocks →</Link>
                  <p className="text-xs text-muted-foreground font-sans mt-2">Drop your game log and every asteroid you mined becomes a voxel body built with the game's own generator.</p>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </main>
      <Footer />
    </PageWrapper>
  );
}
