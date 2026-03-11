const CARDS = [
  { title: 'Player submission 1', image: '/assets/mining_frigate.webp' },
  { title: 'Player submission 2', image: '/assets/omo.webp' },
  { title: 'Player submission 3', image: '/assets/rebus.webp' },
  { title: 'Player submission 4', image: '/assets/rider.webp' },
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
        {CARDS.map((card) => (
          <div
            key={card.title}
            className="group relative rounded-2xl overflow-hidden min-h-[280px] md:min-h-[360px] flex flex-col justify-end"
          >
            <img
              src={card.image.replace('.webp', '-960w.webp')}
              srcSet={`${card.image.replace('.webp', '-480w.webp')} 480w, ${card.image.replace('.webp', '-960w.webp')} 960w`}
              sizes="(min-width: 768px) 25vw, 50vw"
              alt={card.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="relative z-10 p-5">
              <h3 className="text-white text-lg font-bold leading-snug">{card.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
