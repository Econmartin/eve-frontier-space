import { useEffect } from 'react';
import { useCourse } from '@/hooks/useCourse';
import { LearnView } from './LearnView';
import { TaskView } from './TaskView';
import { ReviewView } from './ReviewView';
import type { TaskPage } from '@/lib/types';

export function LessonPage() {
  const { currentPage, markCompleted } = useCourse();

  // Auto-mark LEARN and REVIEW pages as completed when visited
  useEffect(() => {
    if (currentPage.type === 'LEARN' || currentPage.type === 'REVIEW') {
      markCompleted();
    }
  }, [currentPage, markCompleted]);

  switch (currentPage.type) {
    case 'LEARN':
      return <LearnView page={currentPage} />;
    case 'TASK':
      return <TaskView page={currentPage as TaskPage} />;
    case 'REVIEW':
      return <ReviewView page={currentPage} />;
    default:
      return null;
  }
}
