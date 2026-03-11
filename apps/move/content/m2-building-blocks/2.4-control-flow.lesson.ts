import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '2.4',
  title: 'Control Flow',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'If, Loop, and While',
      content: `Move has familiar control flow constructs with a few Move-specific twists.

### If-Else

Parentheses around the condition are **required** in Move:

\`\`\`move
if (fuel > 50) {
    // enough fuel
} else {
    // low fuel
}
\`\`\`

if-else is also an **expression** — it can return a value:

\`\`\`move
let status = if (level > 0) { true } else { false };
\`\`\`

### While Loop

\`\`\`move
let mut i = 0u64;
while (i < 10) {
    i = i + 1;
};
\`\`\`

### For Loop (Move 2024)

\`\`\`move
for (i in 0..10) {
    // i goes from 0 to 9
};
\`\`\`

### Abort

\`abort CODE\` immediately halts execution and reverts all state changes. Use numeric error codes (or named constants):

\`\`\`move
if (fuel == 0) abort 1;
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Write a Conditional',
      content: `Use an if-else expression to make a safety check based on a fuel level.`,
      task: `In module \`flow::check\`, write a \`public fun\` named \`is_safe(level: u64): bool\` that returns \`true\` if \`level\` is greater than \`50\`, and \`false\` otherwise.`,
      hint: `\`if (level > 50) { true } else { false }\``,
      bonus: null,
      starterCode: `module flow::check;

// Write: public fun is_safe(level: u64): bool
// Return true if level > 50, false otherwise

`,
      checks: [
        { test: code => /public\s+fun\s+is_safe\s*\(\s*\w+\s*:\s*u64\s*\)\s*:\s*bool/.test(code), errorMsg: 'Write: public fun is_safe(level: u64): bool { ... }' },
        { test: code => /level\s*>\s*50|50\s*<\s*level/.test(code), errorMsg: 'Compare: level > 50' },
        { test: code => /\btrue\b/.test(code) && /\bfalse\b/.test(code), errorMsg: 'Return true or false based on the condition' },
      ],
      successOutput: `$ sui move build
   Compiling flow v0.0.1
Build Successful
✓ flow::check::is_safe compiled
  is_safe(100) → true
  is_safe(25)  → false`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 2.4 — Summary',
      content: `- \`if (cond) { ... } else { ... }\` — parentheses around condition are required
- if-else is an expression and can return a value
- \`while (cond) { ... }\` for conditional loops
- \`for (x in 0..n) { ... }\` is Move 2024 range syntax
- \`abort CODE\` halts execution and reverts state`,
    },
  ],
};
export default lesson;
