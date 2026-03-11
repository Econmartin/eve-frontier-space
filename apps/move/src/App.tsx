import { Routes, Route } from 'react-router';
import { CourseProvider } from '@/hooks/useCourse';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/components/pages/HomePage';
import { CourseLayout } from '@/components/layout/CourseLayout';
import { LessonPage } from '@/components/pages/LessonPage';

function RedirectToHome() {
  window.location.replace('/');
  return null;
}

export function App() {
  return (
    <CourseProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/learn" element={<CourseLayout />}>
            <Route index element={<LessonPage />} />
            <Route path=":moduleId/:lessonId/:pageIdx" element={<LessonPage />} />
          </Route>
        </Route>
        <Route path="*" element={<RedirectToHome />} />
      </Routes>
    </CourseProvider>
  );
}
