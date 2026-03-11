interface PageTypeBadgeProps {
  type: 'LEARN' | 'TASK' | 'REVIEW';
}

const styles: Record<string, string> = {
  LEARN: 'text-cyan border-cyan-dim bg-cyan-glow',
  TASK: 'text-green border-green/40 bg-green/[0.07]',
  REVIEW: 'text-[#c084fc] border-purple/40 bg-purple/[0.08]',
};

export function PageTypeBadge({ type }: PageTypeBadgeProps) {
  return (
    <span
      className={`font-mono text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-0.5 rounded-full border shrink-0 ${styles[type]}`}
    >
      {type}
    </span>
  );
}
