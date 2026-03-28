import type { ReactNode } from 'react';

interface PageWrapperProps {
  children: ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="bg-[#0a0a0a] p-4">
      <div className="relative mx-auto max-w-[1920px] rounded-b-4xl">
        {children}
      </div>
    </div>
  );
}
