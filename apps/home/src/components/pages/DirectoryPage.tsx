import { Link } from 'react-router';
import { PageWrapper } from '@/components/templates/index.ts';
import { Header } from '@/components/organisms/index.ts';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

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
            <Card key={app.id} className="bg-white/5 border-white/10 flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <ExternalLink className="size-5 text-white/60" />
                  </div>
                  <CardTitle className="text-white">{app.name}</CardTitle>
                </div>
                <CardDescription className="text-white/60">{app.description}</CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto">
                <Button asChild className="w-full bg-[#FAFAE5] text-black hover:bg-[#FAFAE5]/90">
                  <Link to={`/directory/view?url=${encodeURIComponent(app.url)}`}>
                    Open App
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </PageWrapper>
  );
}
