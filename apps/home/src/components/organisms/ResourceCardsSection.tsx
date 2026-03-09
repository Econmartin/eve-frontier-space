import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { InstrumentCard } from '@/components/ui/instrument-card/InstrumentCard';

const RESOURCE_CARDS = [
  {
    title: 'Learn Move',
    description: 'Resources and tutorials for the Move language. Your starting point for building on Sui.',
    image: '/assets/crude.webp',
    href: '/move',
    external: false,
  },
  {
    title: 'EVE Frontier Docs',
    description: 'Official builder documentation. Smart Assemblies, contracts, and the Frontier world.',
    image: '/assets/construction.webp',
    href: 'https://docs.evefrontier.com/',
    external: true,
  },
] as const;

export function ResourceCardsSection() {
  return (
    <section className="my-16">
      <div className="grid grid-cols-1 justify-items-center gap-8 md:grid-cols-3 md:items-stretch md:justify-items-stretch">
        {RESOURCE_CARDS.map((card) => {
          const content = (
            <Card className="group h-full p-4 text-base transition-colors hover:ring-foreground/20">
              <div className="h-48 overflow-hidden rounded-xl">
                <img
                  src={card.image}
                  alt={card.title}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-bold text-card-foreground mb-2">{card.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{card.description}</p>
              </div>
            </Card>
          );

          return card.external ? (
            <a
              key={card.title}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full no-underline"
            >
              {content}
            </a>
          ) : (
            <Link key={card.title} to={card.href} className="block w-full no-underline">
              {content}
            </Link>
          );
        })}

        <div className="min-w-0 w-full">
          <InstrumentCard
            href="https://frontier.scetrov.live/"
            label="Scetrov"
            title="Unofficial EVE Frontier Development Notes"
            desc="Get started building with move and sui in frontier."
            avatar="https://avatars.githubusercontent.com/u/144595937?v=4"
            external
          />
        </div>
      </div>
    </section>
  );
}
