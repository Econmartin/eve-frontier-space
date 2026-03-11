import { MarkdownRenderer } from './MarkdownRenderer';

interface TaskBoxProps {
  task: string;
}

export function TaskBox({ task }: TaskBoxProps) {
  return (
    <div className="bg-green/5 border border-green/20 border-l-[3px] border-l-green rounded-md p-4">
      <div className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-green mb-2">
        📋 YOUR TASK
      </div>
      <div className="text-sm text-text leading-relaxed">
        <MarkdownRenderer content={task} />
      </div>
    </div>
  );
}
