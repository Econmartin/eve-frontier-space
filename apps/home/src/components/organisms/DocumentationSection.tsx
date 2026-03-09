import { Badge } from '@/components/ui/badge';

const TAGS: { label: string; href: string; icon?: string }[] = [
  { label: 'Move', href: 'https://move-book.com/' },
  { label: 'Sui', href: 'https://docs.sui.io/concepts', icon: '/assets/sui_logo.svg' },
  { label: 'EVE Frontier', href: 'https://docs.evefrontier.com/', icon: '/assets/eve_frontier_profile.jpg' },
];

export function DocumentationSection() {
  return (
    <section className="my-16 flex flex-col md:flex-row gap-12">
      <div className="flex-1 pt-4">
        <div className="flex flex-wrap gap-3 mb-6">
          {TAGS.map((tag) => (
            <Badge key={tag.label} asChild className="h-auto px-5 py-3 text-base rounded-full">
              <a
                href={tag.href}
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline"
              >
                {tag.icon ? (
                  <img src={tag.icon} alt="" className="size-5 shrink-0 rounded-full object-contain" aria-hidden />
                ) : null}
                {tag.label}
              </a>
            </Badge>
          ))}
        </div>
        <p className="text-muted-foreground max-w-md mb-4">
          Looking for official documentation? Look here — Move, Sui, and EVE Frontier builder docs in one place.
        </p>
        <p className="text-muted-foreground max-w-md">
          Just looking to play Frontier?{' '}
          <a
            href="https://evefrontier.com/en?ref=A8EpsbMr"
            target="_blank"
            rel="noopener noreferrer"
            className="link-glitch font-medium text-foreground no-underline hover:text-muted-foreground transition-colors"
          >
            Play EVE Frontier
          </a>
        </p>
      </div>
      <div className="flex-[1.5]">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight text-foreground">
          <a
            href="https://docs.evefrontier.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline text-inherit hover:opacity-90 transition-opacity"
          >
            Find{' '}
            <span className="font-bold image-text-clip">
              official
            </span>{' '}
            <span className="font-bold image-text-clip">
              documentation
            </span>{' '}
            here
          </a>
        </h2>
      </div>
    </section>
  );
}
