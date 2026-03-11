import { useCallback } from 'react';
import { executor } from '@/lib/executor';
import { useCourse } from './useCourse';
import type { TaskPage, ValidationResult } from '@/lib/types';

export function useExecutor() {
  const { currentPage, setCode, markCompleted } = useCourse();

  const validate = useCallback(
    async (code: string): Promise<ValidationResult> => {
      if (currentPage.type !== 'TASK') {
        return { success: false, error: 'Not a task page' };
      }
      return executor.validate(code, currentPage as TaskPage);
    },
    [currentPage],
  );

  const runCode = useCallback(
    async (code: string): Promise<ValidationResult> => {
      setCode(code);
      const result = await validate(code);
      if (result.success) {
        markCompleted();
      }
      return result;
    },
    [validate, setCode, markCompleted],
  );

  return {
    validate,
    runCode,
    mode: executor.currentMode(),
  };
}
