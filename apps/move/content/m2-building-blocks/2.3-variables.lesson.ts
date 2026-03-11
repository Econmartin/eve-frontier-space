import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '2.3',
  title: 'Variables',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Let Bindings',
      content: `Variables in Move are created with the \`let\` keyword. They are **immutable by default**.

\`\`\`move
let fuel: u64 = 100;      // immutable
let mut shields: u64 = 50; // mutable (can be reassigned)
\`\`\`

Move uses **type inference** — you can often omit the type annotation:

\`\`\`move
let fuel = 100u64;  // inferred as u64
let flag = true;    // inferred as bool
\`\`\`

### Constants

Module-level constants use \`const\` and are always uppercase by convention:

\`\`\`move
const MAX_FUEL: u64 = 1_000;
const VERSION: u8 = 1;
\`\`\`

### Unused variables

Prefix an unused variable with \`_\` to suppress compiler warnings:

\`\`\`move
let _unused = some_value();
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Declare and Sum Variables',
      content: `Practice declaring local variables and returning a computed result.`,
      task: `In module \`vars::lesson\`, write a \`public fun\` named \`fuel_calculation\` that: declares \`fuel\` as \`u64\` with value \`100\`, declares \`reserves\` as \`u64\` with value \`50\`, and returns \`fuel + reserves\`.`,
      hint: `\`let fuel: u64 = 100;\` then \`let reserves: u64 = 50;\` then return \`fuel + reserves\``,
      bonus: null,
      starterCode: `module vars::lesson;

// Write public fun fuel_calculation(): u64
// Declare fuel = 100, reserves = 50, return their sum

`,
      checks: [
        { test: code => /public\s+fun\s+fuel_calculation/.test(code), errorMsg: 'Write: public fun fuel_calculation(): u64 { ... }' },
        { test: code => /let\s+(?:mut\s+)?fuel\s*(?::\s*u64)?\s*=\s*100/.test(code), errorMsg: 'Declare: let fuel: u64 = 100;' },
        { test: code => /let\s+(?:mut\s+)?reserves\s*(?::\s*u64)?\s*=\s*50/.test(code), errorMsg: 'Declare: let reserves: u64 = 50;' },
        { test: code => /fuel\s*\+\s*reserves/.test(code), errorMsg: 'Return fuel + reserves' },
      ],
      successOutput: `$ sui move build
   Compiling vars v0.0.1
Build Successful
✓ vars::lesson::fuel_calculation compiled
  Result: 100 + 50 = 150u64`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 2.3 — Summary',
      content: `- \`let x: Type = value;\` binds a value to an immutable variable
- Add \`mut\` for mutable variables: \`let mut x = 5;\`
- Move infers types — \`let x = 5u64;\` works without the annotation
- \`const NAME: Type = value;\` declares a module-level constant
- Prefix unused bindings with \`_\` to suppress warnings`,
    },
  ],
};
export default lesson;
