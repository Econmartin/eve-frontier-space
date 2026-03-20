import { PageWrapper } from '@/components/templates/index.ts';
import { Header } from '@/components/organisms/index.ts';

interface AppEntry {
  id: string;
  label: string;
  name: string;
  description: string;
  url: string;
  accent: string;
}

const APPS: AppEntry[] = [
  {
    id: 'frontier-flow',
    label: 'Industry',
    name: 'Frontier Flow',
    description: 'Track industry chains, resource flows, and production pipelines.',
    url: 'https://frontier-flow.scetrov.live',
    accent: 'from-cyan-900/60 to-cyan-950/80',
  },
  {
    id: 'the-mop',
    label: 'Utility',
    name: 'The Mop',
    description: 'A community utility tool for EVE Frontier players.',
    url: 'https://themop.dev/',
    accent: 'from-emerald-900/60 to-emerald-950/80',
  },
  {
    id: 'flappy-frontier',
    label: 'Game',
    name: 'Flappy Frontier',
    description: 'A Flappy Bird-style game set in the EVE Frontier universe.',
    url: 'https://flappyfrontier.com/',
    accent: 'from-purple-900/60 to-purple-950/80',
  },
  {
    id: 'cradle-os',
    label: 'Hackathon 2026',
    name: 'CradleOS',
    description: 'Reality Anchor — built for the EVE Frontier Hackathon 2026.',
    url: 'https://r4wf0d0g23.github.io/Reality_Anchor_Eve_Frontier_Hackathon_2026/',
    accent: 'from-amber-900/60 to-amber-950/80',
  },
];

export function DirectoryPage() {
  return (
    <PageWrapper>
      <Header />
      <main className="px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-xs tracking-[0.16em] uppercase text-white/30 font-mono mb-2">Community</p>
        <h1 className="text-3xl font-bold text-white mb-2 font-heading">App Directory</h1>
        <p className="text-white/50 mb-10 text-sm">Tools and games built by the EVE Frontier community.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {APPS.map((app) => (
            <a
              key={app.id}
              href={app.url}
              className="group block rounded-[18px] overflow-hidden no-underline text-inherit ring-1 ring-white/10 hover:ring-white/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_-8px_rgba(0,0,0,0.7)]"
              style={{
                background:
                  'linear-gradient(165deg, #5c5f68 0%, #3e4148 40%, #2c2e34 100%)',
                boxShadow:
                  '0 16px 48px -8px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)',
              }}
            >
              {/* Thumbnail / accent band */}
              <div className={`h-36 bg-gradient-to-br ${app.accent} flex items-end p-4 relative overflow-hidden`}>
                {/* Subtle grid lines */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,255,255,0.15) 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(255,255,255,0.15) 24px)',
                  }}
                />
                <span className="relative text-xs tracking-[0.16em] uppercase text-white/40 font-mono">
                  {app.label}
                </span>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <h2 className="text-white font-semibold text-lg font-heading mb-1.5 group-hover:text-[#ff610a] transition-colors duration-200">
                  {app.name}
                </h2>
                <p className="text-white/50 text-sm leading-relaxed font-mono">
                  {app.description}
                </p>
              </div>

              {/* Footer strip */}
              <div className="px-6 pb-5">
                <span className="inline-flex items-center gap-1.5 text-xs text-[#ff610a]/70 font-mono tracking-wide group-hover:text-[#ff610a] transition-colors duration-200">
                  Launch ↗
                </span>
              </div>
            </a>
          ))}
        </div>
      </main>
    </PageWrapper>
  );
}
