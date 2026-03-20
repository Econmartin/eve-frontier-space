import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { HomePage, DirectoryPage } from '@/components/pages';
import './index.css';

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/directory', element: <DirectoryPage /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
