import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { COURSE, COURSE_1_MODULE_COUNT } from '../../../content/curriculum';
import { loadCourse1CompletionDate } from '@/hooks/useProgress';
import { RegistrationPanel } from '@/components/organisms/RegistrationPanel';
import { useCourse } from '@/hooks/useCourse';

export function CourseCompletePage() {
  const [copied, setCopied] = useState(false);
  const { isCourse1Completed } = useCourse();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCourse1Completed) navigate('/learn', { replace: true });
  }, [isCourse1Completed, navigate]);

  const course1Modules = COURSE.modules.slice(0, COURSE_1_MODULE_COUNT);
  const course2FirstModule = COURSE.modules[COURSE_1_MODULE_COUNT];
  const totalLessons = course1Modules.reduce((s, m) => s + m.lessons.length, 0);
  const completionDate = loadCourse1CompletionDate() ?? new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const siteUrl = window.location.origin + import.meta.env.BASE_URL;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Just completed "Learn Move" — Move smart contract fundamentals for EVE Frontier! 🚀\n\nStarting "Move on Sui" next.\n\n${siteUrl}`,
  )}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-16 min-h-0">
      {/* Top label */}
      <p className="font-mono text-[10px] tracking-[0.2em] text-cyan uppercase mb-10 animate-fade-in">
        ◈ Course 1 Complete ◈
      </p>

      {/* Shareable card */}
      <div
        className="w-full max-w-sm border border-[var(--color-border-glow)] rounded-2xl p-8 text-center relative overflow-hidden animate-fade-in"
        style={{ background: 'linear-gradient(145deg, #100400 0%, #0a0a0a 60%, #050505 100%)' }}
      >
        {/* Inner glow */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: 'inset 0 0 60px rgba(255, 97, 10, 0.08)' }}
        />

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <span
            className="w-10 h-10 inline-block"
            style={{
              maskImage: `url(${import.meta.env.BASE_URL}assets/best-practices.svg)`,
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
          Learn Move
        </h1>

        <p className="font-mono text-[10px] tracking-wider text-text-muted mb-6">
          {course1Modules.length} modules · {totalLessons} lessons
        </p>

        <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border-glow)] to-transparent mb-6" />

        <p className="font-mono text-xs text-cyan leading-relaxed mb-2">
          Move smart contracts for the Frontier
        </p>
        <p className="font-mono text-[10px] text-text-dim">
          Completed {completionDate}
        </p>
      </div>

      {/* Share actions */}
      <div className="flex gap-3 mt-6 animate-fade-in">
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

      <RegistrationPanel course={1} />

      {/* Course 2 CTA */}
      <div className="mt-14 pt-10 border-t border-border w-full max-w-sm text-center animate-fade-in">
        <p className="font-mono text-[10px] tracking-[0.15em] text-text-muted uppercase mb-4">
          Ready for more?
        </p>
        <h2 className="font-heading text-xl font-bold text-text mb-2">
          Learn Move on Sui
        </h2>
        <p className="text-xs text-text-muted leading-relaxed mb-7">
          Objects, tokens, design patterns — Move the way Sui uses it. {COURSE.modules.length - COURSE_1_MODULE_COUNT} more modules.
        </p>
        <Link
          to={`/learn/${course2FirstModule.id}/${course2FirstModule.lessons[0].id}/0`}
          viewTransition
          className="inline-block font-mono text-xs font-bold tracking-wider px-8 py-3 rounded-lg bg-cyan text-black hover:bg-cyan-dim transition-colors no-underline"
        >
          Start Course 2 →
        </Link>
      </div>
    </div>
  );
}
