import { Outlet, useParams } from 'react-router';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { useCourse } from '@/hooks/useCourse';

export function CourseLayout() {
  const params = useParams();
  const { course, pos, navigateTo, savedPosition } = useCourse();

  // Sync URL params to course position
  useEffect(() => {
    if (params.moduleId && params.lessonId && params.pageIdx !== undefined) {
      const mIdx = course.modules.findIndex((m) => m.id === params.moduleId);
      if (mIdx < 0) return;
      const lIdx = course.modules[mIdx].lessons.findIndex(
        (l) => l.id === params.lessonId,
      );
      if (lIdx < 0) return;
      const pIdx = parseInt(params.pageIdx, 10);
      if (isNaN(pIdx)) return;

      if (mIdx !== pos.m || lIdx !== pos.l || pIdx !== pos.p) {
        navigateTo(mIdx, lIdx, pIdx);
      }
    } else {
      // No params — restore saved position
      const saved = savedPosition();
      if (saved.m !== pos.m || saved.l !== pos.l || saved.p !== pos.p) {
        navigateTo(saved.m, saved.l, saved.p);
      }
    }
  }, [params.moduleId, params.lessonId, params.pageIdx]);

  return (
    <div className="flex-1 grid grid-cols-[240px_1fr] overflow-hidden min-h-0 max-md:grid-cols-1">
      <div className="max-md:hidden overflow-hidden min-h-0">
        <Sidebar />
      </div>
      <div className="flex flex-col overflow-hidden min-w-0 min-h-0 flex-1">
        <div className="flex-1 min-h-0 overflow-auto">
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  );
}
