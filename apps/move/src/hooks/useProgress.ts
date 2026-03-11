import { useCallback } from 'react';
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

export function lessonKey(m: number, l: number): string {
  return `m${m}l${l}`;
}

export function pageKey(m: number, l: number, p: number): string {
  return `m${m}l${l}p${p}`;
}

export function useProgressActions() {
  const save = useCallback((data: ProgressData) => saveProgress(data), []);
  const load = useCallback(() => loadProgress(), []);
  return { save, load };
}
