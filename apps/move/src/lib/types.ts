export interface Check {
  test: (code: string) => boolean;
  errorMsg: string;
}

export interface LearnPage {
  type: 'LEARN';
  title: string;
  content: string;
}

export interface TaskPage {
  type: 'TASK';
  title: string;
  content: string;
  task: string;
  hint: string;
  bonus: string | null;
  starterCode: string;
  checks: Check[];
  successOutput: string;
}

export interface ReviewPage {
  type: 'REVIEW';
  title: string;
  content: string;
}

export type Page = LearnPage | TaskPage | ReviewPage;

export interface Lesson {
  id: string;
  title: string;
  time: string;
  pages: Page[];
}

export interface Module {
  id: string;
  title: string;
  icon: string;
  lessons: Lesson[];
}

export interface Course {
  modules: Module[];
}

export interface CoursePosition {
  m: number;
  l: number;
  p: number;
}

export interface ValidationResult {
  success: boolean;
  error: string | null;
}

export type ExecutorMode = 'unknown' | 'real' | 'simulator';
