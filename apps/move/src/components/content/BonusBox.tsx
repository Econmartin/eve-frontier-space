import { MarkdownRenderer } from './MarkdownRenderer';

interface BonusBoxProps {
  bonus: string;
}

export function BonusBox({ bonus }: BonusBoxProps) {
  return (
    <div className="bg-amber/5 border border-amber/20 border-l-[3px] border-l-amber rounded-md p-4">
      <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-amber mb-2">
        ⭐ BONUS
      </div>
      <div className="text-sm text-text leading-relaxed">
        <MarkdownRenderer content={bonus} />
      </div>
    </div>
  );
}
