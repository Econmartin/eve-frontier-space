import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '4.3',
  title: 'Error Handling',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Abort & Assert',
      content: `Move uses **abort codes** for error handling. When a function aborts, the entire transaction is reverted — there are no partial state changes.

\`\`\`move
// Direct abort
abort 1;

// assert! is shorthand: aborts if condition is false
assert!(amount > 0, 1);  // abort code 1 if amount == 0
\`\`\`

### Named Error Codes

Use constants for readable error codes:

\`\`\`move
const E_ZERO_AMOUNT: u64 = 1;
const E_INSUFFICIENT_FUEL: u64 = 2;

public fun refuel(amount: u64) {
    assert!(amount > 0, E_ZERO_AMOUNT);
}
\`\`\`

### Move 2024 — #[error] attribute

In Move 2024, you can annotate error constants with \`#[error]\` for better error messages in tooling:

\`\`\`move
#[error]
const E_ZERO: vector<u8> = b"Amount cannot be zero";
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Guard with assert!',
      content: `Protect a function from invalid input by using \`assert!\`.`,
      task: `In module \`errors::demo\`, write a \`public fun\` named \`refuel(amount: u64)\` that uses \`assert!\` to abort with error code \`1\` if \`amount\` is zero.`,
      hint: `\`assert!(amount > 0, 1);\` inside the function body`,
      bonus: null,
      starterCode: `module errors::demo;\n\n// Write: public fun refuel(amount: u64)\n// Use assert! to abort with code 1 if amount == 0\n\n`,
      checks: [
        { test: code => /public\s+fun\s+refuel\s*\(\s*\w+\s*:\s*u64\s*\)/.test(code), errorMsg: 'Write: public fun refuel(amount: u64) { ... }' },
        { test: code => /assert!\s*\(|abort\s+/.test(code), errorMsg: 'Use assert!(amount > 0, 1) inside the function' },
      ],
      successOutput: `$ sui move build\n   Compiling errors v0.0.1\nBuild Successful\n✓ errors::demo::refuel compiled\n  Validates: amount must be > 0\n  Aborts with code 1 if amount == 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 4.3 — Summary',
      content: `- Move uses \`abort\` codes for error handling — the entire transaction reverts on failure
- \`assert!(condition, error_code)\` aborts if the condition is false
- Use named constants (e.g. \`E_ZERO_AMOUNT\`) for readable error codes
- In Move 2024, the \`#[error]\` attribute adds descriptive error messages
- There are no partial state changes — transactions are all-or-nothing`,
    },
  ],
};
export default lesson;
