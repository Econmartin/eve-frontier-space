import { useMemo, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fmtTime, industryItems } from '@/lib/industry';
import { Empty, ItemIcon, Panel, Qty } from './parts';

/** One tick in a game log: "[ 2026.10.12 15:21:37 ] (mining) … You mined …>27<… units of …size=12>Crustal Anorthosite Crystals<" */
const LINE = /^﻿?\[ (\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2}):(\d{2}) \] \(mining\) .*?You mined .*?>(\d[\d,]*)<.*? units of .*?size=12>([^<]+)</;
export interface Tick { t: number; n: number; name: string; /** 1 when the source log passed the file checks */ v?: 1 }
/** `log` keeps the ticks so a session can be split again later. */
export interface Session { start: number; end: number; ticks: number; total: number; materials: { name: string; n: number; id?: number }[]; log?: Tick[]; /** every tick came from a complete log that passed checks */ verified?: boolean }

const byName = new Map(industryItems.map((i) => [i.name.toLowerCase(), i.id]));
const regolithNames = new Set(industryItems.filter((i) => i.regolith).map((i) => i.name.toLowerCase()));
/** The mining channel also logs salvaging (Debris and the like); only regolith comes out of a rock. Unknown names are kept. */
export const isSalvage = (name: string) => { const k = name.toLowerCase(); return byName.has(k) && !regolithNames.has(k); };

export function parseGamelog(text: string): Tick[] {
  const out: Tick[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = LINE.exec(line);
    if (!m) continue;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    out.push({ t, n: Number(m[7].replace(/,/g, '')), name: m[8].trim() });
  }
  return out.sort((a, b) => a.t - b.t);
}
export function toSessions(ticks: Tick[], gapSeconds: number): Session[] {
  const groups: Tick[][] = [];
  for (const t of ticks) { const cur = groups[groups.length - 1]; if (cur && t.t - cur[cur.length - 1].t <= gapSeconds * 1000) cur.push(t); else groups.push([t]); }
  return groups.map(sessionFrom);
}
export function sessionFrom(g: Tick[]): Session {
  const m = new Map<string, number>(); for (const t of g) m.set(t.name, (m.get(t.name) ?? 0) + t.n);
  const materials = [...m.entries()].map(([name, n]) => ({ name, n, id: byName.get(name.toLowerCase()) })).sort((a, b) => b.n - a.n);
  return { start: g[0].t, end: g[g.length - 1].t, ticks: g.length, total: materials.reduce((s, x) => s + x.n, 0), materials, log: g, verified: g.every((t) => t.v === 1) };
}
/** Longest pause inside a session: index of the tick after the pause, and its length in seconds. */
export function longestPause(log: Tick[]): { at: number; seconds: number } | null {
  let at = 0, best = 0;
  for (let i = 1; i < log.length; i++) { const d = log[i].t - log[i - 1].t; if (d > best) { best = d; at = i; } }
  return at ? { at, seconds: best / 1000 } : null;
}
const fmtDate = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');

/** Drop a game log, see what you mined per rock. Everything happens in the browser; nothing is uploaded. */
export function GamelogPanel({ onPickMaterial }: { onPickMaterial?: (id: number) => void }) {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [gap, setGap] = useState(180);
  const [drag, setDrag] = useState(false);
  const sessions = useMemo(() => toSessions(ticks, gap).reverse(), [ticks, gap]);
  const load = async (list: FileList | File[]) => {
    const arr = [...list].filter((f) => /\.txt$/i.test(f.name));
    const texts = await Promise.all(arr.map((f) => f.text()));
    setTicks((prev) => [...prev, ...texts.flatMap(parseGamelog)].sort((a, b) => a.t - b.t));
    setFiles((prev) => [...prev, ...arr.map((f) => f.name)]);
  };
  const copyEntry = (s: Session) => {
    const yields: Record<string, number> = {}; for (const m of s.materials) if (m.id) yields[m.id] = m.n;
    navigator.clipboard?.writeText(JSON.stringify({ name: 'ROCK NAME', note: `Logged ${fmtDate(s.start)}, ${s.ticks} ticks.`, yields }, null, 1));
  };
  return (
    <div className="flex flex-col gap-3">
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void load(e.dataTransfer.files); }}
        className={cn('flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-6 text-center cursor-pointer transition-colors', drag ? 'border-[var(--color-martian-500)] bg-[var(--color-martian-500)]/10' : 'border-foreground/20 hover:bg-muted')}>
        <Upload className="size-5 text-muted-foreground" />
        <div className="text-sm">Drop game log files here, or click to choose</div>
        <div className="text-xs text-muted-foreground font-sans">Documents › Frontier › logs › Gamelogs. Read in your browser only; nothing is uploaded.</div>
        <input type="file" accept=".txt" multiple className="hidden" onChange={(e) => e.target.files && void load(e.target.files)} />
      </label>
      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <FileText className="size-3.5" /> {files.length} file{files.length === 1 ? '' : 's'} · {ticks.length} mining ticks
          <span className="ml-auto flex items-center gap-2">new rock after <input type="number" min={30} step={30} value={gap} onChange={(e) => setGap(Math.max(30, Number(e.target.value) || 180))} className="h-7 w-20 rounded-lg bg-background ring-1 ring-foreground/15 px-2 text-xs tabular-nums" aria-label="session gap in seconds" /> s of silence</span>
        </div>
      )}
      {files.length > 0 && !sessions.length && <Empty>No mining lines in those files. The client only logs ticks from the "mining" channel.</Empty>}
      {sessions.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => (
            <Panel key={s.start} className="p-4 flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-xs text-muted-foreground tabular-nums">{fmtDate(s.start)}</div>
                <div className="text-xs text-foreground/75 tabular-nums">{s.ticks} ticks · {fmtTime((s.end - s.start) / 1000)}</div>
              </div>
              <div className="font-heading text-lg leading-tight">{s.materials.length === 1 ? s.materials[0].name : `${s.materials.length} materials`} <span className="text-sm text-foreground/75 tabular-nums">· {s.total.toLocaleString()} units</span></div>
              <ul className="flex flex-col gap-1.5">
                {s.materials.map((m) => (
                  <li key={m.name} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => m.id && onPickMaterial?.(m.id)} className="inline-flex items-center gap-1.5 text-left hover:text-[var(--color-martian-500)] min-w-0">{m.id ? <ItemIcon id={m.id} size={20} /> : <span className="inline-block size-5" />}<span className="truncate">{m.name}</span></button>
                      <span className="tabular-nums shrink-0"><Qty n={m.n} /> <span className="text-foreground/75">· {Math.round((100 * m.n) / s.total)}%</span></span>
                    </div>
                    <div className="h-1 rounded-full bg-foreground/10 mt-1"><div className="h-1 rounded-full bg-[var(--color-martian-500)]" style={{ width: `${(100 * m.n) / s.total}%` }} /></div>
                  </li>
                ))}
              </ul>
              {s.materials.length > 1 && <button onClick={() => copyEntry(s)} className="self-start mt-1 text-xs rounded-lg ring-1 ring-foreground/20 px-2.5 py-1 hover:bg-muted">Copy as composite entry</button>}
            </Panel>
          ))}
        </div>
      )}
      {!files.length && <p className="text-xs text-muted-foreground font-sans flex items-center gap-2"><Badge variant="outline">tip</Badge> Ticks from one rock come in a burst, so each card is one asteroid. A card with several materials is a composite; copy it and send it in with the rock's name.</p>}
    </div>
  );
}
