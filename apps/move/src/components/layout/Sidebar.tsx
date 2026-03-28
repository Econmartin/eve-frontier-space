import { useState, useEffect } from 'react';
import { useCourse } from '@/hooks/useCourse';
import { pageKey } from '@/hooks/useProgress';

export function Sidebar() {
  const { course, pos, navigateTo, isLessonCompleted, completed, resetPage, resetCourse } = useCourse();
  const [confirmReset, setConfirmReset] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(
    () => new Set([pos.m]),
  );

  // Auto-expand the current module when navigating across modules
  useEffect(() => {
    setExpandedModules((prev) => {
      if (prev.has(pos.m)) return prev;
      const next = new Set(prev);
      next.add(pos.m);
      return next;
    });
  }, [pos.m]);

  const toggleModule = (mIdx: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mIdx)) next.delete(mIdx);
      else next.add(mIdx);
      return next;
    });
  };

  return (
    <nav
      className="h-full bg-panel border-r border-border flex flex-col"
      aria-label="Course navigation"
    >
      <div className="py-2 flex flex-col flex-1 min-h-0 overflow-y-auto">
        {course.modules.map((mod, mIdx) => {
          const isExpanded = expandedModules.has(mIdx);
          const isActiveModule = mIdx === pos.m;

          return (
            <div key={mod.id}>
              {/* Module header */}
              <button
                onClick={() => toggleModule(mIdx)}
                className={`w-full flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors text-left border-l-2 ${
                  isActiveModule
                    ? 'border-l-cyan bg-cyan-glow/40 hover:bg-cyan-glow/60'
                    : 'border-l-transparent hover:bg-white/[0.03]'
                }`}
              >
                <span
                  className="w-4 h-4 shrink-0 inline-block"
                  style={{
                    maskImage: `url(${import.meta.env.BASE_URL + mod.icon})`,
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    backgroundColor: isActiveModule ? 'var(--color-cyan)' : 'var(--color-icon-dim)',
                  }}
                />
                <span className={`text-[10px] font-bold uppercase tracking-[0.09em] flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${
                  isActiveModule ? 'text-cyan' : 'text-text-muted'
                }`}>
                  {mod.title}
                </span>
                <span
                  className={`text-[11px] shrink-0 transition-transform duration-200 leading-none ${
                    isExpanded ? 'rotate-90' : ''
                  } ${isActiveModule ? 'text-cyan' : 'text-text-muted'}`}
                >
                  ›
                </span>
              </button>

              {/* Lessons list */}
              <div
                className={`overflow-hidden transition-[max-height] duration-250 ease-in-out ${
                  isExpanded ? 'max-h-[2000px]' : 'max-h-0'
                }`}
              >
                {mod.lessons.map((lesson, lIdx) => {
                  const isActiveLesson = mIdx === pos.m && lIdx === pos.l;
                  const lessonCompleted = isLessonCompleted(mIdx, lIdx);

                  return (
                    <div key={lesson.id}>
                      {/* Lesson header */}
                      <button
                        onClick={() => navigateTo(mIdx, lIdx, 0)}
                        className={`w-full flex items-center gap-2 py-[7px] pl-9 pr-3 cursor-pointer border-l-2 transition-colors text-left ${
                          isActiveLesson
                            ? 'border-l-cyan bg-cyan-glow'
                            : 'border-l-transparent hover:bg-white/[0.04]'
                        }`}
                      >
                        <span
                          className={`text-xs shrink-0 leading-none w-3.5 text-center ${
                            lessonCompleted ? 'text-green' : 'text-text-dim'
                          }`}
                        >
                          {lessonCompleted ? '✓' : '○'}
                        </span>
                        <span
                          className={`text-xs leading-relaxed transition-colors ${
                            isActiveLesson ? 'text-cyan' : 'text-text'
                          }`}
                        >
                          {lesson.id} {lesson.title}
                        </span>
                      </button>

                      {/* Pages (shown when this lesson is active) */}
                      {isActiveLesson && (
                        <div className="overflow-hidden">
                          {lesson.pages.map((page, pIdx) => {
                            const isActivePage = pIdx === pos.p;
                            const pageDone = !!completed[pageKey(mIdx, lIdx, pIdx)];

                            return (
                              <button
                                key={pIdx}
                                onClick={() => navigateTo(mIdx, lIdx, pIdx)}
                                className={`w-full flex items-center gap-2 py-[5px] pl-[52px] pr-3 cursor-pointer transition-colors text-left ${
                                  isActivePage
                                    ? 'bg-cyan-glow/50'
                                    : 'hover:bg-white/[0.02]'
                                }`}
                              >
                                <span
                                  className={`text-[10px] shrink-0 leading-none w-3 text-center ${
                                    pageDone ? 'text-green' : 'text-text-dim'
                                  }`}
                                >
                                  {pageDone ? '✓' : '·'}
                                </span>
                                <span
                                  className={`text-[11px] leading-relaxed ${
                                    isActivePage ? 'text-cyan' : 'text-text-muted'
                                  }`}
                                >
                                  {page.title}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset page & course */}
      <div className="shrink-0 pt-4 pb-3 px-3 border-t border-border flex flex-col gap-2">
        <button
          onClick={resetPage}
          className="w-full font-mono text-[10px] font-semibold tracking-wider px-2 py-1.5 rounded border border-border text-text-muted hover:border-amber/50 hover:text-amber transition-colors text-left"
          title="Reset this page: clear code and completion"
        >
          Reset page
        </button>
        {confirmReset ? (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-text-muted">Reset all progress?</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  resetCourse();
                  setConfirmReset(false);
                }}
                className="flex-1 font-mono text-[10px] font-semibold px-2 py-1.5 rounded border border-amber/50 text-amber hover:bg-amber/10 transition-colors"
              >
                Yes, reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 font-mono text-[10px] font-semibold px-2 py-1.5 rounded border border-border text-text-muted hover:bg-white/[0.04] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full font-mono text-[10px] font-semibold tracking-wider px-2 py-1.5 rounded border border-border text-text-muted hover:border-amber/50 hover:text-amber transition-colors text-left"
            title="Clear all progress and start over"
          >
            Reset entire course
          </button>
        )}
      </div>
    </nav>
  );
}
