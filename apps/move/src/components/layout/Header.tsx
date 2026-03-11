import { Link, useLocation } from 'react-router';
import { useCourse } from '@/hooks/useCourse';
import { HOME_APP_HREF } from '@/config';

export function Header() {
  const location = useLocation();
  const isCoursePage = location.pathname.startsWith('/learn');

  return (
    <header className="h-[52px] shrink-0 flex items-center px-4 bg-black/95 backdrop-blur-md border-b border-border gap-3 z-50 relative">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan/20 to-transparent pointer-events-none" />

      <a
        href={HOME_APP_HREF}
        className="shrink-0 flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
      >
        <img
          src={`${import.meta.env.BASE_URL}assets/eve_frontier_transparent.webp`}
          alt="EVE Frontier"
          className="h-7"
        />
        <span className="text-white text-[0.45rem] whitespace-nowrap font-mono tracking-widest">
          Community
        </span>
      </a>

      {isCoursePage ? <CourseBreadcrumb /> : <NavLinks />}

      {isCoursePage && <EngineBadge />}

      <Link
        to="/"
        className="shrink-0 rounded-lg px-4 py-1.5 text-xs font-semibold text-black bg-[var(--color-cyan)] hover:bg-[var(--color-cyan-dim)] transition-colors no-underline"
      >
        Learn Move
      </Link>
    </header>
  );
}

function NavLinks() {
  return (
    <nav className="flex-1 flex items-center justify-center gap-6">
      <Link
        to="/learn"
        className="text-xs font-medium text-text-muted hover:text-cyan transition-colors no-underline"
      >
        Start Learning
      </Link>
    </nav>
  );
}

function CourseBreadcrumb() {
  const { currentModule, currentLesson, currentPage } = useCourse();

  return (
    <nav
      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-text-muted min-w-0 overflow-hidden"
      aria-label="Current location"
    >
      <span className="text-cyan font-medium whitespace-nowrap overflow-hidden text-ellipsis">
        {currentModule.title}
      </span>
      <span className="text-text-dim shrink-0 select-none">›</span>
      <span className="text-text whitespace-nowrap overflow-hidden text-ellipsis">
        {currentLesson.title}
      </span>
      <span className="text-text-dim shrink-0 select-none">›</span>
      <span className="text-text-muted whitespace-nowrap overflow-hidden text-ellipsis">
        {currentPage.title}
      </span>
    </nav>
  );
}

function EngineBadge() {
  const { executorMode } = useCourse();
  const isReal = executorMode === 'real';

  return (
    <div
      className={`font-mono text-[10px] tracking-wider px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 transition-all duration-300 ${
        isReal
          ? 'text-cyan border-cyan-dim bg-cyan-glow shadow-[0_0_8px_var(--color-cyan-glow)]'
          : 'text-text-muted border-border bg-transparent'
      }`}
      title="Execution engine"
    >
      {isReal ? '⚡ Sui Compiler' : '◈ Simulator'}
    </div>
  );
}
