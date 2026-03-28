import type { CoursePosition } from '@/lib/types';

const LS_KEY = 'move-learn-progress';

export interface ProgressData {
  pos: CoursePosition;
  lessonCode: Record<string, string>;
  completed: Record<string, boolean>;
}

const DEFAULT_PROGRESS: ProgressData = {
  pos: { m: 0, l: 0, p: 0 },
  lessonCode: {},
  completed: {},
};

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const saved = JSON.parse(raw);
    return {
      pos: saved.pos ?? { ...DEFAULT_PROGRESS.pos },
      lessonCode: saved.lessonCode ?? {},
      completed: saved.completed ?? {},
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(data: ProgressData): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // quota errors — silently ignore
  }
}

const COURSE1_COMPLETION_KEY = 'move-learn-course1-completed-at';

export function saveCourse1CompletionDate(): void {
  try {
    const date = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    localStorage.setItem(COURSE1_COMPLETION_KEY, date);
  } catch {}
}

export function loadCourse1CompletionDate(): string | null {
  try {
    return localStorage.getItem(COURSE1_COMPLETION_KEY);
  } catch {
    return null;
  }
}

const COURSE2_COMPLETION_KEY = 'move-learn-course2-completed-at';

export function saveCourse2CompletionDate(): void {
  try {
    const date = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    localStorage.setItem(COURSE2_COMPLETION_KEY, date);
  } catch {}
}

export function loadCourse2CompletionDate(): string | null {
  try {
    return localStorage.getItem(COURSE2_COMPLETION_KEY);
  } catch {
    return null;
  }
}

export function lessonKey(m: number, l: number): string {
  return `m${m}l${l}`;
}

export function pageKey(m: number, l: number, p: number): string {
  return `m${m}l${l}p${p}`;
}
