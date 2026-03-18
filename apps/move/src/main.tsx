import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Navigate,
} from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { CourseProvider } from '@/hooks/useCourse';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/components/pages/HomePage';
import { CourseLayout } from '@/components/layout/CourseLayout';
import { LessonPage } from '@/components/pages/LessonPage';
import './index.css';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<CourseProvider><AppShell /></CourseProvider>}>
      <Route path="/" element={<HomePage />} />
      <Route path="learn" element={<CourseLayout />}>
        <Route index element={<LessonPage />} />
        <Route path=":moduleId/:lessonId/:pageIdx" element={<LessonPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>,
  ),
  { basename: '/move' },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
