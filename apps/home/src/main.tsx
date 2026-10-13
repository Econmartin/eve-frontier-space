import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import { HomePage, StationCreatorPage } from '@/components/pages';
import { INDUSTRY_FULL } from '@/config';
import './index.css';

const IndustryShell = lazy(() => import('@/components/pages/industry').then((m) => ({ default: m.IndustryShell })));
// My rocks pulls in three.js, so it gets its own chunk
const RocksPage = lazy(() => import('@/components/pages/industry/RocksPage').then((m) => ({ default: m.RocksPage })));
const RockSharePage = lazy(() => import('@/components/pages/industry/RockSharePage').then((m) => ({ default: m.RockSharePage })));
// The rest of the industry section is not in the repo; when the folder is present (and INDUSTRY_FULL), its routes are added.
const fullIndustry = import.meta.glob('./components/pages/industry/full/routes.tsx', { eager: true }) as Record<string, { fullIndustryRoutes: RouteObject[] }>;
const fullIndustryRoutes = INDUSTRY_FULL ? Object.values(fullIndustry)[0]?.fullIndustryRoutes : undefined;

const fallback = <div className="min-h-screen bg-white dark:bg-[#0a0a0a]" />;

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/station-creator', element: <StationCreatorPage /> },
  // a shared rock (Open Graph tags are added by the worker)
  { path: '/rocks/:id', element: <Suspense fallback={fallback}><RockSharePage /></Suspense> },
  {
    path: '/industry',
    element: <Suspense fallback={fallback}><IndustryShell /></Suspense>,
    children: fullIndustryRoutes ? [
      { path: 'rocks', element: <RocksPage /> },
      ...fullIndustryRoutes,
    ] : [
      // staged release: only My rocks is public
      { path: 'rocks', element: <RocksPage /> },
      { path: '*', element: <Navigate to="/industry/rocks" replace /> },
      { index: true, element: <Navigate to="/industry/rocks" replace /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
