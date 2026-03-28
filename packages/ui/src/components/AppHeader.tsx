import { type ReactNode } from 'react';

interface AppHeaderProps {
  /** URL for the logo link. Defaults to "/" */
  homeHref?: string;
  /** false = transparent at top, becomes opaque pill on scroll (home page style) */
  scrolled?: boolean;
  center?: ReactNode;
  right?: ReactNode;
}

export function AppHeader({ homeHref = '/', scrolled = true, center, right }: AppHeaderProps) {
  return (
    <header
      className={`shrink-0 sticky z-50 flex items-center px-10 py-3 gap-4 transition-all duration-300 ${
        scrolled
          ? 'top-2 rounded-2xl bg-black/95 backdrop-blur-md'
          : 'top-4 bg-transparent'
      }`}
    >
      <a
        href={homeHref}
        className="shrink-0 flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
      >
        <img
          src={`${import.meta.env.BASE_URL}assets/eve_frontier_transparent-256w.webp`}
          alt="EVE Frontier"
          className="h-8 md:h-10"
        />
        <span className="text-white text-[0.5rem] whitespace-nowrap font-heading tracking-widest">
          Community
        </span>
      </a>

      <div className="flex-1 min-w-0 flex items-center justify-center">{center}</div>

      <div className="shrink-0 flex items-center gap-3">{right}</div>
    </header>
  );
}
