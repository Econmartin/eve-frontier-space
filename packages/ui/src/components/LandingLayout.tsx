import { useState, useEffect, type ReactNode } from 'react';
import { AppHeader } from './AppHeader';

interface LandingLayoutProps {
  homeHref?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function LandingLayout({ homeHref = '/', headerRight, children, footer }: LandingLayoutProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <AppHeader homeHref={homeHref} scrolled={scrolled} right={headerRight} />
      {children}
      {footer}
    </>
  );
}
