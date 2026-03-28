import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Navigate,
  Outlet,
} from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createDAppKit, DAppKitProvider } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { VaultProvider } from '@evefrontier/dapp-kit';
import { CourseProvider } from '@/hooks/useCourse';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/components/pages/HomePage';
import { CourseLayout } from '@/components/layout/CourseLayout';
import { LessonPage } from '@/components/pages/LessonPage';
import { CourseCompletePage } from '@/components/pages/CourseCompletePage';
import { Course2CompletePage } from '@/components/pages/Course2CompletePage';
import { ErrorPage } from '@/components/pages/ErrorPage';
import './index.css';

const dAppKit = createDAppKit({
  networks: ['testnet'],
  createClient() {
    return new SuiGrpcClient({
      network: 'testnet',
      baseUrl: 'https://fullnode.testnet.sui.io:443',
    });
  },
});

const queryClient = new QueryClient();

function App() {
  return (
    <CourseProvider>
      <Outlet />
    </CourseProvider>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<App />} errorElement={<ErrorPage />}>
      <Route path="/" element={<HomePage />} />
      <Route path="learn" element={<AppShell />}>
        <Route element={<CourseLayout />}>
          <Route index element={<LessonPage />} />
          <Route path=":moduleId/:lessonId/:pageIdx" element={<LessonPage />} />
        </Route>
        <Route path="complete" element={<CourseCompletePage />} />
        <Route path="complete2" element={<Course2CompletePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>,
  ),
  { basename: '/move' },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        <VaultProvider>
          <RouterProvider router={router} unstable_useTransitions={false} />
        </VaultProvider>
      </DAppKitProvider>
    </QueryClientProvider>
  </StrictMode>,
);
