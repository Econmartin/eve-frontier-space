import { useEffect, useRef } from 'react';
import { AppHeader } from '@eve-frontier-space/ui';
import { PageWrapper } from '@/components/templates/index.ts';
import { HeaderActions } from '@/components/organisms/index.ts';

// Béton is a self-contained three.js tool served as a static asset. It is embedded
// as-is so its renderer, shaders and localStorage ("beton.kept.v1") stay untouched.
const CREATOR_SRC = '/tools/beton.html';

export function StationCreatorPage() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // Forward a shared seed link (/station-creator#s=12345678) into the tool.
  const initialHash = useRef(window.location.hash).current;

  // Béton honours data-theme="light|dark" on its <html>; follow the site's theme toggle.
  const syncTheme = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    doc.documentElement.dataset.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  };

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Station Creator | EVE Frontier Community';

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // The tool writes the current seed to its own hash via replaceState (no event),
    // so mirror it onto this page's URL to keep the address bar shareable.
    const id = window.setInterval(() => {
      const hash = frameRef.current?.contentWindow?.location.hash;
      if (hash && hash !== window.location.hash) {
        window.history.replaceState(window.history.state, '', hash);
      }
    }, 500);

    return () => {
      document.title = prevTitle;
      observer.disconnect();
      window.clearInterval(id);
    };
  }, []);

  return (
    <PageWrapper>
      <div className="flex flex-col h-[calc(100dvh-2rem)] gap-3 pb-3">
        <AppHeader right={<HeaderActions />} />
        <iframe
          ref={frameRef}
          src={`${CREATOR_SRC}${initialHash}`}
          onLoad={syncTheme}
          title="Béton station creator"
          className="flex-1 min-h-0 w-full rounded-2xl border-0 bg-[#232422]"
        />
      </div>
    </PageWrapper>
  );
}
