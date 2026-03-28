import './GrainyCard.css';

export function GrainyCard() {
  return (
    <div className="grainy-card w-full rounded-2xl p-10 min-h-48 flex flex-col justify-end">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/50 mb-2">
        Placeholder
      </p>
      <h2 className="font-heading text-3xl font-bold text-white leading-tight">
        Coming Soon
      </h2>
    </div>
  );
}
