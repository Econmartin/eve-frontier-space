import { useEffect } from 'react';
import { useCourse } from '@/hooks/useCourse';
import { LearnView } from './LearnView';
import { TaskView } from './TaskView';
import { ReviewView } from './ReviewView';
import type { TaskPage } from '@/lib/types';

export function LessonPage() {
  const { currentPage, pos, markCompleted } = useCourse();

  // Auto-mark LEARN and REVIEW pages as completed when visited
  useEffect(() => {
    if (currentPage.type === 'LEARN' || currentPage.type === 'REVIEW') {
      markCompleted();
    }
  }, [currentPage, markCompleted]);

  // Key forces a full remount when position changes (ensures editor resets)
  const posKey = `${pos.m}-${pos.l}-${pos.p}`;

  switch (currentPage.type) {
    case 'LEARN':
      return <LearnView key={posKey} page={currentPage} />;
    case 'TASK':
      return <TaskView key={posKey} page={currentPage as TaskPage} />;
    case 'REVIEW':
      return <ReviewView key={posKey} page={currentPage} />;
    default:
      return null;
  }
}
