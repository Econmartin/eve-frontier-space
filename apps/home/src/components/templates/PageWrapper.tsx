import type { ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div data-page-wrapper className="min-h-screen w-full bg-white font-sans p-4">
      <div className="relative mx-auto max-w-[1920px] rounded-4xl bg-neutral text-neutral-900 shadow-xl -mt-2">
        {children}
      </div>
    </div>
  );
}
