import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '2.4',
  title: 'Math & Comparisons',
  time: '~20 min',
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
      title: 'Safe Damage',
      content: `Underflow is a common trap — subtracting more than you have aborts the program. Let's write a safe version.`,
      task: `Write a function \`apply_damage\` that takes \`hull: u64\` and \`damage: u64\`:
- If damage is greater than or equal to hull, return \`0\` (ship destroyed)
- Otherwise return \`hull - damage\`

This prevents the underflow abort.`,
      hint: `\`\`\`move
fun apply_damage(hull: u64, damage: u64): u64 {
    if (damage >= hull) {
        0
    } else {
        hull - damage
    }
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::damage;

// Write apply_damage(hull, damage) -> u64
// If damage >= hull, return 0
// Otherwise return hull - damage


#[test]
fun test_damage() {
    assert!(apply_damage(100, 30) == 70, 0);
    assert!(apply_damage(50, 50) == 0, 1);
    assert!(apply_damage(30, 100) == 0, 2);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*damage\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::damage;' },
        { test: code => /fun\s+apply_damage\s*\(/.test(code), errorMsg: 'Write a function called apply_damage.' },
        { test: code => /if\s*\(/.test(code), errorMsg: 'Use an if/else to check before subtracting.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::damage::test_damage
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
      title: 'Ship Status Checker',
      content: `Combine comparisons and casting to build a status report.`,
      task: `1. Write \`threat_level\` that takes \`distance: u64\` and returns a \`u8\`:
   - Distance < 10 → return \`3u8\` (critical)
   - Distance < 50 → return \`2u8\` (warning)
   - Otherwise → return \`1u8\` (safe)
2. Write \`is_critical\` that takes \`distance: u64\` and returns \`true\` if the threat level is \`3u8\``,
      hint: `\`\`\`move
fun threat_level(distance: u64): u8 {
    if (distance < 10) {
        3u8
    } else if (distance < 50) {
        2u8
    } else {
        1u8
    }
}

fun is_critical(distance: u64): bool {
    threat_level(distance) == 3u8
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::sensors;

// Write threat_level(distance) -> u8
// < 10 = 3 (critical), < 50 = 2 (warning), else = 1 (safe)


// Write is_critical(distance) -> bool
// Returns true if threat_level is 3


#[test]
fun test_threat() {
    assert!(threat_level(5) == 3u8, 0);
    assert!(threat_level(30) == 2u8, 1);
    assert!(threat_level(100) == 1u8, 2);
}

#[test]
fun test_critical() {
    assert!(is_critical(5) == true, 0);
    assert!(is_critical(50) == false, 1);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*sensors\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::sensors;' },
        { test: code => /fun\s+threat_level\s*\(/.test(code), errorMsg: 'Write a function called threat_level.' },
        { test: code => /fun\s+is_critical\s*\(/.test(code), errorMsg: 'Write a function called is_critical.' },
        { test: code => /:\s*u8/.test(code), errorMsg: 'threat_level should return u8.' },
        { test: code => /threat_level\s*\(/.test(code) && /is_critical[\s\S]*threat_level/.test(code), errorMsg: 'is_critical should call threat_level.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::sensors::test_threat
[ PASS ] frontier::sensors::test_critical
Test result: OK. Total tests: 2; passed: 2; failed: 0`,
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
- Combine comparisons with \`&&\` and \`||\``,
    },
  ],
};
export default lesson;
