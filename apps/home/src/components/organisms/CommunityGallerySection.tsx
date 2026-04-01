const CARDS = [
  {
    title: 'Eve Frontier Apps Directory',
    href: '/directory',
    image: '/assets/eve_frontier_keyart-1280w.webp',
    srcSet: '/assets/eve_frontier_keyart-1280w.webp 1280w, /assets/eve_frontier_keyart-1920w.webp 1920w',
  },
  {
    title: 'Frontier Flow',
    href: 'https://frontier-flow.scetrov.live/',
    image: 'https://frontier-flow.scetrov.live/og-image.png',
  },
  {
    title: 'CradleOS',
    href: 'https://r4wf0d0g23.github.io/Reality_Anchor_Eve_Frontier_Hackathon_2026/',
    image: 'https://r4wf0d0g23.github.io/CradleOS/keeper-og.png',
  },
  {
    title: 'The Ministry of Passage',
    href: 'https://themop.dev/',
    image: 'https://themop.dev/images/TheMOPLogo.png',
  },
];

export function CommunityGallerySection() {
  return (
    <section className="my-16">
      <h2 className="text-4xl md:text-5xl font-bold text-center leading-tight">
        Built by the community
      </h2>
      <p className="text-muted-foreground text-center max-w-2xl mx-auto mt-4 mb-10">
        Tools, guides, and creations from pilots and builders. Have something to share? We'll feature it here.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CARDS.map((card) => {
          const isExternal = card.href.startsWith('http');
          return (
          <a
            key={card.title}
            href={card.href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="group relative rounded-2xl overflow-hidden min-h-[280px] md:min-h-[360px] flex flex-col justify-end no-underline"
          >
            <img
              src={card.image}
              srcSet={card.srcSet ?? undefined}
              sizes={card.srcSet ? '(min-width: 768px) 25vw, 50vw' : undefined}
              alt={card.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="relative z-10 p-5">
              <h3 className="text-white text-lg font-bold leading-snug">{card.title}</h3>
            </div>
          </a>
          );
        })}
      </div>
    </section>
  );
}
