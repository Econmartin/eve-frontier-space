import { useState, useCallback, useEffect } from 'react';
import { MarkdownRenderer } from '@/components/content/MarkdownRenderer';
import { PageTypeBadge } from '@/components/content/PageTypeBadge';
import { TaskBox } from '@/components/content/TaskBox';
import { BonusBox } from '@/components/content/BonusBox';
import { HintPanel } from '@/components/content/HintPanel';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { Terminal } from '@/components/editor/Terminal';
import { MoveSimulator, type TerminalLine } from '@/lib/simulator';
import { useCourse } from '@/hooks/useCourse';
import { useExecutor } from '@/hooks/useExecutor';
import { pageKey } from '@/hooks/useProgress';
import { useTour } from '@/hooks/useTour';
import type { TaskPage } from '@/lib/types';

interface TaskViewProps {
  page: TaskPage;
}

export function TaskView({ page }: TaskViewProps) {
  const { pos, lessonCode, completed, setCode } = useCourse();
  const { runCode, mode: executorMode } = useExecutor();
  useTour();

  const pKey = pageKey(pos.m, pos.l, pos.p);
  const isCompleted = !!completed[pKey];

  const currentCode = lessonCode[pKey] ?? page.starterCode;

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>(() =>
    isCompleted ? MoveSimulator.formatOutput(page.successOutput) : [],
  );
  const [terminalSuccess, setTerminalSuccess] = useState<boolean | undefined>(
    isCompleted ? true : undefined,
  );
  const [running, setRunning] = useState(false);

  // Clear terminal when page is reset (isCompleted becomes false)
  useEffect(() => {
    if (!isCompleted) {
      setTerminalLines([]);
      setTerminalSuccess(undefined);
    }
  }, [isCompleted]);

  const handleChange = useCallback(
    (value: string) => {
      setCode(value);
    },
    [setCode],
  );

  const handleRun = useCallback(async () => {
    setRunning(true);
    setTerminalLines([{ type: 'prompt', text: '$ sui move build' }, { type: 'info', text: 'Compiling…' }]);
    setTerminalSuccess(undefined);

    // Yield to let React paint the "Compiling…" state before doing real work
    await new Promise((r) => setTimeout(r, 0));

    const code = lessonCode[pKey] ?? page.starterCode;
    const result = await runCode(code);
    setRunning(false);

    if (result.success) {
      setTerminalLines(MoveSimulator.formatOutput(page.successOutput));
      setTerminalSuccess(true);
    } else {
      setTerminalLines(MoveSimulator.formatError(result.error || 'Unknown error'));
      setTerminalSuccess(false);
    }
  }, [runCode, lessonCode, pKey, page]);

  return (
    <div className="flex-1 flex flex-row overflow-hidden min-w-0 h-full max-md:flex-col">
      {/* Content panel */}
      <div className="flex-1 overflow-y-auto px-9 py-8 flex flex-col gap-6 min-w-0 max-md:px-4 max-md:py-5">
        <div className="flex items-center gap-3 shrink-0 animate-fade-in">
          <PageTypeBadge type="TASK" />
          <h2 className="text-xl font-bold text-text leading-tight">{page.title}</h2>
        </div>

        <div className="animate-fade-in">
          <MarkdownRenderer content={page.content} />
        </div>

        <TaskBox task={page.task} />

        {page.bonus && <BonusBox bonus={page.bonus} />}

        {page.hint && <HintPanel hint={page.hint} />}
      </div>

      {/* Code panel: min 50% width; editor 66% height, terminal 33% below */}
      <div className="flex-[0_0_50%] min-w-0 flex flex-col border-l border-border overflow-hidden max-md:flex-[0_0_auto] max-md:w-full max-md:min-h-[360px] max-md:border-l-0 max-md:border-t max-md:border-border">
        <div className="flex-[2] flex flex-col min-h-0 overflow-hidden">
          <CodeEditor
            key={pKey}
            value={currentCode}
            onChange={handleChange}
            onRun={handleRun}
          />
        </div>
        <Terminal lines={terminalLines} isSuccess={terminalSuccess} executorMode={executorMode} />

        {/* Run button */}
        <div className="px-3 py-2 bg-panel border-t border-border flex justify-end shrink-0">
          <button
            id="tour-run-button"
            type="button"
            onClick={handleRun}
            disabled={running}
            className="font-mono text-xs font-semibold tracking-wider px-4 py-[7px] rounded-md border cursor-pointer transition-all whitespace-nowrap leading-none outline-none bg-cyan/10 border-cyan-dim text-cyan hover:bg-cyan/[0.18] hover:border-cyan hover:shadow-[0_0_12px_rgba(0,212,255,0.25)] active:scale-[0.97] disabled:opacity-50"
          >
            {running ? '⏳ Compiling…' : '▶ Run Code'}
          </button>
        </div>
      </div>
    </div>
  );
}
