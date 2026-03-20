import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/organisms/index.ts';

// ── swap this for the raw GitHub URL once you have it ──────────────────────
const APPS_JSON_URL = 'https://raw.githubusercontent.com/Econmartin/eve-frontier-apps/refs/heads/main/urls.json';
// ──────────────────────────────────────────────────────────────────────────

interface AppEntry {
  url: string;
  title: string;
  description: string;
  image: string | null;
  tags: string[];
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

function getInitials(title: string) {
  return title.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function AppCard({ app }: { app: AppEntry }) {
  const [imgFailed, setImgFailed] = useState(false);
  const domain = getDomain(app.url);

  return (
    <a
      href={app.url}
      className="dir-card block no-underline text-inherit rounded-lg overflow-hidden cursor-pointer relative transition-all duration-200 hover:-translate-y-px"
      style={{
        background: '#080d16',
        border: '1px solid #1a2a3a',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = '#1e3a52';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,97,10,0.05)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = '#1a2a3a';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      }}
    >
      {/* hover glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: 'linear-gradient(135deg, rgba(255,97,10,0.06) 0%, transparent 60%)' }}
      />

      <div className="flex items-stretch">
        {/* Thumbnail */}
        <div
          className="flex-shrink-0 relative overflow-hidden"
          style={{ width: 100, minHeight: 63, borderRight: '1px solid #1a2a3a' }}
        >
          {app.image && !imgFailed ? (
            <img
              src={app.image}
              alt={app.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-center"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center relative overflow-hidden"
              style={{ background: '#0d1520', minHeight: 63 }}
            >
              {/* diagonal stripe pattern */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,97,10,0.04) 6px, rgba(255,97,10,0.04) 7px)',
                }}
              />
              <span
                className="relative z-10 font-heading text-xl font-bold"
                style={{ color: '#ff610a', opacity: 0.4, letterSpacing: '0.05em' }}
              >
                {getInitials(app.title)}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <span
              className="font-heading font-semibold text-base text-white leading-snug"
              style={{ letterSpacing: '0.04em' }}
            >
              {app.title}
            </span>
            {/* arrow */}
            <svg
              className="flex-shrink-0 mt-0.5 transition-all duration-200"
              style={{ color: '#3a5a6a' }}
              width="14" height="14" viewBox="0 0 16 16" fill="none"
            >
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div className="font-mono text-[10px]" style={{ color: '#3a5a6a', letterSpacing: '0.03em' }}>
            {domain}
          </div>

          <p
            className="font-mono text-[11px] leading-snug mt-0.5"
            style={{
              color: '#5a7a8a',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          >
            {app.description}
          </p>

          {app.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1">
              {app.tags.map(tag => (
                <span
                  key={tag}
                  className="font-mono text-[9px] uppercase px-1.5 py-px rounded-sm"
                  style={{
                    letterSpacing: '0.08em',
                    background: tag === 'dapp' ? 'rgba(167,139,250,0.1)' : 'rgba(255,97,10,0.08)',
                    border: `1px solid ${tag === 'dapp' ? 'rgba(167,139,250,0.3)' : 'rgba(255,97,10,0.2)'}`,
                    color: tag === 'dapp' ? '#a78bfa' : '#ff610a',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

export function DirectoryPage() {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetch(APPS_JSON_URL)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setApps(data); setLoading(false); })
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
      const matchesFilter = activeFilter === 'all' || app.tags.includes(activeFilter);
      const matchesSearch = !q ||
        app.title.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        getDomain(app.url).includes(q) ||
        app.tags.some(t => t.includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [apps, query, activeFilter]);

  return (
    <div className="directory-page">
      <div className="relative z-10">
        <Header />

        <div className="mx-auto px-4 pb-10" style={{ maxWidth: 560 }}>
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
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: '#5a7a8a' }}
              width="14" height="14" viewBox="0 0 16 16" fill="none"
            >
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
              onFocus={e => {
                e.target.style.borderColor = '#ff610a';
                e.target.style.boxShadow = '0 0 0 3px rgba(255,97,10,0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#1e3a52';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Filters */}
          {allTags.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {['all', ...allTags].map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className="font-mono text-[11px] uppercase px-2.5 py-1 rounded-sm transition-all duration-150 cursor-pointer"
                  style={{
                    letterSpacing: '0.06em',
                    background: activeFilter === f ? 'rgba(255,97,10,0.1)' : 'transparent',
                    border: `1px solid ${activeFilter === f ? '#ff610a' : '#1e3a52'}`,
                    color: activeFilter === f ? '#ff610a' : '#5a7a8a',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Meta count */}
          {!loading && !error && (
            <div className="font-mono text-[11px] mb-3" style={{ color: '#3a5a6a', letterSpacing: '0.06em' }}>
              <span style={{ color: '#ff610a' }}>{filtered.length}</span> of {apps.length} apps
            </div>
          )}

          {/* Cards */}
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
              <svg className="mx-auto mb-3 opacity-30" width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="18" cy="18" r="11" stroke="#ff610a" strokeWidth="1.5"/>
                <path d="M26 26L34 34" stroke="#ff610a" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="font-mono text-[11px]" style={{ letterSpacing: '0.06em' }}>
                NO APPS FOUND // {query}
              </p>
            </div>
          )}

          {!loading && !error && (
            <div className="flex flex-col gap-3">
              {filtered.map(app => <AppCard key={app.url} app={app} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
