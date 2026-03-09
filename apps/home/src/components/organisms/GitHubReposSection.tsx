import { Github } from 'lucide-react';
import { Card } from '@/components/ui/card';

const REPOS = [
  {
    title: 'EVE Frontier',
    href: 'https://github.com/evefrontier',
    description: 'Official GitHub organization. Repositories for world contracts, builder tools, EVE Vault, and more.',
  },
  {
    title: 'world-contracts',
    href: 'https://github.com/evefrontier/world-contracts',
    description: 'Sui Move smart contracts for EVE Frontier. The on-chain foundation for the Frontier world.',
  },
  {
    title: 'builder-scaffold',
    href: 'https://github.com/evefrontier/builder-scaffold',
    description: 'Templates and tools for building on EVE Frontier. Move contracts, Docker flow, dApp template, and setup-world.',
  },
] as const;

export function GitHubReposSection() {
  return (
    <section className="my-16">
      <div className="mb-10">
        <h2 className="text-4xl md:text-5xl font-bold leading-tight text-foreground mb-4">
          Useful GitHub repos
        </h2>
        <p className="text-xl md:text-2xl leading-relaxed max-w-2xl text-muted-foreground">
          Official EVE Frontier repos for building, deploying, and integrating. Move contracts, wallet, and builder tooling.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPOS.map((repo) => (
          <a
            key={repo.title}
            href={repo.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block no-underline"
          >
            <Card className="group h-full p-6 text-base transition-all hover:ring-foreground/20 hover:shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <Github className="size-7 shrink-0 text-foreground/70" aria-hidden />
                <h3 className="text-lg font-bold text-card-foreground group-hover:text-muted-foreground">
                  {repo.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                {repo.description}
              </p>
              <span className="mt-4 text-sm font-medium text-muted-foreground group-hover:text-foreground inline-flex items-center gap-1">
                View on GitHub →
              </span>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}
