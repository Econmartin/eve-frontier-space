import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '2.4',
  title: 'Math & Comparisons',
  time: '~30 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Arithmetic Operators',
      content: `Move supports the standard math operations. All of these work on integer types (\`u8\` through \`u256\`):

| Operator | What it does | Example |
|----------|-------------|---------|
| \`+\` | Addition | \`10 + 3\` → \`13\` |
| \`-\` | Subtraction | \`10 - 3\` → \`7\` |
| \`*\` | Multiplication | \`10 * 3\` → \`30\` |
| \`/\` | Division (rounds down) | \`10 / 3\` → \`3\` |
| \`%\` | Remainder (modulo) | \`10 % 3\` → \`1\` |

\`\`\`move
module frontier::math;

fun damage_calculation(base: u64, multiplier: u64): u64 {
    let raw = base * multiplier;
    let reduced = raw / 2;
    reduced
}
\`\`\`

### Critical rule: same types only

Both sides of any operation must be the **same type**. You can't add a \`u8\` to a \`u64\`:

\`\`\`move
let a: u64 = 100;
let b: u8 = 5;
// let c = a + b;  // ERROR: mismatched types
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Ship Math',
      content: `Practice the basic arithmetic operators.`,
      task: `Write a function \`combat_rating\` that takes \`weapons: u64\`, \`shields: u64\`, and \`speed: u64\`.

Return the rating using this formula: \`(weapons * 3) + (shields * 2) + speed\``,
      hint: `\`\`\`move
fun combat_rating(weapons: u64, shields: u64, speed: u64): u64 {
    (weapons * 3) + (shields * 2) + speed
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::rating;

// Write combat_rating(weapons, shields, speed) -> u64
// Formula: (weapons * 3) + (shields * 2) + speed


#[test]
fun test_rating() {
    // (10 * 3) + (5 * 2) + 8 = 30 + 10 + 8 = 48
    assert!(combat_rating(10, 5, 8) == 48, 0);
    assert!(combat_rating(0, 0, 0) == 0, 1);
    assert!(combat_rating(1, 1, 1) == 6, 2);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*rating\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::rating;' },
        { test: code => /fun\s+combat_rating\s*\(/.test(code), errorMsg: 'Write a function called combat_rating.' },
        { test: code => /\*\s*3/.test(code) && /\*\s*2/.test(code), errorMsg: 'Use the formula: (weapons * 3) + (shields * 2) + speed' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::rating::test_rating
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Overflow & Casting',
      content: `### Overflow and underflow

Move does **not** silently wrap around like some languages. If a calculation goes below \`0\` or above the type's maximum, the program **aborts** — the transaction fails and all changes are reverted.

\`\`\`move
// These would abort at runtime:
// let x: u8 = 255 + 1;   // overflow — u8 max is 255
// let y: u64 = 0 - 1;    // underflow — can't go below 0
\`\`\`

This is a safety feature — on a blockchain, silent overflow could mean someone gets free tokens.

### Casting between types

Use \`as\` to convert between integer types. The cast will **abort** if the value doesn't fit:

\`\`\`move
let big: u64 = 100;
let small = (big as u8);    // OK: 100 fits in u8

// let too_big: u64 = 300;
// let fail = (too_big as u8);  // ABORT: 300 > 255
\`\`\`

Casting is useful when different parts of your code use different integer sizes.`,
    },
    {
      type: 'TASK',
      title: 'Type Casting',
      content: `Practice casting between integer types with \`as\`.

For example:

\`\`\`move
let value: u64 = 42;
let small = (value as u8);   // narrow: u64 → u8
let big = (value as u128);   // widen:  u64 → u128
\`\`\``,
      task: `Write two functions:
1. \`compress\` — takes \`value: u64\` and returns it cast to \`u8\`
2. \`expand\` — takes \`value: u8\` and returns it cast to \`u64\``,
      hint: `\`\`\`move
fun compress(value: u64): u8 {
    (value as u8)
}

fun expand(value: u8): u64 {
    (value as u64)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::casting;

// Write compress(value: u64) -> u8


// Write expand(value: u8) -> u64


#[test]
fun test_casting() {
    assert!(compress(200) == 200u8, 0);
    assert!(expand(42u8) == 42, 1);
    assert!(expand(compress(100)) == 100, 2);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*casting\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::casting;' },
        { test: code => /fun\s+compress\s*\(/.test(code), errorMsg: 'Write a function called compress.' },
        { test: code => /fun\s+expand\s*\(/.test(code), errorMsg: 'Write a function called expand.' },
        { test: code => /as\s+u8/.test(code), errorMsg: 'Use (value as u8) to cast to u8.' },
        { test: code => /as\s+u64/.test(code), errorMsg: 'Use (value as u64) to cast to u64.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::casting::test_casting
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Comparisons',
      content: `All comparisons return \`bool\` and both sides must be the **same type**:

| Operator | Meaning |
|----------|---------|
| \`==\` | Equal |
| \`!=\` | Not equal |
| \`<\` | Less than |
| \`>\` | Greater than |
| \`<=\` | Less or equal |
| \`>=\` | Greater or equal |

\`\`\`move
let shields: u64 = 75;
let is_low = shields < 25;         // false
let is_full = shields == 100;      // false
let needs_repair = shields <= 50;  // false
let is_damaged = shields < 100;    // true
\`\`\`

You can combine comparisons with the boolean operators from the data types lesson:

\`\`\`move
fun battle_ready(hull: u64, shields: u64, crew: u64): bool {
    hull > 50 && shields > 25 && crew >= 3
}
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Battle Ready Check',
      content: `Use comparisons to check ship conditions.

\`\`\`move
a > 50    // greater than
a < 50    // less than
a >= 3    // greater than or equal
\`\`\``,
      task: `Write a function \`battle_ready\` that takes \`hull: u64\`, \`shields: u64\`, and \`crew: u64\` and returns \`true\` if all three conditions are met:
- hull is greater than \`50\`
- shields is greater than \`25\`
- crew is greater than or equal to \`3\``,
      hint: `\`\`\`move
fun battle_ready(hull: u64, shields: u64, crew: u64): bool {
    hull > 50 && shields > 25 && crew >= 3
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::sensors;

// Write battle_ready(hull, shields, crew) -> bool
// hull > 50 AND shields > 25 AND crew >= 3


#[test]
fun test_ready() {
    assert!(battle_ready(100, 50, 5) == true, 0);
    assert!(battle_ready(40, 50, 5) == false, 1);   // hull too low
    assert!(battle_ready(100, 20, 5) == false, 2);  // shields too low
    assert!(battle_ready(100, 50, 2) == false, 3);  // crew too small
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*sensors\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::sensors;' },
        { test: code => /fun\s+battle_ready\s*\(/.test(code), errorMsg: 'Write a function called battle_ready.' },
        { test: code => /&&/.test(code), errorMsg: 'Use && to combine all three conditions.' },
        { test: code => />=/.test(code), errorMsg: 'Use >= to check crew.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::sensors::test_ready
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Bitwise Operations',
      content: `Move supports **bitwise operators** that work on individual bits — the 1s and 0s that make up every number. These are useful for flags, permissions, and low-level data packing.

*New to binary? [This guide covers the basics of bits and bytes.](https://www.w3schools.com/programming/prog_binary_numbers.php)*

| Operator | Name | What it does |
|----------|------|-------------|
| \`&\` | Bitwise AND | Keeps bits that are 1 in **both** values |
| \`\\|\` | Bitwise OR | Keeps bits that are 1 in **either** value |
| \`^\` | Bitwise XOR | Keeps bits that are 1 in **one but not both** |
| \`<<\` | Left shift | Moves bits left (multiplies by powers of 2) |
| \`>>\` | Right shift | Moves bits right (divides by powers of 2) |

A practical example — using bit flags for ship status:

\`\`\`move
module frontier::flags;

// Each flag is a power of 2 (one bit)
const DOCKED: u8 = 1;      // bit 0: 0000_0001
const SHIELDS_UP: u8 = 2;  // bit 1: 0000_0010
const WEAPONS_HOT: u8 = 4; // bit 2: 0000_0100
const CLOAKED: u8 = 8;     // bit 3: 0000_1000

// Combine flags with OR
fun combat_ready(): u8 {
    SHIELDS_UP | WEAPONS_HOT  // 0000_0110 = 6
}

// Check a flag with AND
fun is_cloaked(status: u8): bool {
    (status & CLOAKED) != 0
}
\`\`\`

**Shift operators** move bits left or right. The right-hand side must always be \`u8\`:

\`\`\`move
fun double(x: u64): u64 {
    x << 1   // shift left by 1 = multiply by 2
}

fun halve(x: u64): u64 {
    x >> 1   // shift right by 1 = divide by 2 (rounds down)
}
\`\`\`

Key rules:
- Both sides of \`&\`, \`|\`, \`^\` must be the same type
- The shift amount (right side of \`<<\` and \`>>\`) must always be \`u8\`
- Bitwise operations never abort — they can't overflow`,
    },
    {
      type: 'TASK',
      title: 'Status Flags',
      content: `Use bitwise operators to manage ship status flags.

\`\`\`move
const ACTIVE: u8 = 1;   // bit 0

// turn on a bit:  value | flag
// check a bit:   (value & flag) != 0
\`\`\``,
      task: `Write two functions using bitwise operators:

1. \`set_flag(status: u8, flag: u8): u8\` — turns on a flag using OR (\`|\`)
2. \`has_flag(status: u8, flag: u8): bool\` — checks if a flag is set using AND (\`&\`)`,
      hint: `\`\`\`move
fun set_flag(status: u8, flag: u8): u8 {
    status | flag
}

fun has_flag(status: u8, flag: u8): bool {
    (status & flag) != 0
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::status;

const DOCKED: u8 = 1;
const SHIELDS_UP: u8 = 2;
const WEAPONS_HOT: u8 = 4;

// Write set_flag(status, flag) -> u8 — turn on a flag with |


// Write has_flag(status, flag) -> bool — check a flag with &


#[test]
fun test_flags() {
    let mut status = 0u8;
    status = set_flag(status, DOCKED);
    assert!(has_flag(status, DOCKED) == true, 0);
    assert!(has_flag(status, SHIELDS_UP) == false, 1);

    status = set_flag(status, SHIELDS_UP);
    assert!(has_flag(status, DOCKED) == true, 2);
    assert!(has_flag(status, SHIELDS_UP) == true, 3);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*status\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::status;' },
        { test: code => /fun\s+set_flag\s*\(/.test(code), errorMsg: 'Write a function called set_flag.' },
        { test: code => /fun\s+has_flag\s*\(/.test(code), errorMsg: 'Write a function called has_flag.' },
        { test: code => /\|/.test(code), errorMsg: 'Use the | (OR) operator in set_flag.' },
        { test: code => /&/.test(code), errorMsg: 'Use the & (AND) operator in has_flag.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::status::test_flags
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 2.4 — Summary',
      content: `Here's what you've learned:

- Arithmetic operators: \`+\`, \`-\`, \`*\`, \`/\` (rounds down), \`%\` (remainder)
- Both sides must be the **same type** — no mixing \`u8\` and \`u64\`
- **Overflow** (going above max) and **underflow** (going below 0) **abort** the program
- Cast between types with \`as\`: \`(value as u8)\` — aborts if value doesn't fit
- Comparison operators: \`==\`, \`!=\`, \`<\`, \`>\`, \`<=\`, \`>=\` — all return \`bool\`
- Combine comparisons with \`&&\` and \`||\`
- **Bitwise operators**: \`&\` (AND), \`|\` (OR), \`^\` (XOR) — work on individual bits
- **Bit flags**: use powers of 2 and \`|\` to combine, \`&\` to check
- **Shift operators**: \`<<\` (left) and \`>>\` (right) — shift amount must be \`u8\``,
    },
  ],
};
export default lesson;
