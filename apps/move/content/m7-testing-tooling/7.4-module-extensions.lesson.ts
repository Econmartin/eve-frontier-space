import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '7.4',
  title: 'Module Extensions',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Extending Modules for Testing',
      content: `What if you need to peek at a struct's private fields during testing — but the module doesn't provide a getter? Move has **module extensions** that let you add new functions to an existing module, as if you wrote them inside it.

Extensions use the \`extend\` keyword and must always have a mode annotation:

\`\`\`move
#[test_only]
extend module frontier::reactor {
    // This function is added to the reactor module — it can access private fields!
    public fun peek_temp(r: &Reactor): u64 {
        r.temperature
    }
}
\`\`\`

Now in your tests, you can call \`reactor.peek_temp()\` even though it wasn't in the original module.

Rules:
- Extensions can only **add** — never modify or remove existing code
- Must have a mode annotation (\`#[test_only]\`, \`#[mode(debug)]\`, etc.)
- Only extensions in the **root package** are applied (not from dependencies)
- Added code follows the same rules as if it were in the original module

This is powerful for testing library code you don't own:

\`\`\`move
// You imported counter::counter from a library
// It has no way to peek at the value...

#[test_only]
extend module counter::counter {
    public fun peek(c: &Counter): u64 { c.value }
}

// Now your tests can inspect Counter internals!
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Extend for Testing',
      content: `The \`Engine\` module has a struct with private fields. Use \`extend module\` to add a test helper, then write a test.`,
      task: `1. Write a \`#[test_only] extend module frontier::engine\` block that adds \`public fun peek_rpm(e: &Engine): u64\` returning \`e.rpm\`
2. Write a \`#[test]\` function \`test_rev_engine\` that creates an engine with \`new(1000)\`, calls \`rev(&mut engine, 500)\`, then asserts \`peek_rpm\` returns \`1500\``,
      hint: `\`\`\`move
#[test_only]
extend module frontier::engine {
    public fun peek_rpm(e: &Engine): u64 {
        e.rpm
    }
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

// Write: #[test_only] extend module frontier::engine { ... }
// Add: public fun peek_rpm(e: &Engine): u64 — returns e.rpm


// Write: #[test] fun test_rev_engine
// Create engine at 1000, rev by 500, assert peek_rpm is 1500


`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*engine\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::engine;' },
        { test: (code: string) => /extend\s+module/.test(code), errorMsg: 'Use extend module to add the test helper.' },
        { test: (code: string) => /#\[test_only\]/.test(code), errorMsg: 'Mark the extension with #[test_only].' },
        { test: (code: string) => /fun\s+peek_rpm/.test(code), errorMsg: 'Add a peek_rpm function in the extension.' },
        { test: (code: string) => /fun\s+test_rev_engine/.test(code), errorMsg: 'Write a test called test_rev_engine.' },
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
      content: `- \`extend module\` adds new declarations to an existing module
- Must have a mode annotation (e.g., \`#[test_only]\`)
- Can only add — never modify or remove
- Only root package extensions are applied
- Perfect for adding test helpers that access private fields
- Extension code follows the same rules as the original module`,
    },
  ],
};
export default lesson;
