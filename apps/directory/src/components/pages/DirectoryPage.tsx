/**
 * Main directory page — fetches community-curated EVE Frontier apps from
 * GitHub, enriches each with Open Graph metadata (title, description, image),
 * and renders them in a searchable, filterable grid.
 *
 * When a wallet is connected and FAVORITES_PACKAGE_ID is set, users can
 * favourite apps on-chain via the Sui Favorites contract. Favourited cards
 * are styled distinctly and grouped at the top of the "all" view.
 */
import { useState, useEffect, useMemo } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { Header } from '@/components/organisms/index.ts';
import { useFavorites } from '@/hooks/useFavorites.ts';
import { FAVORITES_PACKAGE_ID, APPS_JSON_URL } from '@/constants.ts';

interface AppEntry {
  url: string;
  tags: string[];
}

interface OGData {
  title?: string;
  description?: string;
  image?: string;
}

/** Returns host + path (minus www. prefix) for display in cards. */
function getDomain(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    return parsed.pathname && parsed.pathname !== '/' ? `${host}${parsed.pathname}` : host;
  }
  catch { return url; }
}

/** Derives a human-readable title from the domain when no OG title is available. */
function titleFromDomain(url: string) {
  const domain = getDomain(url);
  return domain.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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

/** Deterministic 0-359 hue derived from a URL string — used for bokeh colour variance. */
function hueFromUrl(url: string) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) & 0xffffff;
  return hash % 360;
}

/** Blurred radial-gradient orbs used as a thumbnail placeholder when no OG image is available. */
function BokehFallback({ url }: { url: string }) {
  const hue = hueFromUrl(url);
  const orbs = [
    { size: 90, x: 30, y: 45, opacity: 0.55 },
    { size: 70, x: 68, y: 25, opacity: 0.40 },
    { size: 60, x: 18, y: 70, opacity: 0.35 },
    { size: 50, x: 75, y: 72, opacity: 0.30 },
  ];
  return (
    <>
      {orbs.map((orb, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none" style={{
          width: orb.size, height: orb.size,
          left: `${orb.x}%`, top: `${orb.y}%`,
          transform: 'translate(-50%,-50%)',
          background: `radial-gradient(circle, hsl(${(hue + i * 28) % 360},65%,42%) 0%, transparent 70%)`,
          opacity: orb.opacity,
          filter: 'blur(16px)',
        }} />
      ))}
    </>
  );
}

function Tooltip({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative group/tip${className ? ` ${className}` : ''}`}>
      {children}
      <div
        className="absolute bottom-full right-0 mb-2 px-2 py-1 rounded pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 font-mono text-[10px]"
        style={{
          background: 'rgba(10,10,14,0.92)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function PlanetIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.2022 17.4864C15.9287 18.0707 13.8855 18.75 11.8191 18.75C10.415 18.75 9.33664 18.4232 8.47063 18.0619C8.13743 17.9229 7.82818 17.7752 7.55904 17.6467C7.48725 17.6124 7.41827 17.5795 7.3525 17.5484C7.02421 17.3936 6.77658 17.2868 6.55902 17.2272C5.54505 16.9497 4.53425 16.829 3.77052 16.7788C3.39043 16.7538 3.07579 16.7466 2.85802 16.7455C2.74923 16.7449 2.66488 16.746 2.60893 16.747C2.58096 16.7476 2.56011 16.7482 2.54688 16.7486L2.53281 16.749L2.53056 16.7491L2.48535 16.751C3.60703 19.814 6.54814 22 9.9998 22C13.1683 22 15.9066 20.158 17.2022 17.4864Z" fill="currentColor"/>
      <path d="M3.043 10.0472L3.49182 10.4391L3.49292 10.44L3.50559 10.4507C3.51828 10.4612 3.53939 10.4785 3.56867 10.5015C3.62725 10.5476 3.71829 10.6167 3.83972 10.7011C4.08289 10.8703 4.44584 11.0998 4.91196 11.3303C5.84579 11.792 7.1777 12.25 8.78427 12.25C9.84052 12.25 10.6461 11.9906 11.328 11.6852C11.6007 11.563 11.8454 11.4377 12.0919 11.3114C12.1636 11.2747 12.2355 11.2378 12.3082 11.201C12.6142 11.0461 12.9483 10.8842 13.2884 10.7843C14.3503 10.4722 15.2769 10.3399 15.9422 10.2856C16.2752 10.2584 16.5438 10.2508 16.7327 10.2501C16.8271 10.2497 16.9017 10.2511 16.9545 10.2527C16.9809 10.2535 17.0019 10.2543 17.0172 10.2551L17.0358 10.256L17.0419 10.2563L17.0441 10.2565L17.0454 10.2565L17.0726 10.2582C15.7298 7.72533 13.0663 6 9.9998 6C7.01925 6 4.4194 7.62997 3.043 10.0472Z" fill="currentColor"/>
      <path opacity="0.5" d="M17.8457 15.571C17.9469 15.0629 18 14.5374 18 13.9995C18 13.2362 17.8931 12.4979 17.6935 11.7987L16.9557 11.7533L16.9546 11.7533L16.9482 11.753C16.9406 11.7526 16.9276 11.7521 16.9093 11.7515C16.8727 11.7504 16.8151 11.7493 16.7384 11.7496C16.5849 11.7501 16.3552 11.7564 16.0643 11.7802C15.4818 11.8277 14.6584 11.9447 13.7114 12.2229C13.5171 12.28 13.2923 12.3837 12.9861 12.5387C12.9253 12.5695 12.8615 12.6022 12.7949 12.6363C12.5441 12.7649 12.2537 12.9138 11.9413 13.0537C11.1281 13.4179 10.1104 13.7495 8.78446 13.7495C6.89102 13.7495 5.33071 13.2101 4.24731 12.6744C3.70481 12.4061 3.27789 12.1369 2.98336 11.932C2.83593 11.8295 2.72115 11.7427 2.64113 11.6797C2.6011 11.6482 2.56972 11.6226 2.54724 11.6039L2.52021 11.5812L2.51175 11.574L2.50879 11.5714L2.50764 11.5704C2.50764 11.5704 2.50669 11.5696 2.99213 11.0137L2.50669 11.5696L2.40466 11.4805C2.14212 12.2725 2 13.1194 2 13.9995C2 14.4302 2.03403 14.8529 2.09954 15.2651L2.46925 15.2499L2.5 15.9993C2.46925 15.2499 2.46925 15.2499 2.46925 15.2499L2.47058 15.2498L2.47268 15.2498L2.47917 15.2495L2.50116 15.2488C2.51975 15.2482 2.54614 15.2475 2.57983 15.2469C2.64718 15.2455 2.7438 15.2444 2.86564 15.245C3.10913 15.2462 3.45444 15.2543 3.86909 15.2816C4.69483 15.3358 5.81265 15.4672 6.95524 15.78C7.31143 15.8775 7.66377 16.0362 7.99263 16.1913C8.06997 16.2278 8.14661 16.2644 8.22325 16.301C8.48817 16.4274 8.75347 16.554 9.04839 16.6771C9.78723 16.9853 10.6661 17.2495 11.8193 17.2495C13.9606 17.2495 16.1505 16.385 17.139 15.8421L17.7963 15.4811L17.8457 15.571Z" fill="currentColor"/>
      <path opacity="0.5" fillRule="evenodd" clipRule="evenodd" d="M20.53 4.04472C20.4934 3.95062 20.4492 3.8581 20.3971 3.76795C20.3451 3.6778 20.2871 3.59323 20.2239 3.51446C20.5502 3.42371 20.7725 3.41806 20.8301 3.51795C20.8878 3.61784 20.7718 3.80745 20.53 4.04472ZM17.1063 6.02144C16.7799 6.11219 16.5577 6.11784 16.5 6.01795C16.4423 5.91806 16.5583 5.72844 16.8001 5.49117C16.8367 5.58528 16.881 5.6778 16.933 5.76795C16.9851 5.8581 17.0431 5.94267 17.1063 6.02144ZM17.1063 6.02144C17.5613 5.89492 18.2188 5.60297 18.9151 5.20096C19.6114 4.79895 20.1929 4.37553 20.53 4.04472C20.882 4.94913 20.5315 5.99976 19.6651 6.5C18.7986 7.00024 17.7135 6.77849 17.1063 6.02144ZM16.8001 5.49117C16.4481 4.58677 16.7986 3.53613 17.6651 3.0359C18.5315 2.53566 19.6166 2.7574 20.2239 3.51446C19.7689 3.64098 19.1114 3.93293 18.4151 4.33494C17.7188 4.73695 17.1372 5.16037 16.8001 5.49117Z" fill="currentColor"/>
    </svg>
  );
}

interface AppCardProps {
  app: AppEntry;
  og: OGData | undefined;
  isFavorited: boolean;
  isPending: boolean;
  showFavorite: boolean;
  onToggleFavorite: (url: string) => void;
}

function AppCard({ app, og, isFavorited, isPending, showFavorite, onToggleFavorite }: AppCardProps) {
  const domain = getDomain(app.url);
  const title = og?.title ?? titleFromDomain(app.url);
  const description = og?.description;
  const image = og?.image;

  return (
    <a
      href={app.url}
      className="dir-card group flex flex-col no-underline text-inherit rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: isFavorited ? 'rgba(255,97,10,0.06)' : 'var(--card)',
        border: isFavorited ? '1px solid rgba(255,97,10,0.55)' : '1px solid rgba(255,97,10,0.2)',
        boxShadow: isFavorited
          ? '0 0 20px rgba(255,97,10,0.1), 0 4px 24px rgba(0,0,0,0.5)'
          : '0 4px 24px rgba(0,0,0,0.5)',
        padding: 16,
        gap: 12,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = isFavorited
          ? '0 0 32px rgba(255,97,10,0.22), 0 8px 32px rgba(0,0,0,0.6)'
          : '0 0 24px 2px rgba(255,97,10,0.14), 0 8px 32px rgba(0,0,0,0.6)';
        if (!isFavorited) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,97,10,0.5)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = isFavorited
          ? '0 0 20px rgba(255,97,10,0.1), 0 4px 24px rgba(0,0,0,0.5)'
          : '0 4px 24px rgba(0,0,0,0.5)';
        if (!isFavorited) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,97,10,0.2)';
      }}
    >
      {/* Row 1: thumbnail + [title / tags] + fav icon */}
      <div className="flex items-start gap-3">

        {/* 16:9 thumbnail */}
        <div
          className="flex-shrink-0 relative overflow-hidden rounded-lg"
          style={{
            width: 156,
            aspectRatio: '16 / 9',
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

        {/* Title + tags stacked */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <h3
            className="font-sans font-bold leading-snug"
            style={{
              fontSize: 14,
              color: 'var(--card-foreground)',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          >
            {title}
          </h3>
          <div className="flex flex-wrap gap-1">
            {app.tags.map(tag => (
              <span key={tag} className="font-mono text-[9px] uppercase px-1.5 py-px rounded-sm" style={{
                letterSpacing: '0.08em',
                background: tag === 'dapp' ? 'rgba(167,139,250,0.1)' : 'rgba(255,97,10,0.08)',
                border: `1px solid ${tag === 'dapp' ? 'rgba(167,139,250,0.3)' : 'rgba(255,97,10,0.2)'}`,
                color: tag === 'dapp' ? '#a78bfa' : '#ff610a',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Row 2: description — full width */}
      {description && (
        <p style={{
          fontSize: 12,
          color: 'var(--muted-foreground)',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
          lineHeight: 1.55,
        }}>
          {description}
        </p>
      )}

      {/* Row 3: domain + inline link arrow + planet fav bottom-right */}
      <div className="flex items-center gap-1 mt-auto" style={{ color: '#ff610a' }}>
        <span className="font-mono text-[11px]" style={{ letterSpacing: '0.02em' }}>{domain}</span>
        <svg
          width="10" height="10" viewBox="0 0 12 12" fill="none"
          className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        >
          <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {showFavorite && (
          <Tooltip label={isFavorited ? 'Remove from favourites' : 'Add to favourites'} className="ml-auto">
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(app.url); }}
              disabled={isPending}
              className="flex items-center justify-center transition-all duration-150 cursor-pointer hover:scale-110"
              style={{
                opacity: isPending ? 0.5 : 1,
                color: isFavorited ? '#ff610a' : 'var(--muted-foreground)',
                background: 'transparent',
                border: 'none',
                padding: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff610a'; }}
              onMouseLeave={e => { if (!isFavorited) (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; }}
            >
              {isPending ? (
                <svg width="28" height="28" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 16" strokeLinecap="round"/>
                </svg>
              ) : (
                <PlanetIcon size={28} />
              )}
            </button>
          </Tooltip>
        )}
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

  const account = useCurrentAccount();
  const isConnected = !!account;
  const favoritesEnabled = isConnected && !!FAVORITES_PACKAGE_ID;

  const { favorites, pendingUrls, addFavorite, removeFavorite } = useFavorites();

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

  // Reset favourites filter if user disconnects
  useEffect(() => {
    if (!isConnected && activeFilter === 'favourites') setActiveFilter('all');
  }, [isConnected, activeFilter]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    apps.forEach(a => a.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [apps]);

  const filtered = useMemo(() => {
    const searchTerm = query.toLowerCase();
    return apps.filter(app => {
      const og = ogMap[app.url];
      const matchesFilter =
        activeFilter === 'all' ? true :
        activeFilter === 'favourites' ? favorites.includes(app.url) :
        app.tags.includes(activeFilter);
      const matchesSearch = !searchTerm ||
        (og?.title ?? titleFromDomain(app.url)).toLowerCase().includes(searchTerm) ||
        (og?.description ?? '').toLowerCase().includes(searchTerm) ||
        getDomain(app.url).includes(searchTerm) ||
        app.tags.some(tag => tag.includes(searchTerm));
      return matchesFilter && matchesSearch;
    });
  }, [apps, ogMap, query, activeFilter, favorites]);

  // When viewing 'all': group into favourites → dapps → rest.
  // Any other filter: single flat section with no label.
  const sections = useMemo(() => {
    if (activeFilter !== 'all') {
      return [{ label: null as string | null, apps: filtered }];
    }
    const favSet = new Set(favorites);
    const favApps    = favoritesEnabled ? filtered.filter(a => favSet.has(a.url)) : [];
    const dappApps   = filtered.filter(a => !favSet.has(a.url) && a.tags.includes('dapp'));
    const restApps   = filtered.filter(a => !favSet.has(a.url) && !a.tags.includes('dapp'));
    const result: { label: string | null; apps: AppEntry[] }[] = [];
    if (favApps.length > 0)  result.push({ label: '// your favourites', apps: favApps });
    if (dappApps.length > 0) result.push({ label: '// dapps',           apps: dappApps });
    if (restApps.length > 0) result.push({ label: '// all',               apps: restApps });
    return result;
  }, [filtered, favorites, favoritesEnabled, activeFilter]);

  function handleToggleFavorite(url: string) {
    if (favorites.includes(url)) {
      removeFavorite(url);
    } else {
      addFavorite(url);
    }
  }

  const filterTabs = [
    'all',
    ...(favoritesEnabled ? ['favourites'] : []),
    ...allTags,
  ];

  return (
    <div className="directory-page dark">
      <div className="relative z-10">
        <Header />

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
            {filterTabs.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {filterTabs.map(f => (
                  <button key={f} onClick={() => setActiveFilter(f)}
                    className="font-mono text-[11px] uppercase px-2.5 py-1 rounded-sm transition-all duration-150 cursor-pointer"
                    style={{
                      letterSpacing: '0.06em',
                      background: activeFilter === f ? 'rgba(255,97,10,0.1)' : 'transparent',
                      border: `1px solid ${activeFilter === f ? '#ff610a' : 'var(--border)'}`,
                      color: activeFilter === f ? '#ff610a' : 'var(--muted-foreground)',
                    }}>
                    {f === 'favourites' ? <><PlanetIcon size={12} /> favourites</> : f}
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
                <p className="font-mono text-[11px]" style={{ letterSpacing: '0.06em' }}>
                  {activeFilter === 'favourites'
                    ? 'NO FAVOURITES YET // click the ♥ on any app'
                    : `NO APPS FOUND // ${query}`}
                </p>
              </div>
            )}

            {!loading && !error && sections.map((section, i) => (
              <div key={i} className={i > 0 ? 'mt-7' : ''}>
                {section.label && (
                  <div className="font-mono text-[11px] mb-3" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
                    {section.label}
                  </div>
                )}
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
                  {section.apps.map(app => (
                    <AppCard
                      key={app.url}
                      app={app}
                      og={ogMap[app.url]}
                      isFavorited={favorites.includes(app.url)}
                      isPending={pendingUrls.has(app.url)}
                      showFavorite={favoritesEnabled}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
}
