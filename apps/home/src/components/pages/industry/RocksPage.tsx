import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Combine, Copy, Download, FileWarning, Link2, Scissors, Share2, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { compositeRocks, composites, fmtTime, itemName, priceOf } from '@/lib/industry';
import { Empty, ItemIcon, Panel, Price, Qty, Section, useIndustrySettings } from './parts';
import { idOfName, isSalvage, longestPause, sessionFrom, toSessions, type Session } from './GamelogPanel';
import { checkDocument, splitDocuments, type CheckedTick, type LogDocument } from '@/lib/gamelogCheck';
import { AsteroidPreview, generateFor, seedFrom, slotOf } from './AsteroidPreview';
import { MATERIAL_COLOR } from '@/lib/asteroidGen';
import { blobToBase64, canvasToBlob, renderRockCard } from './shareCard';
import { cardTitle } from './RockSharePage';

const fmtDate = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
const ROCK_NAMES = compositeRocks.map((r) => r.name);
const PREFIXES = ['', 'hollow', 'shocked', 'deep', 'core', 'prime'];

interface Labelled extends Session { key: string; rock?: string; prefix: string; status?: 'sent' | 'error'; /** id of the share card uploaded for this rock, if any */ shareId?: string }
interface ShareState { url: string; png: Blob; jpg: Blob; busy?: boolean; copied?: 'image' | 'link'; error?: string }
const STORE = 'industry.myRocks';
const GAP_STORE = 'industry.rockGapMinutes';
const SENT_LOGS = 'industry.sentLogs';
const loadSent = (): string[] => { try { const v = JSON.parse(localStorage.getItem(SENT_LOGS) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const DEFAULT_GAP_MIN = 5;
/** rock cards per page; the timeline strip always shows every rock */
const PAGE_SIZE = 10;
/** Gaps at least this long get their length written on the timeline next to the merge button. */
const LONG_GAP_MS = 2 * 3600e3;
const loadGap = () => { try { const v = Number(localStorage.getItem(GAP_STORE)); return v > 0 ? v : DEFAULT_GAP_MIN; } catch { return DEFAULT_GAP_MIN; } };
const loadHistory = (): Labelled[] => {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || '[]');
    if (!Array.isArray(v)) return [];
    // Rocks remembered before salvage was filtered out: rebuild from their ticks, drop pure-salvage ones.
    return (v as Labelled[]).flatMap((r) => {
      if (r.log) {
        const log = r.log.filter((t) => !isSalvage(t.name));
        if (!log.length) return [];
        return log.length === r.log.length ? [r] : [{ ...r, ...sessionFrom(log), verified: r.verified }];
      }
      return r.materials.every((m) => isSalvage(m.name)) ? [] : [r];
    });
  } catch { return []; }
};
const saveHistory = (rows: Labelled[]) => { try { localStorage.setItem(STORE, JSON.stringify(rows.slice(0, 200))); } catch { /* private mode or full */ } };

/** Merge adjacent sessions into one (same rock mined with a pause). */
function mergeInto(list: Labelled[], i: number): Labelled[] {
  if (i <= 0) return list;
  const a = list[i - 1], b = list[i];
  const m = new Map<string, { n: number; id?: number }>();
  for (const x of [...a.materials, ...b.materials]) { const cur = m.get(x.name); m.set(x.name, { n: (cur?.n ?? 0) + x.n, id: x.id }); }
  const materials = [...m.entries()].map(([name, v]) => ({ name, n: v.n, id: v.id })).sort((x, y) => y.n - x.n);
  const log = a.log && b.log ? [...a.log, ...b.log].sort((x, y) => x.t - y.t) : undefined;
  const merged: Labelled = { ...a, rock: a.rock ?? b.rock, prefix: a.prefix || b.prefix, start: Math.min(a.start, b.start), end: Math.max(a.end, b.end), ticks: a.ticks + b.ticks, total: materials.reduce((s, x) => s + x.n, 0), materials, log, verified: !!(a.verified && b.verified), key: a.key + '+' + b.key, status: undefined };
  return [...list.slice(0, i - 1), merged, ...list.slice(i + 1)].sort((x, y) => y.start - x.start);
}

/** Split a session at its longest pause into two rocks; both keep the label so nothing has to be re-entered. */
function splitAt(list: Labelled[], i: number): Labelled[] {
  const r = list[i]; const cut = r.log && longestPause(r.log);
  if (!r.log || !cut) return list;
  const first = { ...sessionFrom(r.log.slice(0, cut.at)), key: r.key + 'a', rock: r.rock, prefix: r.prefix, status: undefined };
  const second = { ...sessionFrom(r.log.slice(cut.at)), key: r.key + 'b', rock: r.rock, prefix: r.prefix, status: undefined };
  return [...list.slice(0, i), first, second, ...list.slice(i + 1)].sort((a, b) => b.start - a.start);
}

const PX_PER_MIN = 3;
/** largest single voxel in a rock, 0 when the ticks are not known */
const peakOf = (r: Labelled) => (r.log ? r.log.reduce((m, t) => Math.max(m, t.n), 0) : 0);
const cssColor = (id?: number) => { const slot = id ? slotOf(id) : undefined; const c = slot ? (MATERIAL_COLOR as Record<string, number[]>)[slot] : undefined; return c ? `rgb(${c.map((v) => Math.round(v * 255)).join(' ')})` : 'rgb(120 120 120)'; };
const shortUnits = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
const fmtClock = (ms: number) => new Date(ms).toISOString().slice(11, 16);
const fmtDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Prev / numbered / next controls for the rock list. */
function Pager({ page, pageCount, total, onPage }: { page: number; pageCount: number; total: number; onPage: (n: number) => void }) {
  const btn = 'h-8 min-w-8 px-2 rounded-lg text-xs ring-1 ring-foreground/15 hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent transition-colors';
  // show every page up to 9, otherwise the ends plus a window around the current page
  const pages = pageCount <= 9 ? [...Array(pageCount).keys()] : [...new Set([0, 1, page - 1, page, page + 1, pageCount - 2, pageCount - 1].filter((n) => n >= 0 && n < pageCount))].sort((a, b) => a - b);
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-center gap-1.5" aria-label="rock pages">
      <button className={btn} disabled={page === 0} onClick={() => onPage(page - 1)}>‹ newer</button>
      {pages.map((n, k) => (
        <span key={n} className="contents">
          {k > 0 && n - pages[k - 1] > 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
          <button className={cn(btn, n === page && 'bg-[var(--color-martian-500)] text-black ring-transparent hover:bg-[var(--color-martian-500)]')} aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)}>{n + 1}</button>
        </span>
      ))}
      <button className={btn} disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}>older ›</button>
      <span className="ml-2 text-xs text-muted-foreground tabular-nums">{page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}</span>
    </nav>
  );
}

/** Every rock on one scrollable strip, oldest on the left; merge in the gaps, split inside a rock. */
function RockTimeline({ rows, onMerge, onSplit, onJump }: { rows: Labelled[]; onMerge: (i: number) => void; onSplit: (i: number) => void; onJump: (i: number) => void }) {
  const asc = [...rows].reverse();
  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex items-end min-w-max gap-0 pt-5">
        {asc.map((r, k) => {
          const i = rows.length - 1 - k; // index in the descending list
          const next = asc[k + 1];
          const durMin = Math.max(0, (r.end - r.start) / 60e3);
          const width = Math.max(44, Math.round(durMin * PX_PER_MIN));
          const longest = r.log && r.log.length > 1 ? longestPause(r.log) : null;
          const pause = longest && longest.seconds >= 30 ? longest : null;
          const pauseAt = pause && r.log ? (r.log[pause.at - 1].t - r.start) / Math.max(1, r.end - r.start) : 0;
          const gapMs = next ? next.start - r.end : 0;
          const gapW = next ? Math.min(110, Math.max(28, Math.round((gapMs / 60e3) * PX_PER_MIN))) : 0;
          const newDay = k === 0 || fmtDay(asc[k - 1].start) !== fmtDay(r.start);
          return (
            <div key={r.key} className="flex items-end">
              <div className="relative flex flex-col items-center" style={{ width }}>
                {newDay && <span className="absolute -top-5 left-0 text-[0.6rem] text-muted-foreground whitespace-nowrap">{fmtDay(r.start)}</span>}
                <span className="text-[0.65rem] tabular-nums leading-none mb-1">{shortUnits(r.total)}</span>
                <button onClick={() => onJump(rows.findIndex((x) => x.key === r.key))} title={`${r.rock ?? 'unlabelled'} · ${r.total.toLocaleString()} units · ${fmtTime((r.end - r.start) / 1000)}`}
                  className={cn('relative h-9 w-full overflow-hidden rounded-md ring-1 flex hover:ring-[var(--color-martian-500)] transition-shadow', r.status === 'sent' ? 'ring-emerald-500/60' : r.verified ? 'ring-foreground/25' : 'ring-amber-500/50')}>
                  {r.materials.map((m) => <span key={m.name} style={{ width: `${(100 * m.n) / r.total}%`, background: cssColor(m.id) }} className="h-full block" />)}
                  {pause && <span className="absolute inset-y-0 border-l border-dashed border-background/80" style={{ left: `${pauseAt * 100}%` }} />}
                </button>
                <span className="text-[0.6rem] text-muted-foreground tabular-nums leading-none mt-1 truncate max-w-full">{fmtClock(r.start)}{r.rock ? ` · ${r.rock}` : ''}</span>
                {pause && <button onClick={() => onSplit(i)} title={`Split at the ${fmtTime(pause.seconds)} pause`} className="absolute -top-0.5 size-5 -translate-x-1/2 rounded-full bg-background ring-1 ring-foreground/25 grid place-items-center hover:ring-[var(--color-martian-500)]" style={{ left: `${pauseAt * 100}%`, top: 18 }}><Scissors className="size-3" /></button>}
              </div>
              {next && (
                <div className="relative flex flex-col items-center justify-end" style={{ width: gapW, height: 60 }}>
                  <span className="absolute left-0 right-0 top-[29px] border-t border-dotted border-foreground/25" />
                  {gapMs >= LONG_GAP_MS && <span className="absolute top-0 left-0 right-0 text-center text-[0.6rem] text-muted-foreground">{gapMs >= 36e5 * 36 ? `${Math.round(gapMs / 864e5)}d` : fmtTime(gapMs / 1000).split(' ')[0]}</span>}
                  <button onClick={() => onMerge(i)} title={`Same rock? Merge across the ${fmtTime(gapMs / 1000)} gap`} className="relative z-10 size-5 rounded-full bg-background ring-1 ring-foreground/25 grid place-items-center hover:ring-[var(--color-martian-500)]" style={{ marginBottom: 8 }}><Combine className="size-3" /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RocksPage() {
  const { showUnavailable } = useIndustrySettings();
  void showUnavailable;
  const [files, setFiles] = useState<{ name: string; text: string }[]>([]);
  const [gapMin, setGapMin] = useState(loadGap);
  const gap = gapMin * 60;
  // rows = previously seen rocks (localStorage) plus whatever is pasted now; labels and submit state survive by start time
  const [rows, setRows] = useState<Labelled[]>(loadHistory);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pageCount - 1);
  const pageStart = cur * PAGE_SIZE;
  /** show the page holding rock `i`, then scroll its card into view once it is mounted */
  const jumpTo = (i: number) => { if (i < 0) return; setPage(Math.floor(i / PAGE_SIZE)); const key = rows[i]?.key; window.setTimeout(() => document.getElementById('rock-' + key)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); };
  const [drag, setDrag] = useState(false);
  const [shares, setShares] = useState<Record<string, ShareState>>({});
  const { docs, ticks, salvage } = useMemo(() => {
    const docs: (LogDocument & { name: string; duplicateOf?: string; /** clean regolith ticks: [unixSec, units, typeID] */ data?: [number, number, number][] })[] = []; const ticks: CheckedTick[] = [];
    // The same session dropped twice (a copy, or a renamed file) would double every rock, so only the first file per session start counts.
    const seen = new Map<number, string>(); let salvage = 0;
    for (const f of files) {
      splitDocuments(f.text).forEach((lines, k) => {
        const { doc, ticks: own } = checkDocument(lines, k + 1);
        const dup = doc.sessionStart !== undefined ? seen.get(doc.sessionStart) : undefined;
        if (dup) { docs.push({ ...doc, name: f.name, ok: false, duplicateOf: dup }); return; }
        if (doc.sessionStart !== undefined) seen.set(doc.sessionStart, f.name);
        const rockTicks = own.filter((t) => { if (isSalvage(t.name)) { salvage++; return false; } return true; });
        const data = doc.ok ? rockTicks.flatMap((t) => { const id = idOfName(t.name); return id ? [[Math.round(t.t / 1000), t.n, id] as [number, number, number]] : []; }) : undefined;
        docs.push({ ...doc, name: f.name, data }); ticks.push(...rockTicks);
      });
    }
    return { docs, ticks: ticks.sort((a, b) => a.t - b.t), salvage };
  }, [files]);
  useEffect(() => {
    if (!ticks.length) return;
    setPage(0);
    setRows((prev) => {
      const fresh = toSessions(ticks, gap).map((s) => { const old = prev.find((p) => p.start === s.start); return { ...s, key: String(s.start), rock: old?.rock, prefix: old?.prefix ?? '', status: old?.status === 'sent' ? 'sent' as const : undefined }; });
      const starts = new Set(fresh.map((f) => f.start));
      // keep history rows that are not covered by the new split (different log, or merged rows)
      const kept = prev.filter((p) => !starts.has(p.start) && !ticks.some((t) => t.t >= p.start && t.t <= p.end));
      return [...fresh, ...kept].sort((a, b) => b.start - a.start);
    });
  }, [ticks, gap]);
  useEffect(() => { saveHistory(rows); }, [rows]);
  // Every file that passed the checks shares its mining ticks once (time, units, material) for the community dataset.
  const [sentLogs, setSentLogs] = useState<string[]>(loadSent);
  useEffect(() => {
    for (const d of docs) {
      if (!d.ok || !d.data?.length || d.sessionStart === undefined) continue;
      const key = new Date(d.sessionStart).toISOString();
      if (sentLogs.includes(key)) continue;
      setSentLogs((l) => { const next = [...l, key].slice(-500); try { localStorage.setItem(SENT_LOGS, JSON.stringify(next)); } catch { /* ignore */ } return next; });
      void fetch('/api/mining-logs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cycle: composites.cycle, sessionStart: key, ticks: d.data }) }).catch(() => { /* best effort */ });
    }
  }, [docs, sentLogs]);
  useEffect(() => { try { localStorage.setItem(GAP_STORE, String(gapMin)); } catch { /* ignore */ } }, [gapMin]);
  const load = async (list: FileList | File[]) => {
    const arr = [...list].filter((f) => /\.txt$/i.test(f.name));
    const texts = await Promise.all(arr.map((f) => f.text()));
    setFiles((prev) => [...prev.filter((p) => !arr.some((f) => f.name === p.name)), ...arr.map((f, i) => ({ name: f.name, text: texts[i] }))]);
  };

  const submit = async (r: Labelled) => {
    if (!r.rock) return;
    if (!r.verified || !r.log) return;
    const idOf = new Map(r.materials.filter((m) => m.id).map((m) => [m.name, m.id!]));
    // Unknown names (not in the item catalog) are dropped from both totals and ticks so they still add up.
    const ticksList = r.log.filter((t) => idOf.has(t.name)).map((t) => [Math.round(t.t / 1000), t.n, idOf.get(t.name)!]);
    const body = { cycle: composites.cycle, rock: r.rock, prefix: r.prefix || undefined, sessions: [{ start: new Date(r.start).toISOString(), end: new Date(r.end).toISOString(), ticks: ticksList.length, materials: Object.fromEntries(r.materials.filter((m) => m.id).map((m) => [m.id, m.n])), ticksList }] };
    try {
      const res = await fetch('/api/mining-sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, status: res.ok ? 'sent' : 'error' } : x)));
    } catch { setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, status: 'error' } : x))); }
  };

  /** Draw the share picture for a rock (kept in memory until the page is left). */
  const makeCard = async (r: Labelled, cells: ReturnType<typeof generateFor>) => {
    if (shares[r.key]) { setShares((m) => ({ ...m, [r.key]: { ...m[r.key], copied: undefined, error: undefined } })); return; }
    try {
      const canvas = await renderRockCard({
        cells, title: cardTitle(r), stats: `${r.total.toLocaleString()} units · ${r.ticks.toLocaleString()} voxel${r.ticks === 1 ? '' : 's'}`,
        when: `${fmtDate(r.start).slice(0, 10)} · ${fmtTime((r.end - r.start) / 1000)} of mining${peakOf(r) ? ` · biggest voxel ${peakOf(r)} units` : ''}`,
        materials: r.materials.map((m) => ({ name: m.name, n: m.n, color: cssColor(m.id) })), total: r.total,
      });
      const [png, jpg] = await Promise.all([canvasToBlob(canvas, 'image/png'), canvasToBlob(canvas, 'image/jpeg', 0.86)]);
      setShares((m) => ({ ...m, [r.key]: { url: URL.createObjectURL(png), png, jpg } }));
    } catch (e) { setShares((m) => ({ ...m, [r.key]: { ...(m[r.key] ?? { url: '', png: new Blob(), jpg: new Blob() }), error: e instanceof Error ? e.message : 'could not draw the card' } })); }
  };
  const copyImage = async (r: Labelled) => {
    const sh = shares[r.key]; if (!sh) return;
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': sh.png })]); setShares((m) => ({ ...m, [r.key]: { ...m[r.key], copied: 'image' } })); }
    catch { setShares((m) => ({ ...m, [r.key]: { ...m[r.key], error: 'your browser blocked copying the image; download it instead' } })); }
  };
  const shareLinkOf = (id: string) => `${location.origin}/rocks/${id}`;
  const copyLink = async (r: Labelled) => {
    const sh = shares[r.key]; if (!sh) return;
    let id = r.shareId;
    if (!id) {
      setShares((m) => ({ ...m, [r.key]: { ...m[r.key], busy: true, error: undefined } }));
      try {
        const meta = { rock: r.rock && r.rock !== 'Unknown' ? r.rock : null, prefix: r.prefix || '', units: r.total, voxels: r.ticks, ticks: r.ticks, start: new Date(r.start).toISOString(), end: new Date(r.end).toISOString(), seed: seedFrom(r.start), peak: peakOf(r), materials: Object.fromEntries(r.materials.filter((m) => m.id).map((m) => [m.id, m.n])) };
        const res = await fetch('/api/rock-cards', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ meta, image: await blobToBase64(sh.jpg) }) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({})) as { error?: string }).error || 'could not save the card');
        id = (await res.json() as { id: string }).id;
        setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, shareId: id } : x)));
      } catch (e) { setShares((m) => ({ ...m, [r.key]: { ...m[r.key], busy: false, error: e instanceof Error ? e.message : 'could not save the card' } })); return; }
    }
    try { await navigator.clipboard.writeText(shareLinkOf(id)); } catch { /* shown below anyway */ }
    setShares((m) => ({ ...m, [r.key]: { ...m[r.key], busy: false, copied: 'link' } }));
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel className="flex flex-col gap-3">
        <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void load(e.dataTransfer.files); }}
          className={cn('flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center cursor-pointer transition-colors', drag ? 'border-[var(--color-martian-500)] bg-[var(--color-martian-500)]/10' : 'border-foreground/20 hover:bg-muted')}>
          <Upload className="size-6 text-muted-foreground" />
          <div className="text-sm font-semibold">Drop your game log files here, or click to choose</div>
          <div className="text-xs text-muted-foreground font-sans">Documents › Frontier › logs › Gamelogs › <span className="font-mono">2026….txt</span>. You can drop several at once; whole files only.</div>
          <input type="file" accept=".txt" multiple className="hidden" onChange={(e) => { if (e.target.files) void load(e.target.files); e.target.value = ''; }} />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{files.length} file{files.length === 1 ? '' : 's'} · {ticks.length} mining ticks → {rows.length} rock{rows.length === 1 ? '' : 's'}{salvage > 0 && <span className="opacity-70"> · {salvage} salvage tick{salvage === 1 ? '' : 's'} ignored</span>}</span>
          <span className="ml-auto flex items-center gap-2" title="Ticks closer together than this count as the same rock. You can still split or merge rocks below."><label htmlFor="rock-gap">same rock if mined within</label><input id="rock-gap" type="number" min={0.5} step={0.5} value={gapMin} onChange={(e) => setGapMin(Math.max(0.5, Number(e.target.value) || DEFAULT_GAP_MIN))} className="h-7 w-16 rounded-lg bg-background ring-1 ring-foreground/15 px-2 text-xs tabular-nums" /> min</span>
          {files.length > 0 && <button onClick={() => setFiles([])} className="inline-flex items-center gap-1 hover:text-destructive"><Trash2 className="size-3.5" /> clear files</button>}
          {rows.length > 0 && <button onClick={() => { if (confirm('Forget all rocks remembered in this browser?')) { setRows([]); setFiles([]); } }} className="inline-flex items-center gap-1 hover:text-destructive"><Trash2 className="size-3.5" /> forget history</button>}
        </div>
        {docs.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs">
            {docs.map((d) => (
              <li key={d.name + d.index} className={cn('flex flex-wrap items-start gap-x-2 gap-y-0.5 rounded-lg px-2.5 py-1.5 ring-1', d.ok ? 'ring-emerald-500/30 bg-emerald-500/5' : 'ring-amber-500/30 bg-amber-500/5')}>
                {d.ok ? <CheckCircle2 className="size-3.5 mt-0.5 text-emerald-500 shrink-0" /> : <FileWarning className="size-3.5 mt-0.5 text-amber-500 shrink-0" />}
                <span className="font-semibold">{d.name}{d.sessionStart ? ` · ${fmtDate(d.sessionStart)}` : ''}</span>
                <span className="text-muted-foreground tabular-nums">{d.lines} lines · {d.miningTicks} mining ticks</span>
                <span className={d.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{d.ok ? 'passes checks' : d.duplicateOf ? `same session as ${d.duplicateOf}, ignored` : d.complete ? 'fails checks, cannot be submitted' : 'not a game log file'}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground font-sans">Only the mining lines are read, in your browser, and your rocks are remembered in this browser so you can come back to them. When a file passes the checks, its mining ticks (time, units, material) are shared with the community dataset, and a rock you label and submit adds its name. No character names, nothing else from the log, ever leaves your machine.</p>
      </Panel>

      {!rows.length ? (
        <Empty>Every rock you mined shows up here as a voxel body built from the materials you pulled out of it, with the same generator the game uses. Tell us which rock it was and it joins the community catalog.</Empty>
      ) : (
        <Section title={<span id="rocks-top">Your rocks · {rows.length}</span>} aside={<span className="text-xs text-muted-foreground normal-case tracking-normal">{rows.filter((r) => r.status === 'sent').length} submitted · {rows.filter((r) => !r.rock).length} unlabelled{pageCount > 1 ? ` · page ${cur + 1} of ${pageCount}` : ''}</span>} className="mb-0">
          <Panel className="p-3 mb-3"><RockTimeline rows={rows} onMerge={(i) => setRows((rs) => mergeInto(rs, i))} onSplit={(i) => setRows((rs) => splitAt(rs, i))} onJump={jumpTo} /></Panel>
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.slice(pageStart, pageStart + PAGE_SIZE).map((r, j) => {
              const i = pageStart + j;
              const seed = seedFrom(r.start);
              const cells = generateFor(r.materials.filter((m) => m.id).map((m) => ({ id: m.id!, qty: m.n })), seed, r.prefix, r.ticks);
              const longest = r.log && r.log.length > 1 ? longestPause(r.log) : null;
              const pause = longest && longest.seconds >= 30 ? longest : null; // a split only makes sense across a real pause
              const peak = r.log ? r.log.reduce((m, t) => Math.max(m, t.n), 0) : 0; // largest single voxel
              const val = r.materials.reduce((s, m) => s + (m.id ? (priceOf(m.id) ?? 0) * m.n : 0), 0);
              return (
                <Panel key={r.key} id={'rock-' + r.key} className="p-4 grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="flex flex-col items-center gap-2">
                    <AsteroidPreview cells={cells} size={220} className="rounded-xl bg-black/40" />
                    <div className="text-[0.65rem] text-muted-foreground tabular-nums">{cells.length} voxel{cells.length === 1 ? '' : 's'}{peak ? ` · biggest ${peak} units` : ''}</div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <div className="text-xs text-muted-foreground tabular-nums">{fmtDate(r.start)} · {r.ticks} ticks · {fmtTime((r.end - r.start) / 1000)}</div>
                      <span className="flex items-center gap-2">
                      {i > 0 && <button onClick={() => setRows((rs) => mergeInto(rs, i))} className="inline-flex items-center gap-1 text-xs rounded-lg ring-1 ring-foreground/20 px-2 py-1 hover:bg-muted" title="This was the same rock as the one above"><Combine className="size-3.5" /> merge with previous</button>}
                      {pause && <button onClick={() => setRows((rs) => splitAt(rs, i))} className="inline-flex items-center gap-1 text-xs rounded-lg ring-1 ring-foreground/20 px-2 py-1 hover:bg-muted" title={`Two rocks? Split at the longest pause, ${fmtTime(pause.seconds)} in`}><Scissors className="size-3.5" /> split at {fmtTime(pause.seconds)} pause</button>}
                      <button onClick={() => void makeCard(r, cells)} className="inline-flex items-center gap-1 text-xs rounded-lg ring-1 ring-foreground/20 px-2 py-1 hover:bg-muted" title="Make a picture of this rock to share"><Share2 className="size-3.5" /> share</button>
                      <button onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="text-muted-foreground hover:text-destructive" aria-label="forget this rock"><Trash2 className="size-3.5" /></button>
                      </span>
                    </div>
                    <div className="font-heading text-lg leading-tight">{r.total.toLocaleString()} units{val > 0 && <span className="text-sm font-normal"> · <Price n={val} /></span>}</div>
                    <ul className="flex flex-col gap-1">
                      {r.materials.map((m) => (
                        <li key={m.name} className="text-sm">
                          <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 min-w-0">{m.id ? <ItemIcon id={m.id} size={18} /> : <span className="inline-block size-[18px]" />}<span className="truncate">{m.name}</span></span><span className="tabular-nums shrink-0"><Qty n={m.n} /> <span className="text-foreground/75">· {Math.round((100 * m.n) / r.total)}%</span></span></div>
                          <div className="h-1 rounded-full bg-foreground/10 mt-0.5"><div className="h-1 rounded-full bg-[var(--color-martian-500)]" style={{ width: `${(100 * m.n) / r.total}%` }} /></div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-foreground/10">
                      <select value={r.rock ?? ''} onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, rock: e.target.value || undefined, status: undefined } : x)))} aria-label="rock name" className="h-9 rounded-xl bg-background ring-1 ring-foreground/15 px-3 text-sm">
                        <option value="">Which rock was it?</option>
                        {ROCK_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                        <option value="Unknown">Not sure</option>
                      </select>
                      <select value={r.prefix} onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, prefix: e.target.value } : x)))} aria-label="prefix" className="h-9 rounded-xl bg-background ring-1 ring-foreground/15 px-3 text-sm">
                        {PREFIXES.map((p) => <option key={p} value={p}>{p ? p : 'no prefix'}</option>)}
                      </select>
                      <button disabled={!r.rock || !r.verified || r.status === 'sent'} onClick={() => void submit(r)} className="h-9 rounded-xl bg-foreground text-background px-4 text-sm font-semibold hover:opacity-85 disabled:opacity-40 transition-opacity">
                        {r.status === 'sent' ? 'Thanks, saved' : 'Submit to catalog'}
                      </button>
                      {r.status === 'error' && <Badge variant="destructive">could not save, try again later</Badge>}
                      {!r.verified && r.status !== 'sent' && <span className="text-xs text-muted-foreground" title="Only rocks read from a complete log file that passed the checks can join the catalog">from a fragment or an unchecked log, so it stays local</span>}
                    </div>
                    {shares[r.key] && (
                      <div className="flex flex-col gap-2 pt-2 border-t border-foreground/10">
                        {shares[r.key].url && <img src={shares[r.key].url} alt={`share card for ${cardTitle(r)}`} className="w-full max-w-[420px] rounded-lg ring-1 ring-foreground/15" />}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <button onClick={() => void copyImage(r)} disabled={!shares[r.key].url} className="inline-flex items-center gap-1 rounded-lg ring-1 ring-foreground/20 px-2 py-1 hover:bg-muted disabled:opacity-40"><Copy className="size-3.5" /> {shares[r.key].copied === 'image' ? 'copied, paste it in Discord' : 'copy image'}</button>
                          {shares[r.key].url && <a href={shares[r.key].url} download={`rock-${(r.rock || 'unlabelled').toLowerCase()}-${fmtDate(r.start).slice(0, 10)}.png`} className="inline-flex items-center gap-1 rounded-lg ring-1 ring-foreground/20 px-2 py-1 hover:bg-muted no-underline"><Download className="size-3.5" /> download</a>}
                          <button onClick={() => void copyLink(r)} disabled={!shares[r.key].url || shares[r.key].busy} className="inline-flex items-center gap-1 rounded-lg ring-1 ring-foreground/20 px-2 py-1 hover:bg-muted disabled:opacity-40" title="Upload the card and get a link that unfurls with the picture"><Link2 className="size-3.5" /> {shares[r.key].busy ? 'saving…' : shares[r.key].copied === 'link' ? 'link copied' : r.shareId ? 'copy link' : 'copy link (uploads the card)'}</button>
                          {r.shareId && <a href={shareLinkOf(r.shareId)} className="text-muted-foreground truncate max-w-[260px]">{shareLinkOf(r.shareId).replace(/^https?:\/\//, '')}</a>}
                          {shares[r.key].error && <Badge variant="destructive">{shares[r.key].error}</Badge>}
                        </div>
                      </div>
                    )}
                  </div>
                </Panel>
              );
            })}
          </div>
          {pageCount > 1 && <Pager page={cur} pageCount={pageCount} total={rows.length} onPage={(n) => { setPage(n); document.getElementById('rocks-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />}
          <p className="text-xs text-muted-foreground font-sans mt-3">Bodies are generated with the game's own voxel rules from what you mined: every rock you picked up after a voxel popped is one voxel, coloured by the shares you pulled out. A partial clear shows as a smaller rock. The look is representative, not the exact rock. Pick a prefix if the name in game had one, such as Hollow Mire.</p>
        </Section>
      )}
    </div>
  );
}
