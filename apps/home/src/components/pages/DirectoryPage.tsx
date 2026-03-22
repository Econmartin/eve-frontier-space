import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Header } from '@/components/organisms/index.ts';
import { deriveChainObjectId } from '@/lib/assemblyId';

// ---------------------------------------------------------------------------
// Assembly ID config
// Defaults are hardcoded (these are public values, not secrets) so derivation
// works in production without any extra build config. Override via env vars if needed.
// ---------------------------------------------------------------------------
const WORLD_PKG_ID: string =
  import.meta.env.VITE_EVE_WORLD_PACKAGE_ID ||
  '0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75';

const GRAPHQL_ENDPOINT: string =
  import.meta.env.VITE_SUI_GRAPHQL_ENDPOINT ||
  'https://graphql.testnet.sui.io/graphql';

const APPS_JSON_URL =
  'https://raw.githubusercontent.com/Econmartin/eve-frontier-apps/refs/heads/main/urls.json';

interface AppEntry {
  url: string;
  tags: string[];
}

interface OGData {
  title?: string;
  description?: string;
  image?: string;
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

function titleFromDomain(url: string) {
  const d = getDomain(url);
  return d.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchOG(url: string): Promise<OGData> {
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
    const json = await res.json();
    if (json.status !== 'success') return {};
    return {
      title: json.data?.title ?? undefined,
      description: json.data?.description ?? undefined,
      image: json.data?.image?.url ?? undefined,
    };
  } catch {
    return {};
  }
}

// Deterministic hue from URL for bokeh fallback
function hueFromUrl(url: string) {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) & 0xffffff;
  return h % 360;
}

function BokehFallback({ url }: { url: string }) {
  const hue = hueFromUrl(url);
  const orbs = [
    { size: 90,  x: 30, y: 45, opacity: 0.55 },
    { size: 70,  x: 68, y: 25, opacity: 0.40 },
    { size: 60,  x: 18, y: 70, opacity: 0.35 },
    { size: 50,  x: 75, y: 72, opacity: 0.30 },
  ];
  return (
    <>
      {orbs.map((o, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none" style={{
          width: o.size, height: o.size,
          left: `${o.x}%`, top: `${o.y}%`,
          transform: 'translate(-50%,-50%)',
          background: `radial-gradient(circle, hsl(${(hue + i * 28) % 360},65%,42%) 0%, transparent 70%)`,
          opacity: o.opacity,
          filter: 'blur(16px)',
        }} />
      ))}
    </>
  );
}

function AppCard({ app, og }: { app: AppEntry; og: OGData | undefined }) {
  const domain = getDomain(app.url);
  const title = og?.title ?? titleFromDomain(app.url);
  const description = og?.description;
  const image = og?.image;

  return (
    <a
      href={app.url}
      className="dir-card group block no-underline text-inherit rounded-2xl overflow-hidden cursor-pointer relative transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: 'var(--card)',
        border: '1px solid rgba(255,97,10,0.2)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px 2px rgba(255,97,10,0.14), 0 8px 32px rgba(0,0,0,0.6)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,97,10,0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.5)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,97,10,0.2)';
      }}
    >
      <div className="flex" style={{ minHeight: 130 }}>

        {/* Left — image via background-image (covers reliably) or bokeh orbs */}
        <div
          className="flex-shrink-0 relative overflow-hidden"
          style={{
            width: '36%',
            backgroundColor: 'oklch(0.12 0.015 30)',
            ...(image ? {
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : {}),
          }}
        >
          {!image && <BokehFallback url={app.url} />}
        </div>

        {/* Right — content */}
        <div className="flex-1 min-w-0 flex flex-col px-5 py-4">

          {/* Title + tags */}
          <div className="flex items-start gap-2 mb-2">
            <h3 className="flex-1 font-sans font-bold leading-snug" style={{ fontSize: 16, color: 'var(--card-foreground)' }}>
              {title}
            </h3>
            {app.tags.map(tag => (
              <span key={tag} className="flex-shrink-0 font-mono text-[9px] uppercase px-1.5 py-px rounded-sm mt-0.5" style={{
                letterSpacing: '0.08em',
                background: tag === 'dapp' ? 'rgba(167,139,250,0.1)' : 'rgba(255,97,10,0.08)',
                border: `1px solid ${tag === 'dapp' ? 'rgba(167,139,250,0.3)' : 'rgba(255,97,10,0.2)'}`,
                color: tag === 'dapp' ? '#a78bfa' : '#ff610a',
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Description */}
          {description ? (
            <p className="font-sans text-sm leading-relaxed flex-1" style={{
              color: 'var(--muted-foreground)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}>
              {description}
            </p>
          ) : (
            <div className="flex-1" />
          )}

          {/* Divider + footer */}
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="font-mono text-sm transition-colors duration-200" style={{ color: '#ff610a', letterSpacing: '0.02em' }}>
              {domain}
            </span>
            <svg
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              style={{ color: 'var(--muted-foreground)' }}
              width="14" height="14" viewBox="0 0 12 12" fill="none"
            >
              <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

        </div>
      </div>
    </a>
  );
}

export function DirectoryPage() {
  // ---------------------------------------------------------------------------
  // Assembly ID — read from URL params injected by the EVE Frontier game client
  // The game appends ?itemId=<in-game integer>&tenant=<tenant> when opening a dapp.
  // We display the in-game ID immediately, then derive the chain object ID async.
  // ---------------------------------------------------------------------------
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId');
  const tenant = searchParams.get('tenant') ?? 'testevenet';

  const [chainObjectId, setChainObjectId] = useState<string | null>(null);
  const [chainIdLoading, setChainIdLoading] = useState(false);
  const [chainIdError, setChainIdError] = useState(false);

  useEffect(() => {
    if (!itemId || !WORLD_PKG_ID || !GRAPHQL_ENDPOINT) return;
    setChainIdLoading(true);
    setChainIdError(false);
    deriveChainObjectId(itemId, tenant, WORLD_PKG_ID, GRAPHQL_ENDPOINT)
      .then(id => { setChainObjectId(id); setChainIdLoading(false); })
      .catch(() => { setChainIdError(true); setChainIdLoading(false); });
  }, [itemId, tenant]);

  const [apps, setApps] = useState<AppEntry[]>([]);
  const [ogMap, setOgMap] = useState<Record<string, OGData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetch(APPS_JSON_URL)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: AppEntry[]) => {
        setApps(data);
        setLoading(false);
        data.forEach(app => {
          fetchOG(app.url).then(og => {
            setOgMap(prev => ({ ...prev, [app.url]: og }));
          });
        });
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    apps.forEach(a => a.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [apps]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return apps.filter(app => {
      const og = ogMap[app.url];
      const matchesFilter = activeFilter === 'all' || app.tags.includes(activeFilter);
      const matchesSearch = !q ||
        (og?.title ?? titleFromDomain(app.url)).toLowerCase().includes(q) ||
        (og?.description ?? '').toLowerCase().includes(q) ||
        getDomain(app.url).includes(q) ||
        app.tags.some(t => t.includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [apps, ogMap, query, activeFilter]);

  return (
    // Force dark so all var(--card), var(--border) etc. resolve to dark-mode values
    <div className="directory-page dark">
      <div className="relative z-10">
        <Header hideActions />

        <div className="w-full px-4 pb-10">
          <div className="mx-auto" style={{ maxWidth: 860 }}>

            {/* Page title */}
            <div className="py-5 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="font-mono text-[11px] mb-1" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
                // community-maintained app directory
              </div>
              <h1 className="font-heading text-xl font-bold text-white" style={{ letterSpacing: '0.08em' }}>
                EVE FRONTIER <span style={{ color: '#ff610a' }}>APPS</span>
              </h1>
              {/* ---------------------------------------------------------------------------
                  Assembly ID block — only rendered when ?itemId= is present in the URL.
                  The EVE Frontier game client injects ?itemId=&tenant= when it opens a
                  dapp that is registered on-chain against a smart assembly.
                  Shows the in-game ID immediately; chain object ID loads async.
                  --------------------------------------------------------------------------- */}
              {itemId ? (
                <div className="mt-2 flex flex-col gap-0.5">
                  <div className="font-mono text-[11px]" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
                    In-game ID: <span style={{ color: '#ff610a' }}>{itemId}</span>
                    <span className="ml-2" style={{ opacity: 0.5 }}>({tenant})</span>
                  </div>
                  <div className="font-mono text-[11px]" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
                    Chain ID:{' '}
                    {chainIdLoading && <span style={{ opacity: 0.5 }}>deriving...</span>}
                    {chainIdError && <span style={{ color: '#ef4444' }}>could not derive</span>}
                    {chainObjectId && <span style={{ color: '#ff610a' }}>{chainObjectId}</span>}
                  </div>
                </div>
              ) : (
                <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.4, letterSpacing: '0.06em' }}>
                  // no assembly params in url: {window.location.search || '(none)'}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--muted-foreground)' }}
                width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 10L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search apps..."
                autoComplete="off"
                spellCheck={false}
                className="w-full font-mono text-sm outline-none transition-all duration-200"
                style={{
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '9px 12px 9px 36px',
                  color: 'var(--foreground)',
                  fontSize: 13,
                }}
                onFocus={e => { e.target.style.borderColor = '#ff610a'; e.target.style.boxShadow = '0 0 0 3px rgba(255,97,10,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Filters */}
            {allTags.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {['all', ...allTags].map(f => (
                  <button key={f} onClick={() => setActiveFilter(f)}
                    className="font-mono text-[11px] uppercase px-2.5 py-1 rounded-sm transition-all duration-150 cursor-pointer"
                    style={{
                      letterSpacing: '0.06em',
                      background: activeFilter === f ? 'rgba(255,97,10,0.1)' : 'transparent',
                      border: `1px solid ${activeFilter === f ? '#ff610a' : 'var(--border)'}`,
                      color: activeFilter === f ? '#ff610a' : 'var(--muted-foreground)',
                    }}>
                    {f}
                  </button>
                ))}
              </div>
            )}

            {/* Meta count */}
            {!loading && !error && (
              <div className="font-mono text-[11px] mb-3" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
                <span style={{ color: '#ff610a' }}>{filtered.length}</span> of {apps.length} apps
              </div>
            )}

            {loading && (
              <div className="font-mono text-[12px] py-12 text-center" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
                LOADING...
              </div>
            )}
            {error && (
              <div className="font-mono text-[12px] py-12 text-center" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
                FAILED TO LOAD // check network
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}>
                <p className="font-mono text-[11px]" style={{ letterSpacing: '0.06em' }}>NO APPS FOUND // {query}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
                {filtered.map(app => <AppCard key={app.url} app={app} og={ogMap[app.url]} />)}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
