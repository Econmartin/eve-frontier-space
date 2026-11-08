/**
 * Status page for /status. Routes: / overview, /chain, /history, /history/:id (one component; ?range=1h|6h|24h|7d|90d), /api.
 * Data comes from the status Worker's public API under /status/api/v1 (see ../worker).
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { Layout } from './components/Layout.tsx';
import { TimeProvider } from './lib.tsx';
import { ApiDocsPage } from './pages/ApiDocs.tsx';
import { ChainPage } from './pages/Chain.tsx';
import { ComponentPage } from './pages/Component.tsx';
import { HistoryPage } from './pages/History.tsx';
import { OverviewPage } from './pages/Overview.tsx';
import './index.css';

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: '/', element: <OverviewPage /> },
        { path: '/chain', element: <ChainPage /> },
        { path: '/history', element: <HistoryPage /> },
        { path: '/history/:id', element: <ComponentPage /> },
        { path: '/api', element: <ApiDocsPage /> },
        { path: '*', element: <p className="text-sm">Not found. <a className="underline" href="/status">Back to the status overview</a>.</p> },
      ],
    },
  ],
  { basename: '/status' },
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TimeProvider>
      <RouterProvider router={router} />
    </TimeProvider>
  </React.StrictMode>,
);
