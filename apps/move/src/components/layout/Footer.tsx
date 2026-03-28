import { useNavigate } from 'react-router';
import { useCourse } from '@/hooks/useCourse';
import { pageKey, saveCourse1CompletionDate, saveCourse2CompletionDate } from '@/hooks/useProgress';

export function Footer() {
  const {
    pos,
    currentLesson,
    completed,
    isLastPage,
    isFirstPage,
    isCourse1End,
    isCourse1Completed,
    isCourse2Completed,
    nextPage,
    prevPage,
    navigateTo,
    currentPage,
  } = useCourse();
  const navigate = useNavigate();

  const isTaskCompleted = currentPage.type === 'TASK'
    ? !!completed[pageKey(pos.m, pos.l, pos.p)]
    : true;

  const canAdvance = currentPage.type !== 'TASK' || isTaskCompleted;

  const nextLabel = isLastPage && canAdvance
    ? '🏁 Course Complete!'
    : pos.p === currentLesson.pages.length - 1 && !isLastPage && canAdvance
      ? 'Next Lesson →'
      : 'Continue →';

  return (
    <footer className="h-14 shrink-0 flex items-center px-4 gap-3 bg-panel border-t border-border z-50">
      <button
        onClick={prevPage}
        disabled={isFirstPage}
        className="font-mono text-xs font-semibold tracking-wider px-4 py-[7px] rounded-md border border-border text-text-muted cursor-pointer transition-all whitespace-nowrap leading-none outline-none disabled:opacity-35 disabled:cursor-not-allowed disabled:pointer-events-none hover:enabled:border-cyan-dim hover:enabled:text-cyan"
        aria-label="Previous page"
      >
        ← Prev
      </button>

      {/* Page dots */}
      <div className="flex-1 flex items-center justify-center gap-2">
          {currentLesson.pages.map((pg, pIdx) => {
            const isActive = pIdx === pos.p;
            const isDone = !!completed[pageKey(pos.m, pos.l, pIdx)];

            return (
              <button
                key={pIdx}
                onClick={() => navigateTo(pos.m, pos.l, pIdx)}
                title={pg.title}
                aria-label={pg.title}
                className={`w-2.5 h-2.5 rounded-full border cursor-pointer transition-all appearance-none p-0 outline-none shrink-0 ${
                  isActive
                    ? 'bg-cyan border-cyan shadow-[0_0_8px_rgba(0,212,255,0.5)] scale-120'
                    : isDone
                      ? 'bg-green border-green'
                      : 'bg-text-dim border-border hover:bg-text-muted hover:scale-120'
                }`}
              />
            );
          })}
      </div>

      {isCourse1End && canAdvance && isCourse1Completed ? (
        <button
          onClick={() => { saveCourse1CompletionDate(); navigate('/learn/complete'); }}
          className="font-mono text-xs font-semibold tracking-wider px-4 py-[7px] rounded-md border cursor-pointer transition-all whitespace-nowrap leading-none outline-none bg-cyan-glow border-cyan/40 text-cyan hover:bg-cyan/15 hover:border-cyan hover:shadow-[0_0_12px_var(--color-cyan-glow)]"
          aria-label="Complete Course 1"
        >
          Complete Course 1 →
        </button>
      ) : isLastPage && canAdvance && isCourse2Completed ? (
        <button
          onClick={() => { saveCourse2CompletionDate(); navigate('/learn/complete2'); }}
          className="font-mono text-xs font-semibold tracking-wider px-4 py-[7px] rounded-md border cursor-pointer transition-all whitespace-nowrap leading-none outline-none bg-cyan-glow border-cyan/40 text-cyan hover:bg-cyan/15 hover:border-cyan hover:shadow-[0_0_12px_var(--color-cyan-glow)]"
          aria-label="Complete Course 2"
        >
          Complete Course 2 →
        </button>
      ) : (
        <button
          onClick={nextPage}
          disabled={!canAdvance || isLastPage}
          className={`font-mono text-xs font-semibold tracking-wider px-4 py-[7px] rounded-md border cursor-pointer transition-all whitespace-nowrap leading-none outline-none disabled:opacity-35 disabled:cursor-not-allowed disabled:pointer-events-none ${
            canAdvance && !isLastPage
              ? 'bg-green/8 border-green/50 text-green hover:bg-green/14 hover:border-green hover:shadow-[0_0_12px_rgba(34,197,94,0.2)]'
              : 'bg-transparent border-border text-text-muted'
          }`}
          aria-label="Next page"
        >
          {nextLabel}
        </button>
      )}
    </footer>
  );
}
