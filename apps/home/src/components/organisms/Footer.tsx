export function Footer() {
  return (
    <footer className="relative rounded-2xl overflow-hidden text-white p-8 md:p-12">
      <div className="absolute inset-0 bg-[url(/assets/asteroid_debris_field.jpg)] bg-cover bg-center bg-no-repeat" />
      <div className="absolute inset-0 bg-slate-900/10" />
      <div className="relative z-10">
      <div className="flex flex-col sm:flex-row flex-wrap items-start justify-start gap-4 sm:gap-6 mb-6">
        <a
          href="https://discord.gg/frontier-reapers"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white text-sm font-medium no-underline hover:text-[var(--color-martian-500)] transition-colors"
        >
          Reapers Discord
        </a>
        <a
          href="https://discord.com/invite/evefrontier"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white text-sm font-medium no-underline hover:text-[var(--color-martian-500)] transition-colors"
        >
          EVE Frontier Discord
        </a>
        <a
          href="https://evefrontier.com/en?ref=Space"
          target="_blank"
          rel="noopener noreferrer"
          className="link-glitch text-[var(--color-martian-500)] text-sm font-medium no-underline hover:text-white transition-colors"
        >
          Play EVE Frontier
        </a>
      </div>

      <div className="text-left text-xs text-slate-500 mb-6">
        Built by pilots, not CCP.
      </div>

      <div className="text-slate-500 text-xs text-left max-w-2xl leading-relaxed border-t border-slate-800 pt-6 space-y-2">
        <p>
          This site is community-built and is not affiliated with or endorsed by CCP. EVE Frontier and all related
          trademarks and IP are the property of CCP and EVE Frontier.
        </p>
        <p>
          <a
            href="https://icons8.com/icon/59881/rocket"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 underline hover:text-slate-400 transition-colors"
          >
            Spaceship
          </a>
          {' '}icon by{' '}
          <a
            href="https://icons8.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 underline hover:text-slate-400 transition-colors"
          >
            Icons8
          </a>
        </p>
      </div>
      </div>
    </footer>
  );
}
