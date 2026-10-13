/**
 * Structural and plausibility checks for EVE Frontier game log files.
 *
 * A complete file looks like:
 *   ------------------------------------------------------------
 *     b'Gamelog'
 *     Listener: <character>            (optional; never read or stored)
 *     Session Started: 2026.10.04 09:07:34
 *   ------------------------------------------------------------
 *   [ 2026.10.04 09:17:06 ] (mining) <color=…>You mined …
 *   [ 2026.10.04 09:17:12 ] (notify) Too far away. …
 *   [ 2026.10.04 09:52:21 ] (notify) Unable to deposit items
 *
 *   Module is offline                  (a message may continue on unstamped lines)
 *
 * These checks cannot prove a log is genuine, but they catch pasted fragments, hand-edited
 * numbers, and reordered lines. The worker repeats the tick-level checks on submission.
 */

export interface LogIssue { level: 'error' | 'warn'; line?: number; msg: string }
export interface LogDocument {
  /** position in the pasted text, 1-based */
  index: number;
  /** has the dashed Gamelog header with a session start */
  complete: boolean;
  sessionStart?: number;
  lines: number;
  miningTicks: number;
  issues: LogIssue[];
  /** complete and no errors: ticks from this document may be submitted */
  ok: boolean;
}
export interface CheckedTick { t: number; n: number; name: string; /** 1 when the source document passed checks */ v?: 1 }

const STAMP = /^﻿?\[ (\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2}):(\d{2}) \] \(([a-z]+)\) ?(.*)$/;
const MINING = /^.*?You mined .*?>(\d[\d,]*)<.*? units of .*?size=12>([^<]+)</;
const HEADER_START = /^-{10,}\s*$/;
const HEADER_TAG = /^\s*b'Gamelog'\s*$/;
const SESSION_STARTED = /^\s*Session Started: (\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2}):(\d{2})\s*$/;
/** Largest single tick we accept; the biggest seen in the wild is well under 100. */
export const MAX_TICK_UNITS = 10000;

const stampMs = (m: RegExpMatchArray, o = 1) => Date.UTC(+m[o], +m[o + 1] - 1, +m[o + 2], +m[o + 3], +m[o + 4], +m[o + 5]);

/** Split pasted text into documents at each Gamelog header. Text before the first header is a fragment. */
export function splitDocuments(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  const docs: string[][] = [];
  let cur: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (HEADER_START.test(lines[i]) && HEADER_TAG.test(lines[i + 1] ?? '')) { if (cur.some((l) => l.trim())) docs.push(cur); cur = []; }
    cur.push(lines[i]);
  }
  if (cur.some((l) => l.trim())) docs.push(cur);
  return docs;
}

/**
 * Ticks that stand out from their neighbours: more than `factor` times the median of the surrounding
 * window and above `floor` units. Returns indexes into `ns`. Shared with the worker; keep in sync.
 */
export function outlierTicks(ns: number[], factor = 5, floor = 40, window = 4): number[] {
  const out: number[] = [];
  for (let i = 0; i < ns.length; i++) {
    if (ns[i] <= floor) continue;
    const around: number[] = [];
    for (let j = Math.max(0, i - window); j <= Math.min(ns.length - 1, i + window); j++) if (j !== i) around.push(ns[j]);
    if (around.length < 2) continue;
    around.sort((a, b) => a - b);
    const med = around[Math.floor(around.length / 2)];
    if (ns[i] > factor * Math.max(1, med)) out.push(i);
  }
  return out;
}

export function checkDocument(lines: string[], index: number): { doc: LogDocument; ticks: CheckedTick[] } {
  const issues: LogIssue[] = [];
  let i = 0, complete = false, sessionStart: number | undefined;
  // header
  if (HEADER_START.test(lines[0] ?? '') && HEADER_TAG.test(lines[1] ?? '')) {
    i = 2;
    while (i < lines.length && !HEADER_START.test(lines[i])) {
      const m = SESSION_STARTED.exec(lines[i]); if (m) sessionStart = stampMs(m);
      i++;
    }
    if (i < lines.length && sessionStart !== undefined) { complete = true; i++; } else issues.push({ level: 'error', msg: 'header is incomplete: no "Session Started" line or closing rule' });
  } else {
    issues.push({ level: 'warn', msg: 'no Gamelog header, so this is not a whole game log file' });
  }
  // body
  const ticks: CheckedTick[] = [];
  const tickLines: number[] = [];
  let last = 0, stamped = 0, stray = 0, sameStamp = 0, lastStamp = -1;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const m = STAMP.exec(line);
    // Unstamped lines continue the previous message ("Unable to deposit items / Module is offline"); only text before any entry is suspect.
    if (!m) { if (!stamped) stray++; continue; }
    stamped++;
    const t = stampMs(m);
    if (t < last) issues.push({ level: 'error', line: i + 1, msg: `line ${i + 1} is earlier than the line before it` });
    if (sessionStart !== undefined && t < sessionStart) issues.push({ level: 'error', line: i + 1, msg: `line ${i + 1} is before the session started` });
    last = Math.max(last, t);
    if (m[7] !== 'mining') continue;
    const mm = MINING.exec(m[8]);
    if (!mm) { issues.push({ level: 'error', line: i + 1, msg: `line ${i + 1} is a mining line in an unexpected format` }); continue; }
    const n = Number(mm[1].replace(/,/g, ''));
    if (!Number.isInteger(n) || n < 1 || n > MAX_TICK_UNITS) issues.push({ level: 'error', line: i + 1, msg: `line ${i + 1} reports ${n} units in one tick` });
    if (t === lastStamp) { if (++sameStamp === 4) issues.push({ level: 'warn', line: i + 1, msg: `five or more mining ticks share the same second around line ${i + 1}` }); } else sameStamp = 0;
    lastStamp = t;
    ticks.push({ t, n, name: mm[2].trim() }); tickLines.push(i + 1);
  }
  if (stray) issues.push({ level: 'error', msg: `${stray} line${stray === 1 ? '' : 's'} of text before the first log entry` });
  if (complete && !stamped) issues.push({ level: 'error', msg: 'no log entries after the header' });
  if (sessionStart !== undefined && last - sessionStart > 48 * 3600e3) issues.push({ level: 'warn', msg: 'log spans more than two days' });
  for (const k of outlierTicks(ticks.map((x) => x.n))) issues.push({ level: 'error', line: tickLines[k], msg: `line ${tickLines[k]}: ${ticks[k].n} units in one tick is far above its neighbours` });
  const dedup = issues.filter((x, k) => issues.findIndex((y) => y.msg === x.msg) === k).slice(0, 12);
  const ok = complete && !dedup.some((x) => x.level === 'error');
  if (ok) for (const t of ticks) t.v = 1;
  return { doc: { index, complete, sessionStart, lines: lines.filter((l) => l.trim()).length, miningTicks: ticks.length, issues: dedup, ok }, ticks };
}

/** Check every document in the pasted text and return its mining ticks, verified ones flagged. */
export function parseGamelogChecked(text: string): { docs: LogDocument[]; ticks: CheckedTick[] } {
  const docs: LogDocument[] = []; const ticks: CheckedTick[] = [];
  splitDocuments(text).forEach((lines, k) => { const r = checkDocument(lines, k + 1); docs.push(r.doc); ticks.push(...r.ticks); });
  return { docs, ticks: ticks.sort((a, b) => a.t - b.t) };
}
