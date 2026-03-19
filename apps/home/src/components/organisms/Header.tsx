import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { MOVE_APP_HREF } from '@/config';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';

const NAV_ITEMS: string[] = [];

function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggle } = useDarkMode();

  const martianFilter = 'brightness(0) saturate(100%) invert(43%) sepia(96%) saturate(2058%) hue-rotate(3deg) brightness(101%) contrast(106%)';

  return (
    <button
      onClick={toggle}
      className={`relative size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Moon — visible in dark mode */}
      <img
        src="/assets/moon.svg"
        alt=""
        className={`absolute size-5 transition-all duration-300 ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'
        }`}
        style={{ filter: martianFilter }}
      />
      {/* Sun — visible in light mode */}
      <img
        src="/assets/sun.svg"
        alt=""
        className={`absolute size-5 transition-all duration-300 ${
          isDark ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
        }`}
        style={{ filter: martianFilter }}
      />
    </button>
  );
}

interface HeaderProps {
  /** When true (e.g. homepage), header is transparent over hero until scroll; then sticky with black bg + rounded. When false, always sticky with black bg + rounded. */
  isHomePage?: boolean;
}

export function Header({ isHomePage = false }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showStickyStyle = !isHomePage || scrolled;

  return (
    <header
      className={`sticky z-50 mx-4 flex items-center justify-between px-4 py-2 transition-all duration-300 ${
        showStickyStyle
          ? 'top-2 rounded-2xl bg-black/95 backdrop-blur-md'
          : 'top-8 bg-transparent'
      }`}
    >
      <a href="/" className="shrink-0 ml-6 flex flex-col items-center gap-0.5">
        <img
          src="/assets/eve_frontier_transparent-256w.webp"
          alt="EVE Frontier"
          className="h-8 md:h-10"
        />
        <span className="text-white text-[0.5rem] whitespace-nowrap font-heading">
          Community
        </span>
      </a>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-2">
        {NAV_ITEMS.map((item) => (
          <a
            key={item}
            href="#"
            className="px-4 py-1.5 rounded-full border border-white/30 text-white/90 text-sm hover:bg-white/10 transition-colors"
          >
            {item}
          </a>
        ))}
      </nav>

      <div className="hidden md:flex items-center gap-3 ml-auto">
        <ThemeToggle />
        <Button
          asChild
          className="header-learn-move rounded-lg px-5 py-2 text-sm font-semibold text-black transition-colors bg-[#FAFAE5]"
        >
          <a href={MOVE_APP_HREF} className="no-underline">Learn Move</a>
        </Button>
      </div>

      {/* Mobile hamburger — pushed right on mobile */}
      <div className="ml-auto md:ml-0">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10" aria-label="Open menu">
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-slate-900 border-slate-800" showCloseButton={false}>
            <SheetHeader className="flex-row items-center justify-between">
              <SheetTitle className="text-white">Menu</SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 shrink-0">
                  <X className="size-5" />
                  <span className="sr-only">Close</span>
                </Button>
              </SheetClose>
            </SheetHeader>
          <nav className="flex flex-col gap-2 px-4">
            {NAV_ITEMS.map((item) => (
              <a
                key={item}
                href="#"
                className="px-4 py-3 rounded-lg text-white/90 text-base hover:bg-white/10 transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-3 px-4 mt-4">
            <Button
              asChild
              className="header-learn-move w-full rounded-lg py-3 text-sm font-semibold text-black transition-colors bg-[#FAFAE5]"
            >
              <a href={MOVE_APP_HREF} className="no-underline">Learn Move</a>
            </Button>
            <div className="flex items-center gap-3 mt-2">
              <ThemeToggle />
              <span className="text-white/50 text-sm">Theme</span>
            </div>
          </div>
        </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
