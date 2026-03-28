import { Link, useLocation } from 'react-router';
import { useCourse } from '@/hooks/useCourse';
import { AppHeader } from '@eve-frontier-space/ui';
import { HOME_APP_HREF } from '@/config';

export function Header() {
  const location = useLocation();
  const isCoursePage = location.pathname.startsWith('/learn');
  const isCompletePage = location.pathname === '/learn/complete' || location.pathname === '/learn/complete2';

  return (
    <AppHeader
      homeHref={HOME_APP_HREF}
      center={isCompletePage ? <CompletionTitle /> : isCoursePage ? <CourseBreadcrumb /> : <NavLinks />}
      right={isCoursePage && !isCompletePage ? <span className="max-md:hidden"><EngineBadge /></span> : undefined}
    />
  );
}

function CompletionTitle() {
  return (
    <span className="font-mono text-xs text-cyan tracking-wider">
      ◈ Learn Move — Complete
    </span>
  );
}

function NavLinks() {
  return (
    <nav className="flex items-center justify-center gap-6">
      <Link
        to="/learn"
        viewTransition
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
      className="flex items-center justify-center gap-1.5 text-xs text-text-muted min-w-0 overflow-hidden"
      aria-label="Current location"
    >
      <span className="max-md:hidden text-cyan font-medium whitespace-nowrap overflow-hidden text-ellipsis">
        {currentModule.title}
      </span>
      <span className="max-md:hidden text-text-dim shrink-0 select-none">›</span>
      <span className="max-md:hidden text-text whitespace-nowrap overflow-hidden text-ellipsis">
        {currentLesson.title}
      </span>
      <span className="max-md:hidden text-text-dim shrink-0 select-none">›</span>
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
      id="tour-engine-badge"
      className={`font-mono text-[10px] tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 transition-all duration-300 ${
        isReal
          ? 'text-cyan bg-cyan-glow shadow-[0_0_8px_var(--color-cyan-glow)]'
          : 'text-text-muted  bg-transparent'
      }`}
      title="Execution engine"
    >
      {isReal ? '⚡ Sui Compiler' : '◈ Simulator'}
    </div>
  );
}
