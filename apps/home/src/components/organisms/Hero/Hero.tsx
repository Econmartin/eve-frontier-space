import './Hero.css';

export function Hero() {
  return (
    <section className="hero-section grid min-h-[50vh] -mt-[56px] transition-all items-end justify-items-start">
      <div className="hero-mask relative overflow-hidden rounded-4xl [grid-area:1/1] place-self-stretch">
        <div className="hero-bg absolute inset-0 bg-cover bg-center bg-no-repeat" />
        <div className="absolute inset-0 bg-slate-900/10" />
        <div className="hero-gradient absolute inset-0" />

        <div className="relative flex flex-col justify-end h-full pb-28 px-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 leading-[0.9]">
            Build The<br />Frontier
          </h1>
          <p className="text-base text-white/80 max-w-lg">
            Community tools, Move &amp; Sui resources for EVE Frontier. <br /> Built by the Eve Frontier community.
          </p>
        </div>
      </div>

      <a
        href="https://discord.gg/frontier-reapers"
        target="_blank"
        rel="noopener noreferrer"
        className="hero-caption z-10 flex items-center justify-center overflow-hidden cursor-pointer text-black no-underline [grid-area:1/1]"
      >
        <span className="hero-caption__content flex items-center justify-center gap-2">
          <img src="/assets/logo_solo.png" alt="Reapers logo" className="hero-caption__logo h-10 shrink-0" />
          <span className="hero-caption__text text-base md:text-lg font-semibold whitespace-nowrap">Join Reapers</span>
        </span>
      </a>
    </section>
  );
}
