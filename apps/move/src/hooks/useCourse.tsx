import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { COURSE, COURSE_1_MODULE_COUNT } from '../../content/curriculum';
import { executor } from '@/lib/executor';
import {
  loadProgress,
  saveProgress,
  lessonKey,
  pageKey,
  type ProgressData,
} from './useProgress.ts';
import type {
  Course,
  CoursePosition,
  Module,
  Lesson,
  Page,
  ExecutorMode,
} from '@/lib/types';

interface CourseState {
  pos: CoursePosition;
  lessonCode: Record<string, string>;
  completed: Record<string, boolean>;
  executorMode: ExecutorMode;
}

type CourseAction =
  | { type: 'NAVIGATE'; pos: CoursePosition }
  | { type: 'SET_CODE'; key: string; code: string }
  | { type: 'MARK_COMPLETED'; key: string }
  | { type: 'SET_EXECUTOR_MODE'; mode: ExecutorMode }
  | { type: 'RESTORE'; data: ProgressData }
  | { type: 'RESET_PAGE' }
  | { type: 'RESET_COURSE' };

function clampPosition(pos: CoursePosition): CoursePosition {
  const modules = COURSE.modules;
  const m = Math.min(pos.m, modules.length - 1);
  const l = Math.min(pos.l, modules[m].lessons.length - 1);
  const p = Math.min(pos.p, modules[m].lessons[l].pages.length - 1);
  return { m, l, p };
}

function reducer(state: CourseState, action: CourseAction): CourseState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, pos: clampPosition(action.pos) };
    case 'SET_CODE':
      return {
        ...state,
        lessonCode: { ...state.lessonCode, [action.key]: action.code },
      };
    case 'MARK_COMPLETED':
      return {
        ...state,
        completed: { ...state.completed, [action.key]: true },
      };
    case 'SET_EXECUTOR_MODE':
      return { ...state, executorMode: action.mode };
    case 'RESTORE':
      return {
        ...state,
        pos: clampPosition(action.data.pos),
        lessonCode: action.data.lessonCode,
        completed: action.data.completed,
      };
    case 'RESET_PAGE': {
      const pKey = pageKey(state.pos.m, state.pos.l, state.pos.p);
      const newCompleted = { ...state.completed };
      delete newCompleted[pKey];
      const newLessonCode = { ...state.lessonCode };
      delete newLessonCode[pKey];
      return { ...state, completed: newCompleted, lessonCode: newLessonCode };
    }
    case 'RESET_COURSE':
      return {
        ...state,
        pos: { m: 0, l: 0, p: 0 },
        lessonCode: {},
        completed: {},
      };
    default:
      return state;
  }
}

interface CourseContextValue {
  course: Course;
  pos: CoursePosition;
  currentModule: Module;
  currentLesson: Lesson;
  currentPage: Page;
  lessonCode: Record<string, string>;
  completed: Record<string, boolean>;
  executorMode: ExecutorMode;
  navigateTo: (m: number, l: number, p: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setCode: (code: string) => void;
  markCompleted: () => void;
  resetPage: () => void;
  resetCourse: () => void;
  isLessonCompleted: (mIdx: number, lIdx: number) => boolean;
  isLastPage: boolean;
  isFirstPage: boolean;
  isCourse1End: boolean;
  isCourse1Completed: boolean;
  isCourse2Completed: boolean;
  savedPosition: () => CoursePosition;
}

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({ children }: { children: ReactNode }) {
  const course = COURSE;

  const [state, dispatch] = useReducer(reducer, {
    pos: { m: 0, l: 0, p: 0 },
    lessonCode: {},
    completed: {},
    executorMode: 'unknown',
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Restore progress on mount
  useEffect(() => {
    const data = loadProgress();
    dispatch({ type: 'RESTORE', data });
    executor.prefetch();
  }, []);

  // Persist progress on state changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProgress({
        pos: state.pos,
        lessonCode: state.lessonCode,
        completed: state.completed,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [state.pos, state.lessonCode, state.completed]);

  // Poll executor mode
  useEffect(() => {
    const interval = setInterval(() => {
      const m = executor.currentMode();
      if (m !== stateRef.current.executorMode) {
        dispatch({ type: 'SET_EXECUTOR_MODE', mode: m });
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const { m, l, p } = state.pos;
  const currentModule = course.modules[m];
  const currentLesson = currentModule.lessons[l];
  const currentPage = currentLesson.pages[p];

  const navigateTo = useCallback(
    (nm: number, nl: number, np: number) => {
      dispatch({ type: 'NAVIGATE', pos: { m: nm, l: nl, p: np } });
    },
    [],
  );

  const nextPage = useCallback(() => {
    const { m, l, p } = stateRef.current.pos;
    const modules = course.modules;
    const lesson = modules[m].lessons[l];

    if (p < lesson.pages.length - 1) {
      navigateTo(m, l, p + 1);
    } else if (l < modules[m].lessons.length - 1) {
      navigateTo(m, l + 1, 0);
    } else if (m < modules.length - 1) {
      navigateTo(m + 1, 0, 0);
    }
  }, [course.modules, navigateTo]);

  const prevPage = useCallback(() => {
    const { m, l, p } = stateRef.current.pos;
    const modules = course.modules;

    if (p > 0) {
      navigateTo(m, l, p - 1);
    } else if (l > 0) {
      const prevLesson = modules[m].lessons[l - 1];
      navigateTo(m, l - 1, prevLesson.pages.length - 1);
    } else if (m > 0) {
      const prevMod = modules[m - 1];
      const prevLesson = prevMod.lessons[prevMod.lessons.length - 1];
      navigateTo(m - 1, prevMod.lessons.length - 1, prevLesson.pages.length - 1);
    }
  }, [course.modules, navigateTo]);

  const setCode = useCallback((code: string) => {
    const s = stateRef.current;
    const key = pageKey(s.pos.m, s.pos.l, s.pos.p);
    dispatch({ type: 'SET_CODE', key, code });
  }, []);

  const markCompleted = useCallback(() => {
    const s = stateRef.current;
    const key = pageKey(s.pos.m, s.pos.l, s.pos.p);
    dispatch({ type: 'MARK_COMPLETED', key });
  }, []);

  const resetPage = useCallback(() => {
    dispatch({ type: 'RESET_PAGE' });
  }, []);

  const resetCourse = useCallback(() => {
    dispatch({ type: 'RESET_COURSE' });
  }, []);

  const isLessonCompleted = useCallback(
    (mIdx: number, lIdx: number): boolean => {
      const lesson = course.modules[mIdx].lessons[lIdx];
      const taskIndices = lesson.pages
        .map((pg, i) => (pg.type === 'TASK' ? i : -1))
        .filter((i) => i >= 0);

      if (taskIndices.length === 0) {
        return !!state.completed[pageKey(mIdx, lIdx, lesson.pages.length - 1)];
      }
      return taskIndices.every((pIdx) => !!state.completed[pageKey(mIdx, lIdx, pIdx)]);
    },
    [course.modules, state.completed],
  );

  const lastM = course.modules.length - 1;
  const lastL = course.modules[lastM].lessons.length - 1;
  const lastP = course.modules[lastM].lessons[lastL].pages.length - 1;
  const isLastPage = m === lastM && l === lastL && p === lastP;
  const isFirstPage = m === 0 && l === 0 && p === 0;

  const c1LastM = COURSE_1_MODULE_COUNT - 1;
  const c1LastL = course.modules[c1LastM].lessons.length - 1;
  const c1LastP = course.modules[c1LastM].lessons[c1LastL].pages.length - 1;
  const isCourse1End = m === c1LastM && l === c1LastL && p === c1LastP;

  // Check every lesson in a course range is completed
  const isCourseFullyCompleted = (fromM: number, toM: number): boolean => {
    for (let mi = fromM; mi < toM; mi++) {
      const mod = course.modules[mi];
      for (let li = 0; li < mod.lessons.length; li++) {
        const lesson = mod.lessons[li];
        const taskIndices = lesson.pages
          .map((pg, i) => (pg.type === 'TASK' ? i : -1))
          .filter((i) => i >= 0);
        if (taskIndices.length === 0) {
          if (!state.completed[pageKey(mi, li, lesson.pages.length - 1)]) return false;
        } else {
          if (!taskIndices.every((pi) => state.completed[pageKey(mi, li, pi)])) return false;
        }
      }
    }
    return true;
  };

  const isCourse1Completed = isCourseFullyCompleted(0, COURSE_1_MODULE_COUNT);
  const isCourse2Completed = isCourseFullyCompleted(COURSE_1_MODULE_COUNT, course.modules.length);

  const savedPosition = useCallback((): CoursePosition => {
    const data = loadProgress();
    return clampPosition(data.pos);
  }, []);

  const value: CourseContextValue = {
    course,
    pos: state.pos,
    currentModule,
    currentLesson,
    currentPage,
    lessonCode: state.lessonCode,
    completed: state.completed,
    executorMode: state.executorMode,
    navigateTo,
    nextPage,
    prevPage,
    setCode,
    markCompleted,
    resetPage,
    resetCourse,
    isLessonCompleted,
    isLastPage,
    isFirstPage,
    isCourse1End,
    isCourse1Completed,
    isCourse2Completed,
    savedPosition,
  };

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

export function useCourse(): CourseContextValue {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error('useCourse must be used within CourseProvider');
  return ctx;
}
