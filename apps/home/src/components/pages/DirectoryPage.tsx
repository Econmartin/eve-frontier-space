import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/organisms/index.ts';

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

function getInitials(title: string) {
  return title.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
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

// Seed-based deterministic hue for bokeh orbs (fallback when no OG image)
function hueFromUrl(url: string) {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) & 0xffffff;
  return h % 360;
}

function BokehFallback({ url }: { url: string }) {
  const hue = hueFromUrl(url);
  const orbs = [
    { size: 80, x: 30, y: 40, opacity: 0.55 },
    { size: 60, x: 65, y: 25, opacity: 0.40 },
    { size: 55, x: 20, y: 65, opacity: 0.35 },
    { size: 45, x: 72, y: 68, opacity: 0.30 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden">
      {orbs.map((o, i) => (
        <div key={i} className="absolute rounded-full" style={{
          width: o.size, height: o.size,
          left: `${o.x}%`, top: `${o.y}%`,
          transform: 'translate(-50%,-50%)',
          background: `radial-gradient(circle, hsl(${(hue + i * 25) % 360},70%,45%) 0%, transparent 70%)`,
          opacity: o.opacity,
          filter: 'blur(14px)',
        }} />
      ))}
    </div>
  );
}

function AppCard({ app, og }: { app: AppEntry; og: OGData | undefined }) {
  const [imgFailed, setImgFailed] = useState(false);
  const domain = getDomain(app.url);
  const title = og?.title ?? titleFromDomain(app.url);
  const description = og?.description;
  const image = og?.image;
  const showImage = image && !imgFailed;

  return (
    <a
      href={app.url}
      className="dir-card group block no-underline text-inherit rounded-2xl overflow-hidden cursor-pointer relative transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: '#111111',
        border: '1px solid rgba(255,97,10,0.18)',
        boxShadow: '0 0 0 0 rgba(255,97,10,0), 0 4px 24px rgba(0,0,0,0.5)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 0 20px 2px rgba(255,97,10,0.12), 0 8px 32px rgba(0,0,0,0.6)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,97,10,0.45)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 0 0 0 rgba(255,97,10,0), 0 4px 24px rgba(0,0,0,0.5)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,97,10,0.18)';
      }}
    >
      <div className="flex items-stretch" style={{ minHeight: 130 }}>

        {/* Left — OG image or bokeh orbs */}
        <div className="flex-shrink-0 relative overflow-hidden rounded-l-2xl" style={{ width: '36%' }}>
          <div className="absolute inset-0" style={{ background: '#1a1008' }} />
          {showImage ? (
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-80"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <BokehFallback url={app.url} />
          )}
        </div>

        {/* Right — content */}
        <div className="flex-1 min-w-0 flex flex-col px-5 py-4">
          {/* Title + tags */}
          <div className="flex items-start gap-2 mb-1.5">
            <h3 className="flex-1 font-sans font-bold text-white leading-snug" style={{ fontSize: 16 }}>
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
              color: '#8a8a8a',
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
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 10, paddingTop: 10 }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm" style={{ color: '#ff610a', letterSpacing: '0.02em' }}>
                {domain}
              </span>
              <div className="flex items-center justify-center rounded-full transition-colors duration-200 group-hover:bg-[#ff610a]"
                style={{ width: 28, height: 28, background: 'rgba(255,97,10,0.15)', border: '1px solid rgba(255,97,10,0.3)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 10L10 2M10 2H5M10 2v5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

      </div>
    </a>
  );
}

export function DirectoryPage() {
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
        // Fetch OG data for all apps in parallel
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
    <div className="directory-page">
      <div className="relative z-10">
        <Header hideActions />

        <div className="w-full px-4 pb-10 mx-auto" style={{ maxWidth: '100%' }}>
          <div className="mx-auto" style={{ maxWidth: 800 }}>

            {/* Page title */}
            <div className="py-5 mb-4" style={{ borderBottom: '1px solid #1a2a3a' }}>
              <div className="font-mono text-[11px] mb-1" style={{ color: '#5a7a8a', letterSpacing: '0.06em' }}>
                // community-maintained app directory
              </div>
              <h1 className="font-heading text-xl font-bold text-white" style={{ letterSpacing: '0.08em' }}>
                EVE FRONTIER <span style={{ color: '#ff610a' }}>APPS</span>
              </h1>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#5a7a8a' }}
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
                  background: '#080d16',
                  border: '1px solid #1e3a52',
                  borderRadius: 6,
                  padding: '9px 12px 9px 36px',
                  color: '#c8dce8',
                  fontSize: 13,
                }}
                onFocus={e => { e.target.style.borderColor = '#ff610a'; e.target.style.boxShadow = '0 0 0 3px rgba(255,97,10,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = '#1e3a52'; e.target.style.boxShadow = 'none'; }}
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
                      border: `1px solid ${activeFilter === f ? '#ff610a' : '#1e3a52'}`,
                      color: activeFilter === f ? '#ff610a' : '#5a7a8a',
                    }}>
                    {f}
                  </button>
                ))}
              </div>
            )}

            {/* Meta */}
            {!loading && !error && (
              <div className="font-mono text-[11px] mb-3" style={{ color: '#3a5a6a', letterSpacing: '0.06em' }}>
                <span style={{ color: '#ff610a' }}>{filtered.length}</span> of {apps.length} apps
              </div>
            )}

            {loading && (
              <div className="font-mono text-[12px] py-12 text-center" style={{ color: '#3a5a6a', letterSpacing: '0.06em' }}>
                LOADING...
              </div>
            )}
            {error && (
              <div className="font-mono text-[12px] py-12 text-center" style={{ color: '#3a5a6a', letterSpacing: '0.06em' }}>
                FAILED TO LOAD // check network
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="text-center py-12" style={{ color: '#5a7a8a' }}>
                <p className="font-mono text-[11px]" style={{ letterSpacing: '0.06em' }}>NO APPS FOUND // {query}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
                {filtered.map(app => <AppCard key={app.url} app={app} og={ogMap[app.url]} />)}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
