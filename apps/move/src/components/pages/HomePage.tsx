import { Link } from 'react-router';
import { LandingLayout } from '@eve-frontier-space/ui';
import { COURSE, COURSE_1_MODULE_COUNT } from '../../../content/curriculum';
import { HOME_APP_HREF } from '@/config';
import { PageWrapper } from '@/components/templates/PageWrapper';
import { Hero } from '@/components/organisms/Hero';
import { HomeFooter } from '@/components/organisms/Footer';
import '@/components/organisms/GrainyCard/GrainyCard.css';
import { useCompleters } from '@/hooks/useCompleters';
import { abbreviateAddress } from '@evefrontier/dapp-kit';

export function HomePage() {
  return (
    <PageWrapper>
      <LandingLayout
        homeHref={HOME_APP_HREF}
        headerRight={
          <Link
            to="/learn"
            viewTransition
            className="rounded-lg px-5 py-2 text-sm font-semibold text-black transition-colors bg-[#FAFAE5] hover:bg-[#e8e8d0] no-underline"
          >
            Start Learning
          </Link>
        }
        footer={<HomeFooter />}
      >
        <main>
          <Hero />
          <div className="px-4 sm:px-6 lg:px-8">
            <CoursesSection />
            <CompletersSection />
            <CtaSection />
          </div>
        </main>
      </LandingLayout>
    </PageWrapper>
  );
}

// ---------------------------------------------------------------------------
// Courses section (two-course split)
// ---------------------------------------------------------------------------

const COURSES_META = [
  {
    num: '01',
    title: 'Learn Move',
    description: 'Move language fundamentals — types, structs, abilities, generics, testing, and best practices.',
    modules: COURSE.modules.slice(0, COURSE_1_MODULE_COUNT),
    startModule: COURSE.modules[0],
    globalOffset: 0,
    image: 'man1.webp',
  },
  {
    num: '02',
    title: 'Learn Move on Sui',
    description: 'Move on Sui — objects, entry functions, design patterns, tokens, dynamic storage, and production.',
    modules: COURSE.modules.slice(COURSE_1_MODULE_COUNT),
    startModule: COURSE.modules[COURSE_1_MODULE_COUNT],
    globalOffset: COURSE_1_MODULE_COUNT,
    image: 'man2.webp',
  },
];

function CoursesSection() {
  return (
    <section className="py-20 mx-auto">
      {/* Course overview cards */}
      <h2 className="text-2xl font-bold text-text font-heading mb-2">Two Courses</h2>
      <p className="text-sm text-text-muted mb-10">
        Learn Move fundamentals first, then apply it on Sui — take a break between them or go straight through.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
        {COURSES_META.map((course) => {
          const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);
          return (
            <Link
              key={course.num}
              to={`/learn/${course.startModule.id}/${course.startModule.lessons[0].id}/0`}
              viewTransition
              className="grainy-card group rounded-2xl overflow-hidden no-underline flex min-h-56 transition-all duration-500 ease-out hover:scale-[1.02] shadow-[0_0_0px_rgba(255,97,10,0)] hover:shadow-[0_0_60px_20px_rgba(255,97,10,0.2)]"
            >
              {/* Left — course info */}
              <div className="flex flex-col justify-end p-6 flex-1 relative z-10">
                <span className="font-mono text-[10px] tracking-[0.2em] text-white/50 uppercase">
                  Course {course.num}
                </span>
                <h3 className="font-heading text-lg font-bold text-white mt-2 mb-2">
                  {course.title}
                </h3>
                <p className="text-xs text-white/60 leading-relaxed mb-4">
                  {course.description}
                </p>
                <p className="font-mono text-[10px] text-white/40">
                  {course.modules.length} modules · {totalLessons} lessons
                </p>
              </div>

              {/* Right — figure with orange glow */}
              <div className="relative w-44 shrink-0 flex items-end">
                {/* Glow behind figure */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(ellipse at 50% 55%, rgba(255,97,10,0.55) 0%, rgba(255,97,10,0.2) 40%, transparent 70%)',
                  }}
                />
                <img
                  src={`${import.meta.env.BASE_URL}assets/${course.image}`}
                  alt=""
                  className="relative w-full h-full object-cover object-top"
                  style={{ mixBlendMode: 'screen', maskImage: 'linear-gradient(to right, transparent 0%, black 40%)' }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      <FeaturesSection />

      {/* Module grids, one per course */}
      {COURSES_META.map((course, cIdx) => (
        <div key={course.num} className={cIdx > 0 ? 'mt-12' : ''}>
          <div className="flex items-center gap-4 mb-6">
            <span className="font-mono text-[10px] tracking-[0.15em] text-cyan uppercase whitespace-nowrap">
              Course {course.num}
            </span>
            <span className="font-mono text-[10px] text-text-muted whitespace-nowrap">{course.title}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {course.modules.map((mod, idx) => (
              <Link
                key={mod.id}
                to={`/learn/${mod.id}/${mod.lessons[0].id}/0`}
                viewTransition
                className="group bg-panel border border-border rounded-xl p-5 hover:border-[var(--color-cyan-dim)] hover:bg-panel-raised transition-all no-underline"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="w-5 h-5 shrink-0 inline-block transition-colors duration-200 bg-[var(--color-icon-dim)] group-hover:bg-[var(--color-cyan)]"
                    style={{
                      maskImage: `url(${import.meta.env.BASE_URL + mod.icon})`,
                      maskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      maskPosition: 'center',
                    }}
                  />
                  <span className="font-mono text-[10px] text-text-dim tracking-wider">
                    MODULE {String(course.globalOffset + idx + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-text mb-1 group-hover:text-[var(--color-cyan)] transition-colors">
                  {mod.title}
                </h3>
                <p className="text-xs text-text-muted">
                  {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features section
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    title: 'Real Compiler',
    description:
      'Your code runs through the actual Sui Move compiler (WASM). No simulators, no shortcuts.',
  },
  {
    title: 'Interactive Tasks',
    description:
      'Write real Move in every lesson. Instant feedback tells you exactly what to fix.',
  },
  {
    title: 'Progress Saved',
    description: 'Pick up right where you left off. Progress is stored locally in your browser.',
  },
  {
    title: 'Inscribed on Stillness',
    description:
      'Complete a course and your name is written into the Stillness chain permanently — a living record of everyone who has learned Move.',
  },
];

function FeaturesSection() {
  return (
    <section className="py-16 mx-auto border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="relative flex flex-col gap-3 p-6 rounded-xl border overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #100a00 0%, #201400 100%)',
              borderColor: 'rgba(255,97,10,0.2)',
            }}
          >
            <div
              className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
              style={{ background: 'radial-gradient(circle at top right, rgba(255,97,10,0.1) 0%, transparent 65%)' }}
            />
            <h3 className="text-sm font-semibold text-text relative z-10">{f.title}</h3>
            <p className="text-xs text-text-muted leading-relaxed relative z-10">{f.description}</p>
          </div>
        ))}
      </div>

    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA section — links to home/resources
// ---------------------------------------------------------------------------

function CtaSection() {
  return (
    <section className="py-16 mx-auto border-t border-border">
      <a
        href={HOME_APP_HREF}
        className="grainy-card group rounded-2xl overflow-hidden no-underline flex items-center min-h-36 transition-all duration-500 ease-out hover:scale-[1.01] shadow-[0_0_0px_rgba(255,97,10,0)] hover:shadow-[0_0_60px_20px_rgba(255,97,10,0.15)]"
      >
        {/* Left — text */}
        <div className="flex-1 p-8 relative z-10">
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/50 uppercase">
            What&apos;s next?
          </span>
          <h3 className="font-heading text-lg font-bold text-white mt-2 mb-2">
            Ready to build on EVE Frontier?
          </h3>
          <p className="text-xs text-white/60 leading-relaxed max-w-sm">
            Finished the course? Head to the EVE Frontier community hub for tools, docs, and resources for building dApps on Frontier.
          </p>
          <span className="inline-block mt-4 font-mono text-[10px] tracking-wider text-orange-300/70 group-hover:text-white/80 transition-colors">
            Explore resources →
          </span>
        </div>

        {/* Right — looping video */}
        <div className="relative self-stretch w-80 shrink-0 hidden sm:flex items-center justify-center">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,97,10,0.35) 0%, rgba(255,97,10,0.08) 50%, transparent 70%)' }}
          />
          <video
            src={`${import.meta.env.BASE_URL}assets/hologram.mp4`}
            autoPlay
            loop
            muted
            playsInline
            className="relative w-full h-full object-cover"
            style={{ mixBlendMode: 'screen', maskImage: 'linear-gradient(to right, transparent 0%, black 35%)' }}
          />
        </div>
      </a>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Completers section — on-chain graduates inscribed on Stillness
// ---------------------------------------------------------------------------

function CompletersSection() {
  const { data: completers, isLoading } = useCompleters();

  if (isLoading || !completers?.length) return null;

  return (
    <section className="py-16 mx-auto border-t border-border">
      <div className="flex items-baseline gap-4 mb-2">
        <h2 className="text-2xl font-bold text-text font-heading">Inscribed on Stillness</h2>
        <span className="font-mono text-[10px] text-cyan tracking-[0.15em] uppercase">
          {completers.length} graduate{completers.length !== 1 ? 's' : ''}
        </span>
      </div>
      <p className="text-sm text-text-muted mb-10">
        Complete a course and your name is written into the Stillness chain permanently. A living record of everyone who has learned Move for EVE Frontier.
      </p>

      <div className="flex flex-col gap-1.5">
        {completers.map((c, i) => (
          <div
            key={c.address}
            className="flex items-center gap-4 px-4 py-3 rounded-lg bg-panel border border-border hover:border-[var(--color-border-glow)] transition-colors"
          >
            <span className="font-mono text-[10px] text-text-dim w-5 shrink-0 text-right">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="flex-1 text-sm font-semibold text-text truncate">
              {c.name}
            </span>
            <div className="flex gap-1.5 shrink-0">
              {c.courses.sort().map(n => (
                <span
                  key={n}
                  className={`font-mono text-[9px] tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap ${
                    n === 1
                      ? 'bg-orange/8 text-orange border-orange/25'
                      : 'bg-cyan-glow text-cyan border-cyan/25'
                  }`}
                >
                  Course {n}
                </span>
              ))}
            </div>
            <span className="font-mono text-[10px] text-text-dim hidden sm:block shrink-0">
              {abbreviateAddress(c.address)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 font-mono text-[10px] text-text-dim">
        Complete a course at{' '}
        <Link to="/learn" className="text-cyan hover:text-cyan-dim transition-colors no-underline">
          /learn
        </Link>{' '}
        to add your name.
      </p>
    </section>
  );
}
