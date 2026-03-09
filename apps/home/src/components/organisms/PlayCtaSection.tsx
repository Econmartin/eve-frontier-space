export function PlayCtaSection() {
  return (
    <section className="my-16">
      <a
        href="https://evefrontier.com/en?ref=A8EpsbMr"
        target="_blank"
        rel="noopener noreferrer"
        className="group relative rounded-2xl overflow-hidden min-h-[400px] md:min-h-[520px] flex items-end cursor-pointer no-underline"
      >
        <div className="absolute inset-0 bg-[url(/assets/fabricator.png)] bg-cover bg-center bg-no-repeat transition-transform duration-500 ease-out group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 p-8 md:p-12">
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-none">
            PLAY<br />FRONTIER
          </h2>
        </div>
      </a>
    </section>
  );
}
