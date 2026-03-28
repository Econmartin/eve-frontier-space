import { MarkdownRenderer } from '@/components/content/MarkdownRenderer';
import { PageTypeBadge } from '@/components/content/PageTypeBadge';
import type { LearnPage } from '@/lib/types';

interface LearnViewProps {
  page: LearnPage;
}

export function LearnView({ page }: LearnViewProps) {
  return (
    <div className="flex-1 overflow-y-auto px-9 py-8 flex flex-col gap-6 min-w-0 max-md:px-4 max-md:py-5">
      <div className="flex items-center gap-3 shrink-0 animate-fade-in">
        <PageTypeBadge type="LEARN" />
        <h2 className="text-xl font-bold text-text leading-tight">{page.title}</h2>
      </div>
      <div className="animate-fade-in">
        <MarkdownRenderer content={page.content} />
      </div>
    </div>
  );
}
