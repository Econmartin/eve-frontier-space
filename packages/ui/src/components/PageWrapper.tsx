import type { ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div data-page-wrapper className="min-h-screen w-full bg-white dark:bg-[#0a0a0a] font-sans p-4 transition-colors duration-300">
      <div className="relative mx-auto max-w-[1920px] rounded-b-4xl bg-neutral dark:bg-[#0a0a0a] text-neutral-900 dark:text-neutral-100 shadow-xl transition-colors duration-300">
        {children}
      </div>
    </div>
  );
}
