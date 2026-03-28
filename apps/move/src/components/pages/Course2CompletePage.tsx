import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { COURSE, COURSE_1_MODULE_COUNT } from '../../../content/curriculum';
import { loadCourse2CompletionDate } from '@/hooks/useProgress';
import { RegistrationPanel } from '@/components/organisms/RegistrationPanel';
import { useCourse } from '@/hooks/useCourse';

export function Course2CompletePage() {
  const [copied, setCopied] = useState(false);
  const { isCourse2Completed } = useCourse();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCourse2Completed) navigate('/learn', { replace: true });
  }, [isCourse2Completed, navigate]);

  const course2Modules = COURSE.modules.slice(COURSE_1_MODULE_COUNT);
  const totalLessons = course2Modules.reduce((s, m) => s + m.lessons.length, 0);
  const completionDate = loadCourse2CompletionDate() ?? new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const siteUrl = window.location.origin + import.meta.env.BASE_URL;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Just completed "Learn Move on Sui" — objects, tokens, and Sui patterns for EVE Frontier! 🚀\n\n${siteUrl}`,
  )}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-20 min-h-0">
      {/* Top label */}
      <p className="font-mono text-[10px] tracking-[0.2em] text-cyan uppercase mb-12 animate-fade-in">
        ◈ Course 2 Complete ◈
      </p>

      {/* Shareable card */}
      <div
        className="w-full max-w-lg border border-[var(--color-border-glow)] rounded-2xl p-8 text-center relative animate-fade-in"
        style={{ background: 'linear-gradient(145deg, #000a10 0%, #0a0a0a 60%, #050505 100%)' }}
      >
        {/* Inner glow */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: 'inset 0 0 60px rgba(0, 212, 255, 0.06)' }}
        />

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <span
            className="w-10 h-10 inline-block"
            style={{
              maskImage: `url(${import.meta.env.BASE_URL}assets/production.svg)`,
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              backgroundColor: 'var(--color-cyan)',
            }}
          />
        </div>

        <p className="font-mono text-[9px] tracking-[0.3em] text-text-muted uppercase mb-4">
          EVE Frontier Space
        </p>

        <h1 className="font-heading text-4xl font-bold text-text mb-2 leading-tight">
          Learn Move on Sui
        </h1>

        <p className="font-mono text-[10px] tracking-wider text-text-muted mb-6">
          {course2Modules.length} modules · {totalLessons} lessons
        </p>

        <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border-glow)] to-transparent mb-6" />

        <p className="font-mono text-xs text-cyan leading-relaxed mb-2">
          Objects, tokens, and patterns for the Frontier
        </p>
        <p className="font-mono text-[10px] text-text-dim">
          Completed {completionDate}
        </p>
      </div>

      {/* Share actions */}
      <div className="flex gap-3 mt-8 animate-fade-in">
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs font-semibold tracking-wider px-5 py-2.5 rounded-lg border border-cyan/40 text-cyan bg-cyan-glow hover:bg-cyan/15 hover:border-cyan transition-all no-underline whitespace-nowrap"
        >
          Share on X →
        </a>
        <button
          onClick={handleCopy}
          className="font-mono text-xs font-semibold tracking-wider px-5 py-2.5 rounded-lg border border-border text-text-muted hover:border-[var(--color-border-glow)] hover:text-text transition-all whitespace-nowrap"
        >
          {copied ? '✓ Copied!' : 'Copy link'}
        </button>
      </div>

      <RegistrationPanel course={2} />

      {/* Next steps */}
      <div className="mt-16 pt-12 border-t border-border w-full max-w-lg animate-fade-in">
        <p className="font-mono text-[10px] tracking-[0.15em] text-text-muted uppercase mb-8 text-center">
          Where to go next
        </p>

        <div className="grid grid-cols-2 gap-4">
          <a
            href="https://github.com/MystenLabs/sui-move-bootcamp"
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-border rounded-xl p-5 hover:border-[var(--color-border-glow)] transition-all group no-underline min-h-36"
          >
            <p className="font-mono text-[9px] tracking-[0.2em] text-text-dim uppercase mb-1.5 group-hover:text-text-muted transition-colors">
              Mysten Labs
            </p>
            <h3 className="font-heading text-base font-bold text-text mb-1.5 group-hover:text-cyan transition-colors">
              Sui Move Bootcamp
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Hands-on exercises and advanced patterns direct from the Sui team.
            </p>
          </a>

          <a
            href="/"
            className="block border border-border rounded-xl p-5 hover:border-[var(--color-border-glow)] transition-all group no-underline min-h-36"
          >
            <p className="font-mono text-[9px] tracking-[0.2em] text-text-dim uppercase mb-1.5 group-hover:text-text-muted transition-colors">
              EVE Frontier Space
            </p>
            <h3 className="font-heading text-base font-bold text-text mb-1.5 group-hover:text-cyan transition-colors">
              Start Building dApps
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Tools, APIs, and resources for building on EVE Frontier.
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
