import { LandingLayout } from '@eve-frontier-space/ui';
import { MOVE_APP_HREF } from '@/config';
import { useDarkMode } from '@/hooks/useDarkMode';
import { PageWrapper } from '@/components/templates/index.ts';
import {
  Hero,
  DocumentationSection,
  ResourceCardsSection,
  VideoGallerySection,
  CommunityGallerySection,
  GitHubReposSection,
  PlayCtaSection,
  Footer,
} from '@/components/organisms/index.ts';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggle } = useDarkMode();
  const martianFilter = 'brightness(0) saturate(100%) invert(43%) sepia(96%) saturate(2058%) hue-rotate(3deg) brightness(101%) contrast(106%)';
  return (
    <button
      onClick={toggle}
      className={`relative size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <img src="/assets/moon.svg" alt="" className={`absolute size-5 transition-all duration-300 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'}`} style={{ filter: martianFilter }} />
      <img src="/assets/sun.svg" alt="" className={`absolute size-5 transition-all duration-300 ${isDark ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} style={{ filter: martianFilter }} />
    </button>
  );
}

function HeaderActions() {
  return (
    <>
      <div className="hidden md:flex items-center gap-3">
        <ThemeToggle />
        <a href={MOVE_APP_HREF} className="rounded-lg px-5 py-2 text-sm font-semibold text-black transition-colors bg-[#FAFAE5] hover:bg-[#e8e8d0] no-underline">
          Learn Move
        </a>
      </div>
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
          <div className="flex flex-col gap-3 px-4 mt-4">
            <a href={MOVE_APP_HREF} className="w-full rounded-lg py-3 text-sm font-semibold text-black text-center transition-colors bg-[#FAFAE5] hover:bg-[#e8e8d0] no-underline">
              Learn Move
            </a>
            <div className="flex items-center gap-3 mt-2">
              <ThemeToggle />
              <span className="text-white/50 text-sm">Theme</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function HomePage() {
  return (
    <PageWrapper>
      <LandingLayout
        headerRight={<HeaderActions />}
        footer={
          <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
            <Footer />
          </div>
        }
      >
        <main>
          <Hero />
          <div className="px-4 sm:px-6 lg:px-8">
            <DocumentationSection />
            <ResourceCardsSection />
            <VideoGallerySection />
            <CommunityGallerySection />
            <GitHubReposSection />
            <PlayCtaSection />
          </div>
        </main>
      </LandingLayout>
    </PageWrapper>
  );
}
