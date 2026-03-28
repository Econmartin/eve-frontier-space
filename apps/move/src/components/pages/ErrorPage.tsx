import { useRouteError, isRouteErrorResponse, Link } from 'react-router';

export function ErrorPage() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan/[0.03] rounded-full blur-[100px]" />
      </div>

      <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-cyan-dim mb-4 relative">
        {is404 ? '404' : 'Error'}
      </span>

      <h1 className="text-4xl font-bold text-text mb-3 relative">
        {is404 ? 'Page not found' : 'Something went wrong'}
      </h1>

      <p className="text-sm text-text-muted mb-8 max-w-sm leading-relaxed relative">
        {is404
          ? "This page doesn't exist. Head back to the course."
          : 'An unexpected error occurred. Try refreshing the page.'}
      </p>

      <Link
        to="/"
        className="font-mono text-sm font-semibold tracking-wider px-6 py-2.5 rounded-lg bg-cyan/10 border border-cyan-dim text-cyan hover:bg-cyan/20 hover:border-cyan hover:shadow-[0_0_16px_rgba(0,212,255,0.2)] transition-all no-underline relative"
      >
        ← Back to course
      </Link>
    </div>
  );
}
