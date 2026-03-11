import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '2.1',
  title: 'Functions',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Defining Functions',
      content: `Functions are the core building block of any Move module. They are declared with the \`fun\` keyword.

\`\`\`move
module math::ops;

fun add(a: u64, b: u64): u64 {
    a + b
}
\`\`\`

Notice that Move uses **implicit returns** — the last expression in a function is automatically returned (no \`return\` keyword needed, though you can use it).

### Visibility Modifiers

Functions have three visibility levels:

- \`fun\` — private to the module (default)
- \`public fun\` — callable from any other module
- \`entry fun\` — callable directly from Sui transactions (CLI or SDK)

### Return Types

Specify the return type after \`->\`:

\`\`\`move
public fun fuel_level(): u64 {
    100
}
\`\`\`

If a function returns nothing, omit the \`->\` entirely.`,
    },
    {
      type: 'TASK',
      title: 'Write a Public Function',
      content: `A module with no public functions can't do anything useful. Let's add one. Write a function that takes two \`u64\` values and returns their sum.`,
      task: `In module \`math::ops\`, write a \`public fun\` named \`add\` that takes two \`u64\` parameters (\`a\` and \`b\`) and returns \`a + b\`.`,
      hint: `\`public fun add(a: u64, b: u64): u64 { a + b }\``,
      bonus: null,
      starterCode: `module math::ops;

// Write a public function called 'add'
// that takes two u64 parameters and returns their sum

`,
      checks: [
        { test: code => /module\s+math\s*::\s*ops\s*;/.test(code), errorMsg: 'Keep the module declaration: module math::ops;' },
        { test: code => /public\s+fun\s+add\s*\(\s*\w+\s*:\s*u64\s*,\s*\w+\s*:\s*u64\s*\)\s*:\s*u64/.test(code), errorMsg: 'Write: public fun add(a: u64, b: u64): u64 { ... }' },
        { test: code => /\ba\s*\+\s*b\b/.test(code), errorMsg: 'The function body should return a + b' },
      ],
      successOutput: `$ sui move build
   Compiling math v0.0.1
Build Successful
✓ math::ops::add compiled
  Signature: (u64, u64) -> u64`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 2.1 — Summary',
      content: `- Functions are declared with the \`fun\` keyword
- \`public fun\` is callable from other modules
- \`entry fun\` is callable from Sui transactions
- Return type follows \`->\` after the parameter list
- The last expression is returned implicitly (no \`return\` needed)`,
    },
  ],
};
export default lesson;
