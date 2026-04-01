import { useState } from 'react';

export function VoteBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-80 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl p-5 flex flex-col gap-3"
      style={{ background: 'linear-gradient(348.41deg, rgba(0, 0, 0, 0.95) 67.55%, rgb(12, 40, 93) 93.7%, rgb(93, 127, 169) 117.48%)' }}
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="pr-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#FAFAE5]/60 mb-1">
          Hackathon voting is open
        </p>
        <p className="text-white font-bold text-base leading-snug">
          Vote for First Move
        </p>
        <p className="text-white/60 text-sm mt-1 leading-snug">
          Support the community and cast your vote — you'll need an EVE Frontier account to participate.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <a
          href="https://vote.deepsurge.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full rounded-lg py-2 text-sm font-semibold text-black text-center transition-colors bg-[#FAFAE5] hover:bg-[#e8e8d0] no-underline"
        >
          Vote now
        </a>
        <a
          href="https://evefrontier.com/en"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full rounded-lg py-2 text-sm font-semibold text-white/70 text-center transition-colors hover:text-white no-underline"
        >
          Get an account first →
        </a>
      </div>
    </div>
  );
}
