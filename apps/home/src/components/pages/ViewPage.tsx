import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router';
import { ArrowLeft, Wallet } from 'lucide-react';

export function ViewPage() {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url') ?? '';

  const [popupHint, setPopupHint] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleBlur() {
      // Window losing focus often means a wallet popup opened
      setPopupHint(true);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setPopupHint(false), 8000);
    }

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Back button */}
      <Link
        to="/directory"
        className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-white/90 text-sm hover:bg-black/90 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      {/* Wallet popup nudge — appears on window blur */}
      <div
        className={`absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-950/90 backdrop-blur-sm border border-amber-500/40 text-amber-200 text-sm shadow-lg transition-all duration-300 ${
          popupHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <Wallet className="size-4 shrink-0 text-amber-400" />
        <span>Wallet popup detected — check your browser toolbar or taskbar</span>
        <button
          onClick={() => setPopupHint(false)}
          className="ml-1 text-amber-400/60 hover:text-amber-200 transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* Persistent wallet hint button */}
      <button
        onClick={() => { setPopupHint(true); if (hintTimerRef.current) clearTimeout(hintTimerRef.current); }}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-white/60 text-sm hover:text-white/90 hover:bg-black/90 transition-colors"
        title="Wallet connection help"
      >
        <Wallet className="size-4" />
        Wallet issue?
      </button>

      <iframe
        src={url}
        className="flex-1 w-full border-0"
        title="App viewer"
        allow="fullscreen"
      />
    </div>
  );
}
