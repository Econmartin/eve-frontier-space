import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '2.2',
  title: 'Data Types',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: "Move's Type System",
      content: `Move is a **statically typed** language — every value has a type known at compile time. Let's tour the primitive types.

### Integers

Move has six unsigned integer types. Pick the smallest that fits your needs:

\`\`\`move
let a: u8   = 255;      // 0 to 255
let b: u16  = 65535;
let c: u32  = 1_000;    // underscores for readability
let d: u64  = 1_000_000;
let e: u128 = 340_282_366_920_938_463_463;
let f: u256 = 0xFF;     // hex literal
\`\`\`

### Boolean

\`\`\`move
let online: bool = true;
let offline: bool = false;
\`\`\`

### Address

An \`address\` is a 32-byte identifier — used for wallet addresses, package addresses, and object owners:

\`\`\`move
let zero: address = @0x0;
let sui:  address = @0x2;  // Sui framework address
\`\`\`

### No null!

Move has **no null**. Use \`Option<T>\` for optional values — it's either \`some(value)\` or \`none()\`.`,
    },
    {
      type: 'TASK',
      title: 'Return a Typed Value',
      content: `Practice working with u64 by writing a simple function that returns a constant value.`,
      task: `In module \`types::demo\`, write a \`public fun\` named \`max_shields\` that takes no parameters and returns the \`u64\` value \`9999\`.`,
      hint: `\`public fun max_shields(): u64 { 9999 }\``,
      bonus: null,
      starterCode: `module types::demo;

// Write: public fun max_shields(): u64
// Return the u64 value 9999

`,
      checks: [
        { test: code => /module\s+types\s*::\s*demo\s*;/.test(code), errorMsg: 'Keep: module types::demo;' },
        { test: code => /public\s+fun\s+max_shields\s*\(\s*\)\s*:\s*u64/.test(code), errorMsg: 'Write: public fun max_shields(): u64 { ... }' },
        { test: code => /\b9999\b/.test(code), errorMsg: 'The function should return the literal 9999' },
      ],
      successOutput: `$ sui move build
   Compiling types v0.0.1
Build Successful
✓ types::demo::max_shields compiled
  Returns: 9999u64`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 2.2 — Summary',
      content: `- Move has six unsigned integer types: \`u8\`, \`u16\`, \`u32\`, \`u64\`, \`u128\`, \`u256\`
- \`bool\` is the boolean type: \`true\` or \`false\`
- \`address\` is a 32-byte identifier written as \`@0x...\`
- Move has **no null** — use \`Option<T>\` for optional values
- Type annotations use \`name: Type\` syntax`,
    },
  ],
};
export default lesson;
