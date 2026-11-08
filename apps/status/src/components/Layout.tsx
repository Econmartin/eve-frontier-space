import { AppHeader, Footer, PageWrapper, ThemeToggle } from '@eve-frontier-space/ui';
import { Check, Copy, ExternalLink, Menu, Rss, Webhook, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { API, EXPLORER, useTimeMode } from '../lib.tsx';

const TABS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/chain', label: 'Chain' },
  { to: '/history', label: 'History' },
  { to: '/api', label: 'API' },
];

/** The site-wide links, as in the home app's header. */
const SITE_LINKS = [
  { href: '/industry', label: 'Industry' },
  { href: '/station-creator', label: 'Station Creator' },
];
const MOVE_HREF = '/move';

function SiteActions() {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();
  return (
    <>
      <div className="hidden items-center gap-3 md:flex">
        <ThemeToggle />
        {SITE_LINKS.map((l) => (
          <a key={l.href} href={l.href} className="rounded-lg px-4 py-2 text-sm font-semibold text-white/80 no-underline transition-colors hover:bg-white/10 hover:text-white">
            {l.label}
          </a>
        ))}
        <a href={MOVE_HREF} className="rounded-lg bg-[#FAFAE5] px-5 py-2 text-sm font-semibold text-black no-underline transition-colors hover:bg-[#e8e8d0]">
          First Move
        </a>
      </div>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        aria-label="Open menu"
        className="inline-flex size-10 items-center justify-center rounded-lg text-white hover:bg-white/10 md:hidden"
      >
        <Menu className="size-6" aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        aria-label="Menu"
        className="site-menu bg-slate-900 text-white"
        onClick={(e) => {
          if (e.target === dialog.current) close(); // click on the backdrop
        }}
      >
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-base font-semibold">Menu</h2>
            <button type="button" onClick={close} className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-white/10" aria-label="Close menu">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Site" className="mt-4 flex flex-col gap-3">
            <a href={MOVE_HREF} className="w-full rounded-lg bg-[#FAFAE5] py-3 text-center text-sm font-semibold text-black no-underline hover:bg-[#e8e8d0]">
              First Move
            </a>
            {SITE_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="w-full rounded-lg border border-white/20 py-3 text-center text-sm font-semibold text-white no-underline hover:bg-white/10">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-5 flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-white/60">Theme</span>
          </div>
        </div>
      </dialog>
    </>
  );
}

function TimeToggle() {
  const { mode, setMode } = useTimeMode();
  return (
    <div role="group" aria-label="Show times in" className="inline-flex self-start rounded-xl bg-surface p-1 text-xs ring-1 ring-line md:self-auto">
      {(['utc', 'local'] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => setMode(m)}
          className={`rounded-lg px-3 py-1.5 font-semibold tracking-wide uppercase ${mode === m ? 'bg-text text-bg' : 'text-muted hover:text-text'}`}
        >
          {m === 'utc' ? 'UTC' : 'Local'}
        </button>
      ))}
    </div>
  );
}

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `block shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold tracking-wide uppercase whitespace-nowrap no-underline transition-colors ${
    isActive ? 'bg-[var(--color-martian-500)] text-black' : 'text-white/75 hover:bg-white/10 hover:text-white'
  }`;

// Paths here are relative to the router's /status basename.
const TITLES: [RegExp, string][] = [
  [/^\/chain/, 'Chain'],
  [/^\/history\/?$/, 'History'],
  [/^\/api/, 'API'],
];

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (/^\/history\/./.test(pathname)) return; // the component page names itself once its data is in
    const t = TITLES.find(([re]) => re.test(pathname))?.[1];
    document.title = t ? `${t} · EVE Frontier Status` : 'EVE Frontier Status';
  }, [pathname]);
  return (
    <PageWrapper>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-text"
      >
        Skip to content
      </a>
      <AppHeader logoSrc="/assets/eve_frontier_transparent-256w.webp" right={<SiteActions />} />
      <main id="main" tabIndex={-1} className="px-4 pb-10 text-text focus:outline-none sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 pt-8 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs tracking-[0.16em] text-muted uppercase">Live</p>
            <h1 className="text-4xl leading-[0.9] font-bold sm:text-5xl">Status</h1>
            <p className="mt-3 max-w-xl text-sm text-muted">
              Is EVE Frontier up? Stillness and Utopia, and the Sui testnet they run on, checked every minute, with 90 days of history and a public API.
            </p>
          </div>
          <TimeToggle />
        </div>
        <nav aria-label="Status sections" className="mb-6">
          <ul className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-2xl bg-black/95 p-1 backdrop-blur-md [scrollbar-width:none] dark:bg-white/5">
            {TABS.map((t) => (
              <li key={t.to}>
                <NavLink to={t.to} end={t.end} className={tabClass}>
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Outlet />
        <section aria-label="About this data" className="mt-12 border-t border-line pt-5 text-xs text-muted">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <NavLink to="/api" className="underline hover:text-text">
              API docs
            </NavLink>
            <a href="/status/feeds/incidents.rss" className="underline hover:text-text">
              RSS
            </a>
            <a href="/status/openapi.yaml" className="underline hover:text-text">
              OpenAPI
            </a>
            <span>
              Data: <a className="underline hover:text-text" href="https://graphql.testnet.sui.io/graphql">Sui testnet GraphQL</a>,{' '}
              <a className="underline hover:text-text" href="https://github.com/evefrontier/world-contracts">world-contracts Published.toml</a>,{' '}
              <a className="underline hover:text-text" href="https://world-api-stillness.live.pub.evefrontier.com/health">Stillness World API</a>
            </span>
          </div>
          <p className="mt-2">A community monitor. Checks run every minute.</p>
        </section>
      </main>
      <div className="px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
        <Footer />
      </div>
    </PageWrapper>
  );
}

// ── Subscribe ───────────────────────────────────────────────────────────────────

export function Subscribe() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [state, setState] = useState<{ ok?: { id: string; secret: string }; error?: string; busy?: boolean }>({});
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    // Tabbing out closes it, so the panel never covers whatever gets focus next (WCAG 2.4.11).
    const onFocus = (e: FocusEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('focusin', onFocus);
    panel.current?.querySelector<HTMLElement>('a,input')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('focusin', onFocus);
    };
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      const r = await fetch(`${API}/subscriptions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setState({ ok: { id: j.id, secret: j.secret } });
    } catch (err) {
      setState({ error: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="subscribe-panel"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center rounded-xl bg-text px-4 text-sm font-semibold text-bg transition-opacity hover:opacity-85"
      >
        Subscribe
      </button>
      {open && (
        <div
          ref={panel}
          id="subscribe-panel"
          role="region"
          aria-label="Subscribe to updates"
          className="fade-in absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl bg-surface ring-1 ring-line p-4 text-sm shadow-xl"
        >
          <a href="/status/feeds/incidents.rss" className="flex items-center gap-2 font-bold underline">
            <Rss size={16} aria-hidden="true" /> RSS feed of incidents
          </a>
          <form onSubmit={submit} className="mt-4">
            <label htmlFor="webhook-url" className="flex items-center gap-2 font-bold">
              <Webhook size={16} aria-hidden="true" /> Webhook
            </label>
            <p id="webhook-help" className="mt-1 text-xs text-muted">We POST JSON to your https URL when an incident opens, changes or resolves, or a world is redeployed. Your endpoint must first echo back the challenge we send it. Details on the API tab.</p>
            <div className="mt-2 flex gap-2">
              <input
                id="webhook-url"
                type="url"
                required
                placeholder="https://example.com/hook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-describedby="webhook-help"
                className="h-9 min-w-0 flex-1 rounded-xl bg-bg px-3 ring-1 ring-muted"
              />
              <button type="submit" disabled={state.busy} className="h-9 rounded-xl bg-text px-4 font-semibold text-bg hover:opacity-85 disabled:opacity-60">
                Add
              </button>
            </div>
            <div aria-live="polite" className="mt-2 text-xs">
              {state.error && <p className="text-offline">Could not subscribe: {state.error}</p>}
              {state.ok && (
                <div className="rounded-md bg-surface-2 p-2">
                  <p className="font-bold text-operational">Subscribed.</p>
                  <p className="mt-1">Save this secret now; it is shown once. It signs every delivery and lets you unsubscribe.</p>
                  <CopyText label="Subscription id" value={state.ok.id} />
                  <CopyText label="Secret" value={state.ok.secret} />
                </div>
              )}
            </div>
          </form>
          <p className="mt-4 text-xs text-muted">Email updates: coming later.</p>
        </div>
      )}
    </div>
  );
}

// ── Addresses ───────────────────────────────────────────────────────────────────

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          } catch {
            /* clipboard blocked */
          }
        }}
        aria-label={`Copy ${label}`}
        className="inline-flex shrink-0 items-center rounded p-1 text-muted hover:bg-surface-2 hover:text-text"
      >
        {done ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      </button>
      <span role="status" className="sr-only">
        {done ? `Copied ${label}` : ''}
      </span>
    </>
  );
}

function CopyText({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1 flex items-center gap-1">
      <span className="text-muted">{label}:</span>
      <code className="break-all">{value}</code>
      <CopyButton value={value} label={label} />
    </div>
  );
}

export type ExplorerKind = 'object' | 'account' | 'tx' | 'checkpoint';

/** A lowercase address (or digest / checkpoint) linking to the testnet explorer, with a copy button. */
export function Address({ value, kind = 'object', label, children }: { value: string | null; kind?: ExplorerKind; label: string; children?: ReactNode }) {
  if (!value) return <span className="text-muted">—</span>;
  const v = kind === 'tx' ? value : value.toLowerCase();
  const visible = typeof children === 'string' ? children : v;
  return (
    <span className="inline-flex max-w-full items-start gap-1">
      <a href={`${EXPLORER}/${kind}/${v}`} target="_blank" rel="noreferrer" className="break-all font-mono underline" aria-label={`${visible}, ${label} (opens the Sui testnet explorer)`}>
        {children ?? v}
        <ExternalLink size={11} aria-hidden="true" className="ml-1 inline align-baseline" />
      </a>
      <CopyButton value={v} label={label} />
    </span>
  );
}
