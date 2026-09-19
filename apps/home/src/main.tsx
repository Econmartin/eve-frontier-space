import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { HomePage, StationCreatorPage } from '@/components/pages';
import './index.css';

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/station-creator', element: <StationCreatorPage /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
