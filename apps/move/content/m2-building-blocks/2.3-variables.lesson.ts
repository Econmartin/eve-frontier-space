import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '2.3',
  title: 'Variables',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Let Bindings',
      content: `Variables in Move are created with the \`let\` keyword. Every variable must be given a value before you can use it.

\`\`\`move
module frontier::hangar;

fun fuel_report(): u64 {
    let fuel = 100;
    let reserves = 50;
    fuel + reserves
}
\`\`\`

Each \`let\` binding creates a new variable. You can add a **type annotation** after the name, but Move can usually figure out the type on its own:

\`\`\`move
let fuel: u64 = 100;   // explicit type
let fuel = 100;         // type inferred as u64
let fuel = 100u128;     // inferred as u128 (from the suffix)
\`\`\`

### Constants

For values that never change and are shared across functions, use \`const\`. Constants live at the **module level** (outside any function) and are uppercase by convention:

\`\`\`move
module frontier::hangar;

const MAX_FUEL: u64 = 1_000;
const MIN_CREW: u8 = 3;

fun is_full(fuel: u64): bool {
    fuel >= MAX_FUEL
}
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Declare Variables',
      content: `Practice creating variables and using constants.`,
      task: `1. Add a constant \`MAX_CARGO\` with value \`500\`
2. Write a function \`cargo_space\` that takes \`current_load: u64\`, declares a variable \`remaining\` equal to \`MAX_CARGO - current_load\`, and returns \`remaining\``,
      hint: `\`\`\`move
const MAX_CARGO: u64 = 500;

fun cargo_space(current_load: u64): u64 {
    let remaining = MAX_CARGO - current_load;
    remaining
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::cargo;

// Add a constant MAX_CARGO with value 500


// Write cargo_space(current_load) -> u64
// Declare a variable 'remaining' and return it


#[test]
fun test_cargo() {
    assert!(cargo_space(200) == 300, 0);
    assert!(cargo_space(0) == 500, 1);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*cargo\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::cargo;' },
        { test: code => /const\s+MAX_CARGO\s*:\s*u64\s*=\s*500/.test(code), errorMsg: 'Add: const MAX_CARGO: u64 = 500;' },
        { test: code => /fun\s+cargo_space\s*\(/.test(code), errorMsg: 'Write a function called cargo_space.' },
        { test: code => /let\s+/.test(code), errorMsg: 'Use a let binding to declare a variable inside the function.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::cargo::test_cargo
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Mutability',
      content: `By default, variables are **immutable** — once you set a value, you can't change it. This is a safety feature. When you see \`let fuel = 100\`, you know \`fuel\` is \`100\` for its entire lifetime.

If you need to change a variable, add \`mut\`:

\`\`\`move
let fuel = 100;         // immutable — can't change
let mut shields = 50;   // mutable — can change

shields = shields - 10; // OK: shields is now 40
// fuel = 90;           // ERROR: fuel is immutable
\`\`\`

When do you need \`mut\`? Mainly for **counters** and **accumulators** — values that get updated across multiple steps:

\`\`\`move
fun repair_ship(base_hull: u64): u64 {
    let mut hull = base_hull;
    hull = hull + 25;  // first repair
    hull = hull + 25;  // second repair
    hull               // return repaired hull
}
\`\`\`

### Unused variables

The compiler warns about variables you declare but never use. Prefix with \`_\` to suppress this:

\`\`\`move
let _unused = some_value();  // no warning
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Mutable Shields',
      content: `Practice using mutable variables to track changing state.

For example:

\`\`\`move
fun count_up(start: u64): u64 {
    let mut n = start;
    n = n + 1;
    n = n + 1;
    n
}
\`\`\``,
      task: `Write a function \`shield_cycle\` that takes \`shields: u64\`:
1. Store it in a \`let mut\` variable called \`current\`
2. Subtract \`30\` (taking a hit)
3. Add \`50\` (recharging)
4. Return the final value`,
      hint: `\`\`\`move
fun shield_cycle(shields: u64): u64 {
    let mut current = shields;
    current = current - 30;
    current = current + 50;
    current
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::shields;

// Write shield_cycle(shields) -> u64
// Store in mut variable, subtract 30, add 50, return


#[test]
fun test_shields() {
    assert!(shield_cycle(100) == 120, 0);
    assert!(shield_cycle(50) == 70, 1);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*shields\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::shields;' },
        { test: code => /fun\s+shield_cycle\s*\(/.test(code), errorMsg: 'Write a function called shield_cycle.' },
        { test: code => /let\s+mut\s+/.test(code), errorMsg: 'Use let mut to create a mutable variable.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::shields::test_shields
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Scope & the Semicolon Rule',
      content: `Variables only exist inside the **block** (the \`{ }\`) where they're declared. Inner blocks can see outer variables, but not vice versa.

### Blocks are expressions

This is a key Move concept: a block \`{ ... }\` produces a value. The **last expression** (without a semicolon) becomes the block's value:

\`\`\`move
let power = {
    let base = 100;
    let bonus = 50;
    base + bonus    // no semicolon — this is the value
};
// power == 150
\`\`\`

### The semicolon rule

This trips people up at first:
- **No semicolon** on the last line → the value is returned
- **Semicolon** on the last line → the value is thrown away, the block returns nothing

\`\`\`move
let a = { 42 };     // a == 42
let b = { 42; };    // b == () — the value was discarded!
\`\`\`

This is why functions don't need a \`return\` keyword — the last expression in the function body is returned automatically.

### Shadowing

You can declare a new variable with the same name as an existing one. The new one **shadows** the old:

\`\`\`move
let x = 10;
let x = x + 5;   // x is now 15 (new variable, same name)
\`\`\`

This is different from mutation — you're creating a new variable that happens to reuse the name.`,
    },
    {
      type: 'TASK',
      title: 'Fuel Calculator',
      content: `Put it all together — variables, constants, and the semicolon rule.`,
      task: `1. Add a constant \`BURN_RATE\` with value \`10\`
2. Write a function \`fuel_remaining\` that takes \`fuel: u64\` and \`distance: u64\`, and returns the fuel left after the trip
3. The formula is: \`fuel - (distance * BURN_RATE)\``,
      hint: `\`\`\`move
const BURN_RATE: u64 = 10;

fun fuel_remaining(fuel: u64, distance: u64): u64 {
    let cost = distance * BURN_RATE;
    fuel - cost
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::navigation;

// Add a constant BURN_RATE with value 10


// Write fuel_remaining(fuel, distance) -> u64
// Subtract (distance * BURN_RATE) from fuel


#[test]
fun test_fuel() {
    assert!(fuel_remaining(500, 20) == 300, 0);
    assert!(fuel_remaining(100, 5) == 50, 1);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*navigation\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::navigation;' },
        { test: code => /const\s+BURN_RATE\s*:\s*u64\s*=\s*10/.test(code), errorMsg: 'Add: const BURN_RATE: u64 = 10;' },
        { test: code => /fun\s+fuel_remaining\s*\(/.test(code), errorMsg: 'Write a function called fuel_remaining.' },
        { test: code => /BURN_RATE/.test(code) && /fuel_remaining[\s\S]*BURN_RATE/.test(code), errorMsg: 'Use the BURN_RATE constant in your calculation.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::navigation::test_fuel
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 2.3 — Summary',
      content: `Here's what you've learned:

- \`let x = value;\` creates an **immutable** variable
- \`let mut x = value;\` creates a **mutable** variable (can be reassigned)
- Move **infers types** — annotations are optional: \`let x = 100;\` is \`u64\`
- \`const NAME: Type = value;\` declares a module-level constant
- Variables only exist in the **block** where they're declared (scope)
- Blocks are **expressions** — the last line (without \`;\`) is the return value
- A **semicolon** on the last line discards the value
- **Shadowing** lets you reuse a name: \`let x = 1; let x = x + 1;\`
- Prefix unused variables with \`_\` to suppress warnings`,
    },
  ],
};
export default lesson;
