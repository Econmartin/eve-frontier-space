import { Link } from 'react-router';
import { COURSE } from '../../../content/curriculum';
import type { Course } from '@/lib/types';

const course = COURSE as Course;

export function HomePage() {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <section className="relative px-6 py-24 flex flex-col items-center text-center max-w-4xl mx-auto">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan/[0.04] rounded-full blur-[120px]" />
        </div>

        <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-cyan-dim mb-4 relative">
          Interactive Course
        </span>
        <h1 className="text-5xl md:text-6xl font-bold text-text leading-tight mb-6 relative">
          Learn{' '}
          <span className="text-cyan">Move</span>{' '}
          on Sui
        </h1>
        <p className="text-lg text-[#94a3b8] max-w-2xl leading-relaxed mb-10 relative">
          Go from zero to writing real Sui smart contracts. An interactive,
          browser-based course with a real Move compiler — no setup required.
        </p>

        <div className="flex gap-4 relative">
          <Link
            to="/learn"
            className="font-mono text-sm font-semibold tracking-wider px-8 py-3 rounded-lg bg-cyan/15 border border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan hover:shadow-[0_0_24px_rgba(0,212,255,0.2)] transition-all no-underline"
          >
            Start Learning →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-center text-2xl font-bold text-text mb-12">
          Everything you need to learn Move
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon="⚡"
            title="Real Compiler"
            description="Your code is compiled by the actual Sui Move compiler (WASM). No simulators, no faking it."
          />
          <FeatureCard
            icon="🎯"
            title="Interactive Tasks"
            description="Write real Move code in every lesson. Instant feedback tells you exactly what to fix."
          />
          <FeatureCard
            icon="📊"
            title="Track Progress"
            description="Your progress is saved automatically. Pick up right where you left off."
          />
        </div>
      </section>

      {/* Course Modules */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-center text-2xl font-bold text-text mb-3">
          Course Modules
        </h2>
        <p className="text-center text-sm text-text-muted mb-12">
          {course.modules.length} modules · {course.modules.reduce((s, m) => s + m.lessons.length, 0)} lessons
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {course.modules.map((mod, idx) => (
            <Link
              key={mod.id}
              to={`/learn/${mod.id}/${mod.lessons[0].id}/0`}
              className="group bg-panel border border-border rounded-lg p-5 hover:border-border-glow hover:bg-panel-raised transition-all no-underline"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{mod.icon}</span>
                <span className="font-mono text-[10px] text-text-dim tracking-wider">
                  MODULE {idx + 1}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-text mb-1 group-hover:text-cyan transition-colors">
                {mod.title}
              </h3>
              <p className="text-xs text-text-muted">
                {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-20 flex flex-col items-center text-center">
        <h2 className="text-2xl font-bold text-text mb-4">Ready to start?</h2>
        <p className="text-sm text-text-muted mb-8 max-w-md">
          No setup, no downloads. Just open your browser and start writing Move.
        </p>
        <Link
          to="/learn"
          className="font-mono text-sm font-semibold tracking-wider px-8 py-3 rounded-lg bg-green/10 border border-green/50 text-green hover:bg-green/20 hover:border-green hover:shadow-[0_0_24px_rgba(34,197,94,0.2)] transition-all no-underline"
        >
          Begin the Course →
        </Link>
      </section>

      {/* Minimal footer */}
      <footer className="px-6 py-8 border-t border-border text-center">
        <p className="text-xs text-text-dim">
          Move on Sui — Interactive Learning Platform
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-panel border border-border rounded-lg p-6 flex flex-col gap-3">
      <span className="text-3xl">{icon}</span>
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <p className="text-xs text-text-muted leading-relaxed">{description}</p>
    </div>
  );
}
