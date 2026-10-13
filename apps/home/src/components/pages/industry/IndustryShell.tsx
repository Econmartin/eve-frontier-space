import { NavLink, Outlet, useLocation } from 'react-router';
import { AppHeader } from '@eve-frontier-space/ui';
import { PageWrapper } from '@/components/templates/index.ts';
import { HeaderActions, Footer } from '@/components/organisms/index.ts';
import { availability, clientVersion } from '@/lib/industry';
import { INDUSTRY_FULL } from '@/config';
import { useEffect, useState } from 'react';
import { IndustrySettingsContext } from './parts';

export const INDUSTRY_HREF = '/industry';

/** The pilot's journey, in order, then reference views. */
const STEPS = [
  { to: '/industry', label: 'Mine', hint: 'what comes out of a rock', end: true },
  { to: '/industry/materials', label: 'Materials', hint: 'what a material becomes' },
  { to: '/industry/make', label: 'Make', hint: 'how a product is made' },
  { to: '/industry/base', label: 'Base', hint: 'what a building can build' },
  { to: '/industry/plan', label: 'Plan', hint: 'shopping list, or what your hold can make' },
];
const REFERENCE = [
  { to: '/industry/rocks', label: 'My rocks' },
  { to: '/industry/graph', label: 'Graph' },
  { to: '/industry/browse', label: 'Browse' },
  { to: '/industry/changes', label: 'Changes' },
];
const ALL = [...STEPS, ...REFERENCE];

function load<T>(key: string, fallback: T): T { try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; } }
function save(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } }

export function IndustryShell() {
  const { pathname } = useLocation();
  const [showUnavailable, setShowUnavailableState] = useState(() => load('industry.showUnavailable', false));
  const setShowUnavailable = (v: boolean) => { setShowUnavailableState(v); save('industry.showUnavailable', v); };

  useEffect(() => {
    const prev = document.title;
    const tab = ALL.find((t) => ('end' in t && t.end ? pathname === t.to : pathname.startsWith(t.to))) ?? (pathname.startsWith('/industry/item') ? REFERENCE[1] : undefined);
    document.title = `${tab ? `${tab.label} · ` : ''}Industry | EVE Frontier Community`;
    return () => { document.title = prev; };
  }, [pathname]);

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-xl px-3.5 py-2 text-xs font-semibold tracking-wide uppercase whitespace-nowrap no-underline transition-colors ${
      isActive ? 'bg-[var(--color-martian-500)] text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
    }`;
  const browseActive = pathname.startsWith('/industry/item');

  return (
    <IndustrySettingsContext.Provider value={{ showUnavailable, setShowUnavailable }}>
    <PageWrapper>
      <AppHeader right={<HeaderActions />} />
      <main className="px-4 sm:px-6 lg:px-8 pb-10">
        <header className="pt-8 pb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs tracking-[0.16em] uppercase text-muted-foreground mb-2">Tools</div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-[0.9]">Industry</h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground font-sans">
              {INDUSTRY_FULL
                ? 'From the rock you just scanned to the ship you want to build: what comes out of it, what it becomes, how things are made, what each building can do, and what a build will cost you. Extracted from the installed game.'
                : 'Paste your game log and see the asteroids you mined as the voxel bodies they were, then tell us which rock each one was. More of the industry tool is on its way.'}
            </p>
          </div>
          <div className="text-xs text-muted-foreground shrink-0">
            data: <span className="text-foreground">{clientVersion.replace(/version = |build = |codename = |branch = .*$/g, '').replace(/, $/, '')}</span>
          </div>
        </header>

        <nav className="sticky top-2 z-40 mb-6 -mx-1 overflow-x-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 mx-1">
            {INDUSTRY_FULL && <div className="inline-flex gap-0.5 rounded-2xl bg-black/95 dark:bg-white/5 backdrop-blur-md p-1">
              {STEPS.map((t, i) => (
                <NavLink key={t.to} to={t.to} end={t.end} className={tabClass} title={t.hint}>
                  <span className="opacity-50 mr-1.5 tabular-nums">{i + 1}</span>{t.label}
                </NavLink>
              ))}
            </div>}
            <div className="inline-flex gap-0.5 rounded-2xl bg-black/95 dark:bg-white/5 backdrop-blur-md p-1">
              {(INDUSTRY_FULL ? REFERENCE : REFERENCE.filter((t) => t.to === '/industry/rocks')).map((t) => (
                <NavLink key={t.to} to={t.to} className={({ isActive }) => tabClass({ isActive: isActive || (t.label === 'Browse' && browseActive) })}>{t.label}</NavLink>
              ))}
            </div>
          </div>
          {INDUSTRY_FULL && <label className="shrink-0 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none mx-1" title={`Recipes and facilities that exist in the client but not in game (${availability.cycle}) are hidden unless this is on.`}>
            <input type="checkbox" checked={showUnavailable} onChange={(e) => setShowUnavailable(e.target.checked)} className="accent-[var(--color-martian-500)]" />
            show not in game
          </label>}
        </nav>

        <Outlet />
      </main>
      <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><Footer /></div>
    </PageWrapper>
    </IndustrySettingsContext.Provider>
  );
}
