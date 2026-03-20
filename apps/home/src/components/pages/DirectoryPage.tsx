import { Link } from 'react-router';
import { PageWrapper } from '@/components/templates/index.ts';
import { Header } from '@/components/organisms/index.ts';
import { Button } from '@/components/ui/button';

interface AppEntry {
  id: string;
  name: string;
  description: string;
  url: string;
}

const APPS: AppEntry[] = [
  {
    id: 'frontier-flow',
    name: 'Frontier Flow',
    description: 'Track your EVE Frontier industry chains, resource flows, and production pipelines.',
    url: 'https://frontier-flow.scetrov.live',
  },
  {
    id: 'the-mop',
    name: 'The Mop',
    description: 'A community tool for EVE Frontier players.',
    url: 'https://themop.dev/',
  },
  {
    id: 'flappy-frontier',
    name: 'Flappy Frontier',
    description: 'A fun Flappy Bird-style game set in the EVE Frontier universe.',
    url: 'https://flappyfrontier.com/',
  },
  {
    id: 'cradle-os',
    name: 'CradleOS',
    description: 'A community tool built for the EVE Frontier Hackathon 2026.',
    url: 'https://r4wf0d0g23.github.io/Reality_Anchor_Eve_Frontier_Hackathon_2026/',
  },
];

export function DirectoryPage() {
  return (
    <PageWrapper>
      <Header />
      <main className="px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Community Apps</h1>
        <p className="text-white/60 mb-8">Tools built by the EVE Frontier community.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {APPS.map((app) => (
            <div key={app.id} className="rounded-xl bg-white/5 ring-1 ring-white/10 flex flex-col p-5 gap-4">
              <div>
                <h2 className="text-white font-semibold text-base mb-1">{app.name}</h2>
                <p className="text-white/60 text-sm">{app.description}</p>
              </div>
              <div className="mt-auto">
                <Button asChild className="w-full bg-[#FAFAE5] text-black hover:bg-[#FAFAE5]/90">
                  <Link to={`/directory/view?url=${encodeURIComponent(app.url)}`}>
                    Open {app.name}
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </PageWrapper>
  );
}
