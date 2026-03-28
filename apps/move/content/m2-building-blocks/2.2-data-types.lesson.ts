import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '2.2',
  title: 'Data Types',
  time: '~30 min',
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
      content: `Combine what you know about integers and booleans.

For example:

\`\`\`move
fun has_fuel(tank: u64): bool {
    tank > 0
}
\`\`\``,
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
      type: 'LEARN',
      title: 'The Address Type',
      content: `\`address\` is a 32-byte identifier that represents a **location** on the blockchain — a wallet, a package, or an object. Think of it like a unique ID in a galactic registry.

Addresses are written with the \`@\` prefix:

\`\`\`move
module frontier::registry;

fun headquarters(): address {
    @0xACE
}

fun is_home_base(location: address): bool {
    location == @0xACE
}
\`\`\`

You've actually been using addresses all along — in \`module frontier::ships\`, the \`frontier\` part is a **named address** defined in the project's \`Move.toml\` file. Named addresses let you write \`@frontier\` instead of a long hex value.

\`\`\`move
let pkg = @frontier;      // named address — resolved at build time
let admin = @0xDEADBEEF;  // hex literal address
let zero = @0x0;          // the zero address
\`\`\`

Key things to know about addresses:
- Compare with \`==\` and \`!=\` — but NOT \`<\`, \`>\`, \`<=\`, \`>=\`
- You **cannot** do math on addresses — no \`+\`, \`-\`, etc.
- They are **opaque** identifiers, not numbers, even though they look like hex values
- Common addresses: \`@0x1\` (standard library), \`@0x2\` (Sui framework)`,
    },
    {
      type: 'TASK',
      title: 'Fleet Registry',
      content: `Practice using address literals and comparison.

For example:

\`\`\`move
const ZERO_ADDR: address = @0x0;

fun is_zero(addr: address): bool {
    addr == ZERO_ADDR
}
\`\`\``,
      task: `1. Declare a constant \`PILOT\` of type \`address\` with the value \`@0xACE\`
2. Write a function \`is_pilot\` that takes \`addr: address\` and returns \`true\` if it matches \`PILOT\``,
      hint: `\`\`\`move
const PILOT: address = @0xACE;

fun is_pilot(addr: address): bool {
    addr == PILOT
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::registry;

// Declare constant PILOT: address = @0xACE


// Write is_pilot(addr: address) -> bool


#[test]
fun test_registry() {
    assert!(is_pilot(@0xACE) == true, 0);
    assert!(is_pilot(@0xDEAD) == false, 1);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*registry\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::registry;' },
        { test: (code: string) => /const\s+PILOT\s*:\s*address\s*=\s*@0xACE/.test(code), errorMsg: 'Declare: const PILOT: address = @0xACE;' },
        { test: (code: string) => /fun\s+is_pilot\s*\(/.test(code), errorMsg: 'Write a function called is_pilot.' },
        { test: (code: string) => /==/.test(code), errorMsg: 'Use == to compare the address.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::registry::test_registry
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Tuples & Unit',
      content: `### Returning multiple values

Sometimes a function needs to return more than one thing. Move supports this with **tuples** — a group of values in parentheses:

*You'll notice \`let\` used below to declare variables — don't worry about it for now, we cover it properly in the next lesson.*

\`\`\`move
module frontier::scanner;

// Returns two values as a tuple
fun ship_status(fuel: u64, shields: u64): (bool, bool) {
    let fuel_ok = fuel > 0;
    let shields_ok = shields > 50;
    (fuel_ok, shields_ok)
}

// Unpack a tuple with let
fun check_readiness(fuel: u64, shields: u64): bool {
    let (fuel_ok, shields_ok) = ship_status(fuel, shields);
    fuel_ok && shields_ok
}
\`\`\`

You **unpack** (also called "destructure") tuples using \`let\` with matching parentheses. Use \`_\` to ignore a value you don't need:

\`\`\`move
let (_, shields_ok) = ship_status(100, 75);
// we only care about shields_ok
\`\`\`

### Unit: the "nothing" type

When a function has no return type, it actually returns \`()\` — the **unit** type (an empty tuple). These are all equivalent:

\`\`\`move
fun log_event() { }           // implicit ()
fun log_event(): () { }       // explicit ()
fun log_event(): () { () }    // very explicit ()
\`\`\`

### Tuple limitations

Tuples in Move are **not** full values like in Python or Rust. They can only be used for multiple return values:
- Cannot be stored in variables (only destructured immediately)
- Cannot be stored in structs
- Cannot be used as generic type arguments`,
    },
    {
      type: 'TASK',
      title: 'Multi-Return Scanner',
      content: `Practice returning multiple values from a function.

For example:

\`\`\`move
fun check(a: u64, b: u64): (bool, u64) {
    let first = a > 0;
    let second = b * 2;
    (first, second)
}
\`\`\``,
      task: `Write a function \`scan_target\` that takes \`distance: u64\` and \`mass: u64\` and returns \`(bool, u64)\`:
- First value: \`true\` if distance is less than \`1000\` (in range), \`false\` otherwise
- Second value: a threat rating calculated as \`mass / (distance + 1)\` (the +1 prevents divide-by-zero)`,
      hint: `\`\`\`move
fun scan_target(distance: u64, mass: u64): (bool, u64) {
    let in_range = distance < 1000;
    let threat = mass / (distance + 1);
    (in_range, threat)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::scanner;

// Write scan_target(distance, mass) -> (bool, u64)
// First: in_range (distance < 1000)
// Second: threat = mass / (distance + 1)


#[test]
fun test_scan() {
    let (in_range, threat) = scan_target(500, 2000);
    assert!(in_range == true, 0);
    assert!(threat == 3, 1);   // 2000 / 501 = 3
}

#[test]
fun test_out_of_range() {
    let (in_range, _threat) = scan_target(2000, 100);
    assert!(in_range == false, 0);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*scanner\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::scanner;' },
        { test: code => /fun\s+scan_target\s*\(/.test(code), errorMsg: 'Write a function called scan_target.' },
        { test: code => /\(\s*bool\s*,\s*u64\s*\)/.test(code), errorMsg: 'Return type should be (bool, u64).' },
        { test: code => /\(\s*\w+\s*,\s*\w+\s*\)/.test(code), errorMsg: 'Return a tuple: (in_range, threat)' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::scanner::test_scan
[ PASS ] frontier::scanner::test_out_of_range
Test result: OK. Total tests: 2; passed: 2; failed: 0`,
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
- \`address\` is a 32-byte identifier for wallets, packages, and objects — written with \`@\` prefix
- **Tuples** let functions return multiple values: \`(bool, u64)\`
- **Unit** \`()\` is the empty tuple — what functions return when they have no return type

**Coming later:** \`vector\` (in m3)`,
    },
  ],
};
export default lesson;
