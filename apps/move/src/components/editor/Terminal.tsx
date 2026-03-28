import type { TerminalLine } from '@/lib/simulator';
import type { ExecutorMode } from '@/lib/types';

interface TerminalProps {
  lines: TerminalLine[];
  isSuccess?: boolean;
  executorMode?: ExecutorMode;
}

const typeStyles: Partial<Record<TerminalLine['type'], string>> = {
  prompt: 'text-[#475569]',
  success: 'text-green',
  error: 'text-red',
  'error-detail': 'text-red/70 pl-2',
  data: 'text-[#7dd3fc]',
  info: 'text-[#cbd5e1]',
  muted: 'text-text-muted italic',
};

export function Terminal({ lines, isSuccess, executorMode }: TerminalProps) {
  return (
    <div id="tour-terminal" className="flex-[1] flex flex-col min-h-[80px] overflow-hidden">
      <div className="font-mono text-xs font-semibold tracking-[0.09em] uppercase text-text-muted px-3.5 py-1.5 bg-panel border-b border-border shrink-0 flex items-center justify-between">
        <span>OUTPUT</span>
        {executorMode === 'simulator' && (
          <span className="text-amber text-[10px] normal-case tracking-normal font-normal">
            ⚠ Syntax-only mode (compiler unavailable)
          </span>
        )}
      </div>
      <div
        className={`flex-1 overflow-y-auto bg-[#020408] px-4 py-2.5 font-mono text-sm leading-relaxed text-[#cbd5e1] ${
          isSuccess === true
            ? 'border-t border-green/30'
            : isSuccess === false
              ? 'border-t border-red/30'
              : ''
        }`}
        role="log"
        aria-live="polite"
      >
        {lines.length === 0 ? (
          <div className="text-text-dim italic">
            // Press Run Code (or Ctrl+Enter) to check your solution
          </div>
        ) : (
          lines.map((line, i) =>
            line.type === 'blank' ? (
              <br key={i} />
            ) : (
              <div key={i} className={typeStyles[line.type] || ''}>
                {line.text}
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
