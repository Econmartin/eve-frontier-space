import { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface HintPanelProps {
  hint: string;
}

export function HintPanel({ hint }: HintPanelProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <button
        onClick={() => setVisible(!visible)}
        className="self-start font-mono text-[11px] tracking-wider text-text-muted bg-transparent border border-border rounded-md px-3.5 py-1.5 cursor-pointer transition-all hover:text-cyan hover:border-cyan-dim hover:bg-cyan-glow"
        aria-expanded={visible}
      >
        💡 {visible ? 'Hide Hint' : 'Show Hint'}
      </button>

      {visible && (
        <div className="bg-panel-raised border border-border-glow rounded-md p-3.5 text-[13px] text-[#94a3b8] leading-relaxed">
          <MarkdownRenderer content={hint} />
        </div>
      )}
    </>
  );
}
