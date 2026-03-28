export function HomeFooter() {
  return (
    <footer className="mb-4 sm:mx-6 sm:mb-6">
      <div className="relative rounded-2xl overflow-hidden text-white p-8 md:p-12">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}assets/asteroid_debris_field-1920w.webp)` }}
        />
        <div className="absolute inset-0 bg-slate-900/30" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row flex-wrap items-start gap-4 sm:gap-6 mb-6">
            <a
              href="https://discord.gg/frontier-reapers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-sm font-medium no-underline hover:text-[var(--color-cyan)] transition-colors"
            >
              Reapers Discord
            </a>
            <a
              href="https://discord.com/invite/evefrontier"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-sm font-medium no-underline hover:text-[var(--color-cyan)] transition-colors"
            >
              EVE Frontier Discord
            </a>
            <a
              href="https://evefrontier.com/en?ref=Space"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-cyan)] text-sm font-medium no-underline hover:text-white transition-colors"
            >
              Play EVE Frontier
            </a>
          </div>
          <p className="text-xs text-slate-500">
            Built by pilots, not CCP. Not affiliated with or endorsed by CCP.
            EVE Frontier and all related trademarks are the property of CCP.
          </p>
        </div>
      </div>
    </footer>
  );
}
