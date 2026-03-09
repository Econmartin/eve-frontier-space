import { ArrowUpRight } from 'lucide-react';
import './InstrumentCard.css';

export interface InstrumentCardProps {
  href: string;
  label: string;
  title: string;
  desc: string;
  avatar?: string;
  external?: boolean;
}

export function InstrumentCard({
  href,
  label,
  title,
  desc,
  avatar,
  external = false,
}: InstrumentCardProps) {
  const linkProps = external
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  return (
    <a
      href={href}
      className="instrument group block w-full overflow-hidden rounded-[18px] no-underline text-inherit animate-instrument-in"
      {...linkProps}
    >
      {/* Screws */}
      <div className="instrument__screw instrument__screw--tl" />
      <div className="instrument__screw instrument__screw--tr" />
      <div className="instrument__screw instrument__screw--bl" />
      <div className="instrument__screw instrument__screw--br" />

      {/* Top: Bezel + Circle */}
      <div className="instrument__top flex items-center justify-center py-10 pt-10 pb-6">
        <div className="instrument__bezel relative flex shrink-0 items-center justify-center w-40 h-40 rounded-full">
          <div className="instrument__bezel-marks absolute inset-0 rounded-full pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="instrument__tick absolute w-px h-1.5 bg-black/25 left-1/2 top-0.5 shadow-[0.5px_0_0_rgba(255,255,255,0.06)]"
                style={{
                  transform: `translateX(-50%) rotate(${i * 30}deg)`,
                  transformOrigin: '50% 80px',
                }}
              />
            ))}
          </div>
          <div
            className="instrument__btn relative z-2 w-[130px] h-[130px] rounded-full overflow-hidden flex items-center justify-center transition-all duration-150 ease-out"
            tabIndex={-1}
          >
            {avatar && (
              <img
                src={avatar}
                alt=""
                loading="eager"
                className="instrument__btn-avatar absolute inset-0 w-full h-full object-cover rounded-full opacity-0 scale-110 transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-hover:scale-100 pointer-events-none"
              />
            )}
            <div className="instrument__btn-glare absolute -top-[20%] -left-[20%] w-[70%] h-1/2 bg-[radial-gradient(ellipse,rgba(255,255,255,0.035),transparent_70%)] -rotate-15 pointer-events-none z-3 transition-opacity duration-250 group-hover:opacity-50" />
            <ArrowUpRight className="instrument__btn-icon w-7 h-7 text-white/70 group-hover:opacity-0 group-hover:scale-90 transition-all duration-200 relative z-1" strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="instrument__body px-7 pb-11">
        <div className="text-xs tracking-[0.16em] uppercase text-white/20 mb-2 font-mono">
          {label}
        </div>
        <h3 className="text-xl font-semibold leading-snug text-white/88 mb-1.5 font-sans">
          {title}
        </h3>
        <p className="text-sm font-light leading-relaxed text-white/40 font-sans">
          {desc}
        </p>
      </div>
    </a>
  );
}
