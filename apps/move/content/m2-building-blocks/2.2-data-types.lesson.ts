import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '2.2',
  title: 'Data Types',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: "Move's Type System",
      content: `Move is a **statically typed** language — every value has a type that the compiler knows before the code ever runs. If the types don't match, the code won't compile. This catches bugs early.

The name tells you the type: \`u\` means **unsigned** (no negatives), and the number is how many **bits** of storage it uses. More bits = bigger numbers.

Move has these built-in types:

| Type | What it means | What it's for |
|------|--------------|---------------|
| \`u8\` | Unsigned 8-bit integer | Small values (0–255) |
| \`u16\` | Unsigned 16-bit integer | Medium-small values |
| \`u32\` | Unsigned 32-bit integer | Larger counts |
| \`u64\` | Unsigned 64-bit integer | **Most common** — balances, stats, IDs |
| \`u128\` | Unsigned 128-bit integer | Very large numbers |
| \`u256\` | Unsigned 256-bit integer | Cryptographic values |
| \`bool\` | Boolean | \`true\` or \`false\` |
| \`address\` | 32-byte identifier | Wallet & object addresses |
| \`vector<T>\` | Growable list | Collections of same-type values |

We'll focus on **integers** and **booleans** in this lesson. You'll meet \`address\` when we work with objects, and \`vector\` when we cover data structures.`,
    },
    {
      type: 'LEARN',
      title: 'Integers',
      content: `As we saw on the previous page, the \`u\` stands for **unsigned** (no negatives) and the number is the **bits** — more bits means a bigger maximum value.

| Type | Bits | Max value |
|------|------|-----------|
| \`u8\` | 8 | 255 |
| \`u16\` | 16 | 65,535 |
| \`u32\` | 32 | 4,294,967,295 |
| \`u64\` | 64 | ~18.4 quintillion |
| \`u128\` | 128 | Huge — used for precise math |
| \`u256\` | 256 | Enormous — used for crypto values |

**\`u64\` is the workhorse** — you'll use it for most things: ship stats, fuel levels, prices, quantities.

\`\`\`move
module frontier::types;

fun ship_stats(): u64 {
    500    // this is a u64 by default
}

fun crew_count(): u8 {
    12u8   // the u8 suffix forces this to be a u8
}

fun cargo_capacity(): u128 {
    1_000_000u128  // underscores make big numbers readable
}
\`\`\`

A few things to know:
- A plain number like \`500\` defaults to \`u64\`
- Add a **type suffix** to force a different type: \`255u8\`, \`1000u128\`
- Use **underscores** for readability: \`1_000_000\` is the same as \`1000000\`
- **Hex literals** work too: \`0xFF\` (useful for addresses and byte values)
- There are **no negative numbers** in Move — if you need to represent "damage" or "loss", you work with positive values and subtract`,
    },
    {
      type: 'TASK',
      title: 'Return Different Types',
      content: `Practice writing functions that return different integer types.`,
      task: `1. Write a function \`max_shields\` that returns the \`u64\` value \`9999\`
2. Write a function \`min_crew\` that returns the \`u8\` value \`3\``,
      hint: `\`\`\`move
fun max_shields(): u64 {
    9999
}

fun min_crew(): u8 {
    3u8
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::status;

// Write max_shields — returns u64 value 9999


// Write min_crew — returns u8 value 3


#[test]
fun test_types() {
    assert!(max_shields() == 9999, 0);
    assert!(min_crew() == 3u8, 1);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*status\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::status;' },
        { test: code => /fun\s+max_shields\s*\(\s*\)\s*:\s*u64/.test(code), errorMsg: 'Write: fun max_shields(): u64 { ... }' },
        { test: code => /fun\s+min_crew\s*\(\s*\)\s*:\s*u8/.test(code), errorMsg: 'Write: fun min_crew(): u8 { ... }' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::status::test_types
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Booleans',
      content: `The \`bool\` type has exactly two values: \`true\` and \`false\`.

\`\`\`move
module frontier::status;

fun is_docked(): bool {
    true
}

fun is_destroyed(): bool {
    false
}
\`\`\`

Booleans are used with **logical operators**:

- \`&&\` — AND (both must be true)
- \`||\` — OR (at least one must be true)
- \`!\` — NOT (flips true to false and vice versa)

\`\`\`move
fun can_launch(has_fuel: bool, has_pilot: bool): bool {
    has_fuel && has_pilot
}

fun needs_attention(damaged: bool, low_fuel: bool): bool {
    damaged || low_fuel
}

fun is_operational(destroyed: bool): bool {
    !destroyed
}
\`\`\`

You also get booleans from **comparisons**:

- \`==\` equal, \`!=\` not equal
- \`<\` less than, \`>\` greater than
- \`<=\` less or equal, \`>=\` greater or equal

\`\`\`move
fun is_full_crew(crew: u64): bool {
    crew >= 10
}
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Ship Ready Check',
      content: `Combine what you know about integers and booleans.`,
      task: `Write a function \`is_ready\` that takes \`shields: u64\` and \`crew: u8\` and returns \`true\` if shields is greater than \`0\` AND crew is greater than \`0\`.

**Note:** You can't compare \`u64\` and \`u8\` directly — compare each to a zero of its own type (\`0\` for u64, \`0u8\` for u8).`,
      hint: `\`\`\`move
fun is_ready(shields: u64, crew: u8): bool {
    shields > 0 && crew > 0u8
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::launch;

// Write is_ready(shields: u64, crew: u8) -> bool
// Return true if BOTH shields and crew are greater than 0


#[test]
fun test_ready() {
    assert!(is_ready(100, 5u8) == true, 0);
    assert!(is_ready(0, 5u8) == false, 1);
    assert!(is_ready(100, 0u8) == false, 2);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*launch\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::launch;' },
        { test: code => /fun\s+is_ready\s*\(/.test(code), errorMsg: 'Write a function called is_ready.' },
        { test: code => /:\s*bool/.test(code), errorMsg: 'is_ready should return bool.' },
        { test: code => /&&/.test(code), errorMsg: 'Use && to check that BOTH conditions are true.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::launch::test_ready
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 2.2 — Summary',
      content: `Here's what you've learned:

- Move is **statically typed** — every value has a type known at compile time
- **Six integer types**: \`u8\`, \`u16\`, \`u32\`, \`u64\`, \`u128\`, \`u256\` — all unsigned (no negatives)
- \`u64\` is the default and most common integer type
- Use **type suffixes** (\`3u8\`, \`1000u128\`) to specify non-default types
- Use **underscores** for readability: \`1_000_000\`
- \`bool\` is \`true\` or \`false\` — used with \`&&\`, \`||\`, \`!\`
- **Comparisons** (\`==\`, \`!=\`, \`<\`, \`>\`, \`<=\`, \`>=\`) produce booleans
- You can only compare values of the **same type**

**Coming later:** \`address\` (with objects in m6), \`vector\` (in m3)`,
    },
  ],
};
export default lesson;
