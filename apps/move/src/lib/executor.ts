import { MoveSimulator } from './simulator.ts';
import type { TaskPage, ValidationResult, ExecutorMode } from './types.ts';

// Base-aware so compiler loads correctly when app is served at e.g. /move
const COMPILER_URL = `${import.meta.env.BASE_URL}vendor/sui-move-builder/index.js`;

let mode: ExecutorMode = 'unknown';
let buildPackage: ((opts: {
  files: Record<string, string>;
  resolvedDependencies?: unknown;
  network?: string;
}) => Promise<any>) | null = null;
let resolveDeps: ((opts: {
  files: Record<string, string>;
  network?: string;
}) => Promise<{ files: string; dependencies: string; lockfileDependencies: string }>) | null = null;

// Only the dependency data is cached; root files are always supplied fresh.
let cachedDepData: { dependencies: string; lockfileDependencies: string } | null = null;
let initPromise: Promise<boolean> | null = null;

function canonicalLessonFiles(): Record<string, string> {
  return {
    'Move.toml': [
      '[package]',
      'name = "lesson"',
      'version = "0.0.1"',
      'edition = "2024.beta"',
      '',
      '[addresses]',
      'lesson = "0x0"',
    ].join('\n'),
    'sources/lesson.move': 'module lesson::lesson {}',
  };
}

async function tryLoadCompiler(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const mod = await import(/* @vite-ignore */ COMPILER_URL);
      await mod.initMoveCompiler();
      buildPackage = mod.buildMovePackage;
      resolveDeps = mod.resolveDependencies;
      mode = 'real';

      // Pre-resolve Sui/MoveStdlib deps once so later builds skip the GitHub fetch.
      // We cache ONLY the dependency data, NOT the root files.
      try {
        const resolved = await mod.resolveDependencies({
          files: canonicalLessonFiles(),
          network: 'mainnet',
        });
        cachedDepData = {
          dependencies: resolved.dependencies,
          lockfileDependencies: resolved.lockfileDependencies,
        };
        console.info('[sui-move-builder] Dependency cache ready.');
      } catch (e) {
        console.warn('[sui-move-builder] Could not pre-cache dependencies:', e);
      }

      console.info('[sui-move-builder] Real Sui Move compiler ready.');
      return true;
    } catch (err: any) {
      console.info(
        '[sui-move-builder] Could not load real compiler — using simulator fallback.',
        err.message,
      );
      mode = 'simulator';
      return false;
    }
  })();

  return initPromise;
}

function buildPackageFiles(sourceCode: string): Record<string, string> {
  const m = sourceCode.match(/^\s*module\s+(\w+)\s*::/m);
  const pkg = m ? m[1] : 'package';

  return {
    'Move.toml': [
      '[package]',
      `name = "${pkg}"`,
      'version = "0.0.1"',
      'edition = "2024.beta"',
      '',
      '[addresses]',
      `${pkg} = "0x0"`,
    ].join('\n'),
    'sources/lesson.move': sourceCode,
  };
}

function formatCompilerError(raw: string | undefined): string {
  if (!raw) return 'Compilation failed — check your Move syntax.';
  const clean = raw.replace(/\x1B\[[0-9;]*m/g, '');
  const lines = clean.split('\n').filter((l) => l.trim());
  return lines.slice(0, 12).join('\n') || clean;
}

async function resolveForFiles(
  files: Record<string, string>,
): Promise<{ files: string; dependencies: string; lockfileDependencies: string }> {
  if (cachedDepData) {
    // Reuse cached dependency data but supply fresh root files so the
    // compiler always sees the user's actual source code.
    return {
      files: JSON.stringify(files),
      ...cachedDepData,
    };
  }

  // No cache yet — do a full resolution (slower, hits GitHub).
  if (resolveDeps) {
    const resolved = await resolveDeps({ files, network: 'mainnet' });
    cachedDepData = {
      dependencies: resolved.dependencies,
      lockfileDependencies: resolved.lockfileDependencies,
    };
    return resolved;
  }

  throw new Error('Compiler not loaded');
}

async function validateWithCompiler(
  code: string,
  lesson: TaskPage,
): Promise<ValidationResult> {
  const files = buildPackageFiles(code);

  let result: any;
  try {
    const resolved = await resolveForFiles(files);
    result = await buildPackage!({
      files,
      network: 'mainnet',
      resolvedDependencies: resolved,
    });
  } catch (err: any) {
    console.warn('[sui-move-builder] Runtime error:', err);
    return {
      success: false,
      error: `Compiler error: ${err?.message || 'unknown runtime error'}`,
    };
  }

  if (result.error || !result.modules) {
    return { success: false, error: formatCompilerError(result.error) };
  }

  for (const check of lesson.checks) {
    if (!check.test(code)) {
      return { success: false, error: check.errorMsg };
    }
  }

  return { success: true, error: null };
}

export const executor = {
  async validate(code: string, lesson: TaskPage): Promise<ValidationResult> {
    if (mode === 'unknown') {
      await tryLoadCompiler();
    }

    if (mode === 'real') {
      return validateWithCompiler(code, lesson);
    }

    return MoveSimulator.validate(code, lesson);
  },

  currentMode(): ExecutorMode {
    return mode;
  },

  prefetch(): void {
    if (mode === 'unknown') tryLoadCompiler();
  },
};
