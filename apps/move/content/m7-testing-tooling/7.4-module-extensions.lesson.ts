import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '7.4',
  title: 'Module Extensions',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Extending Modules for Testing',
      content: `What if you need to peek at a struct's private fields during testing — but the module doesn't expose a getter? The answer is \`#[test_only]\` functions placed **inside the module itself**.

\`\`\`move
module frontier::reactor;

public struct Reactor has drop {
    temperature: u64,
}

public fun new(temp: u64): Reactor { Reactor { temperature: temp } }

// Only compiled when running tests — invisible in production
#[test_only]
public fun peek_temp(r: &Reactor): u64 {
    r.temperature
}

#[test]
fun test_reactor() {
    let r = new(500);
    assert!(peek_temp(&r) == 500, 0);
}
\`\`\`

The \`#[test_only]\` attribute tells the compiler to strip this function out of the production build. It exists purely to give tests access to internals that shouldn't be part of the public API.

### What about \`extend module\`?

Move 2024 also supports an \`extend module\` block that adds declarations to a module from outside it — the main use case is adding test helpers to **third-party code you don't own**:

\`\`\`move
#[test_only]
extend module counter::counter {
    public fun peek(c: &Counter): u64 { c.value }
}
\`\`\`

Key rules:
- Extensions can **only add** new items — never modify or remove existing ones
- Only extensions in the **root package** are applied (dependency extensions are ignored)
- Requires the \`#[test_only]\` annotation to stay out of production builds

For modules you own, \`#[test_only]\` functions directly inside the module is the simpler and more common pattern.`,
    },
    {
      type: 'TASK',
      title: 'Test Helper Inside the Module',
      content: `The \`Engine\` module has a struct with private fields. Add a \`#[test_only]\` helper directly inside the module to expose those fields for testing.

For example:

\`\`\`move
#[test_only]
public fun peek_temp(r: &Reactor): u64 {
    r.temperature   // access private field — only in test mode
}
\`\`\``,
      task: `1. Add a \`#[test_only]\` function \`peek_rpm(e: &Engine): u64\` inside \`frontier::engine\` that returns \`e.rpm\`
2. Write a \`#[test]\` function \`test_rev_engine\` that creates an engine with \`new(1000)\`, calls \`rev(&mut engine, 500)\`, then asserts \`peek_rpm\` returns \`1500\``,
      hint: `\`\`\`move
#[test_only]
public fun peek_rpm(e: &Engine): u64 {
    e.rpm
}

#[test]
fun test_rev_engine() {
    let mut e = new(1000);
    rev(&mut e, 500);
    assert!(peek_rpm(&e) == 1500, 0);
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::engine;

public struct Engine has drop {
    rpm: u64,
}

public fun new(rpm: u64): Engine {
    Engine { rpm }
}

public fun rev(e: &mut Engine, amount: u64) {
    e.rpm = e.rpm + amount;
}

// Add: #[test_only] public fun peek_rpm(e: &Engine): u64
// Returns e.rpm — only compiled in test mode


// Write: #[test] fun test_rev_engine
// Create engine at 1000, rev by 500, assert peek_rpm is 1500


`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*engine\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::engine;' },
        { test: (code: string) => /#\[test_only\]/.test(code), errorMsg: 'Mark the helper function with #[test_only].' },
        { test: (code: string) => /fun\s+peek_rpm/.test(code), errorMsg: 'Add a peek_rpm function inside the module.' },
        { test: (code: string) => /fun\s+test_rev_engine/.test(code), errorMsg: 'Write a test called test_rev_engine.' },
        { test: (code: string) => /assert!\s*\(\s*peek_rpm/.test(code), errorMsg: 'Use peek_rpm in your assertion.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::engine::test_rev_engine
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 7.4 — Summary',
      content: `- \`#[test_only]\` functions inside the module are the standard way to expose private fields for testing
- The compiler strips \`#[test_only]\` code from production builds — zero runtime cost
- You can mark functions, imports, and even whole modules as \`#[test_only]\`
- \`extend module\` adds declarations to a module from outside it — useful for testing third-party code
- Extensions can only add, not modify or remove; only root package extensions are applied`,
    },
  ],
};
export default lesson;
