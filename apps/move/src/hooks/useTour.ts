import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/styles/tour.css';
import { useCourse } from '@/hooks/useCourse';

const TOUR_KEY = 'move-tour-v1';

const STEPS = [
  {
    element: '#tour-sidebar',
    popover: {
      title: 'Your lesson map',
      description: 'All modules and lessons live here. Click any lesson to jump straight to it — progress is tracked automatically.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-code-editor',
    popover: {
      title: 'Write your code here',
      description: 'Type Move code in the editor. Syntax highlighting and hints update as you type. Press Ctrl+Enter to run.',
      side: 'left' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-run-button',
    popover: {
      title: 'Run your code',
      description: 'Compiles your solution against the real Sui Move compiler. Green output means you passed.',
      side: 'top' as const,
      align: 'end' as const,
    },
  },
  {
    element: '#tour-terminal',
    popover: {
      title: 'Output panel',
      description: 'Compilation results appear here — errors with line numbers, or a success message when you pass the task.',
      side: 'left' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-engine-badge',
    popover: {
      title: 'Sui Compiler',
      description: "When lit up in orange, your code runs through the actual WASM Sui Move compiler — no shortcuts, no simulator.",
      side: 'bottom' as const,
      align: 'end' as const,
    },
  },
  {
    element: '#tour-reset-page',
    popover: {
      title: 'Reset this page',
      description: 'Clears your code and completion for this task only — useful if you want a clean start without losing other progress.',
      side: 'top' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#tour-reset-course',
    popover: {
      title: 'Reset entire course',
      description: "Wipes all progress and saved code. You'll be asked to confirm before anything is deleted.",
      side: 'top' as const,
      align: 'start' as const,
    },
  },
];

export function useTour() {
  const { pos } = useCourse();

  useEffect(() => {
    // Only fire on module 0, lesson 0, page 2 — "Your First Module" (first TASK page)
    if (pos.m !== 0 || pos.l !== 0 || pos.p !== 2) return;
    if (localStorage.getItem(TOUR_KEY)) return;

    // Create driver inside the timeout so StrictMode double-invocation cleanup
    // only cancels the timer — not a partially-initialised driver instance.
    const id = setTimeout(() => {
      const tour = driver({
        popoverClass: 'tour-popover',
        showProgress: true,
        smoothScroll: true,
        overlayColor: 'rgba(0, 0, 0, 0.72)',
        stageRadius: 8,
        steps: STEPS,
        onDestroyed: () => {
          localStorage.setItem(TOUR_KEY, '1');
        },
      });
      tour.drive();
    }, 800);

    return () => clearTimeout(id);
  }, [pos.m, pos.l, pos.p]);
}
