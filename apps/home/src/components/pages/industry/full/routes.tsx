import { lazy } from 'react';
import { Navigate, useLocation, type RouteObject } from 'react-router';

// The full industry section (not in the repo). main.tsx picks this file up when it exists.
const ind = () => import('./index');
const MinePage = lazy(() => ind().then((m) => ({ default: m.MinePage })));
const MaterialPage = lazy(() => ind().then((m) => ({ default: m.MaterialPage })));
const MakePage = lazy(() => ind().then((m) => ({ default: m.MakePage })));
const BasePage = lazy(() => ind().then((m) => ({ default: m.BasePage })));
const PlanPage = lazy(() => ind().then((m) => ({ default: m.PlanPage })));
const GraphPage = lazy(() => ind().then((m) => ({ default: m.GraphPage })));
const BrowserPage = lazy(() => ind().then((m) => ({ default: m.BrowserPage })));
const ChangesPage = lazy(() => ind().then((m) => ({ default: m.ChangesPage })));
const OldPage = lazy(() => ind().then((m) => ({ default: m.OldPage })));
const TunePage = lazy(() => ind().then((m) => ({ default: m.TunePage })));

/** Redirect for renamed industry pages that keeps the query string (shared links carry the item in it). */
function Moved({ to }: { to: string }) { const { search } = useLocation(); return <Navigate to={`${to}${search}`} replace />; }

/** Everything except /industry/rocks, which main.tsx adds itself. */
export const fullIndustryRoutes: RouteObject[] = [
  // the pilot's journey
  { index: true, element: <MinePage /> },
  { path: 'materials', element: <MaterialPage /> },
  { path: 'make', element: <MakePage /> },
  { path: 'base', element: <BasePage /> },
  { path: 'plan', element: <PlanPage /> },
  // reference
  { path: 'graph', element: <GraphPage /> },
  { path: 'browse', element: <BrowserPage /> },
  { path: 'item/:id', element: <BrowserPage /> },
  { path: 'changes', element: <ChangesPage /> },
  { path: 'tune', element: <TunePage /> },
  // old materials from before 0.7.6.0: drop this tab next cycle
  { path: 'old', element: <OldPage /> },
  // old paths
  { path: 'planner', element: <Moved to="/industry/plan" /> },
  { path: 'refine', element: <Moved to="/industry" /> },
  { path: 'yield', element: <Moved to="/industry" /> },
  { path: 'facilities', element: <Moved to="/industry/base" /> },
];
