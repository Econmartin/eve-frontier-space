import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export const API = '/status/api/v1';
export const EXPLORER = 'https://suiscan.xyz/testnet';

// ── Polling fetch ────────────────────────────────────────────────────────────────

export function usePoll<T>(path: string | null, everyMs = 60_000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!path) return;
    try {
      const r = await fetch(path, { headers: { accept: 'application/json' } });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);
      setData(j);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [path]);
  useEffect(() => {
    load();
    if (!everyMs) return;
    const t = setInterval(() => document.visibilityState === 'visible' && load(), everyMs);
    return () => clearInterval(t);
  }, [load, everyMs]);
  return { data, error, reload: load };
}

// ── Time: UTC by default, local on request ───────────────────────────────────────

type TimeMode = 'utc' | 'local';
const TimeCtx = createContext<{ mode: TimeMode; setMode: (m: TimeMode) => void }>({ mode: 'utc', setMode: () => {} });

export function TimeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<TimeMode>(() => {
    try {
      return localStorage.getItem('status.time') === 'local' ? 'local' : 'utc';
    } catch {
      return 'utc';
    }
  });
  const setMode = (m: TimeMode) => {
    setModeState(m);
    try {
      localStorage.setItem('status.time', m);
    } catch {
      /* private mode */
    }
  };
  return <TimeCtx.Provider value={{ mode, setMode }}>{children}</TimeCtx.Provider>;
}

export const useTimeMode = () => useContext(TimeCtx);

export function useFormatTime() {
  const { mode } = useTimeMode();
  const tz = mode === 'utc' ? 'UTC' : undefined;
  const suffix = mode === 'utc' ? ' UTC' : '';
  return {
    dateTime: (iso: string | null | undefined) =>
      iso
        ? new Date(iso).toLocaleString('en-GB', { timeZone: tz, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + suffix
        : '—',
    time: (iso: string | null | undefined) =>
      iso ? new Date(iso).toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + suffix : '—',
    mode,
  };
}

/** Dates in rollups are UTC days; they are shown as UTC days whatever the toggle says, labelled so. */
export const formatDay = (date: string) =>
  new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export function relative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'never';
  const s = Math.round((now - Date.parse(iso)) / 1000);
  if (s < 0) return 'just now';
  if (s < 90) return `${s} s ago`;
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172800) return `${(s / 3600).toFixed(1)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}

export function useNow(everyMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

export const pct = (u: number | null, digits = 2) => (u == null ? 'no data' : `${(u * 100).toFixed(u === 1 ? 0 : digits)}%`);
