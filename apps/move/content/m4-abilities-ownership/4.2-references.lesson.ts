import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '4.2',
  title: 'References & Borrowing',
  time: '~30 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Ownership and Borrowing',
      content: `You've already used \`&Ship\` and \`&mut Ship\` in earlier lessons. Now let's understand **why** references exist and the rules behind them.

### The problem: ownership transfer

When you pass a value to a function **by value**, ownership transfers. The caller can no longer use it:

\`\`\`move
module frontier::refs;

public struct Ship has drop {
    fuel: u64,
}

fun consume_ship(ship: Ship) {
    // ship is owned by this function now
    let Ship { fuel: _ } = ship;
}

fun example() {
    let ship = Ship { fuel: 100 };
    consume_ship(ship);
    // ship is GONE — moved into consume_ship
    // ship.fuel would be a compile error here
}
\`\`\`

This is safe, but inconvenient. What if you just want to **read** a ship's fuel without taking it away?

### The solution: references (borrowing)

A **reference** lets you access a value without taking ownership. The original stays put:

\`\`\`move
fun check_fuel(ship: &Ship): u64 {
    ship.fuel    // read through the reference
}

fun example() {
    let ship = Ship { fuel: 100 };
    let f = check_fuel(&ship);   // borrow ship temporarily
    // ship is still valid here — we only borrowed it
    let f2 = check_fuel(&ship);  // can borrow again!
}
\`\`\`

Two kinds of references:

| Reference | Syntax | What it allows |
|-----------|--------|---------------|
| Immutable | \`&T\` | Read-only access |
| Mutable | \`&mut T\` | Read and write access |

Create them with \`&value\` or \`&mut value\`. Pass them to functions with \`function(&value)\` or \`function(&mut value)\`.`,
    },
    {
      type: 'TASK',
      title: 'Borrow, Don\'t Take',
      content: `Use references to read a struct without consuming it.`,
      task: `Write two functions:

1. \`fun get_shields(ship: &Ship): u64\` — returns the shields value via immutable reference
2. \`fun total_stats(ship: &Ship): u64\` — returns \`fuel + shields\` (calls \`get_shields\` internally and reads \`ship.fuel\` directly)`,
      hint: `\`\`\`move
fun get_shields(ship: &Ship): u64 {
    ship.shields
}

fun total_stats(ship: &Ship): u64 {
    ship.fuel + get_shields(ship)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::scanner;

public struct Ship has copy, drop {
    fuel: u64,
    shields: u64,
}

// Write get_shields(&Ship) -> u64


// Write total_stats(&Ship) -> u64
// Return fuel + shields (use get_shields internally)


#[test]
fun test_borrowing() {
    let ship = Ship { fuel: 80, shields: 120 };
    assert!(get_shields(&ship) == 120, 0);
    assert!(total_stats(&ship) == 200, 1);
    // ship is still valid — we only borrowed it
    assert!(ship.fuel == 80, 2);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*scanner\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::scanner;' },
        { test: (code: string) => /fun\s+get_shields\s*\(\s*\w+\s*:\s*&Ship\s*\)/.test(code), errorMsg: 'Write: fun get_shields(ship: &Ship): u64' },
        { test: (code: string) => /fun\s+total_stats\s*\(\s*\w+\s*:\s*&Ship\s*\)/.test(code), errorMsg: 'Write: fun total_stats(ship: &Ship): u64' },
        { test: (code: string) => /get_shields\s*\(/.test(code) && /total_stats[\s\S]*get_shields/.test(code), errorMsg: 'total_stats should call get_shields internally.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::scanner::test_borrowing
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Mutable References & Dereferencing',
      content: `### Mutable references: read AND write

A mutable reference \`&mut T\` lets you modify the value:

\`\`\`move
module frontier::engineering;

public struct Reactor has drop {
    power: u64,
}

fun boost(reactor: &mut Reactor, amount: u64) {
    reactor.power = reactor.power + amount;
}

fun example() {
    let mut r = Reactor { power: 50 };
    boost(&mut r, 30);
    // r.power is now 80
}
\`\`\`

The original variable must be \`let mut\` to create a \`&mut\` reference from it.

### Dereferencing with \`*\`

The \`*\` operator copies the value behind a reference. The type must have \`copy\`:

\`\`\`move
fun read_power(r: &Reactor): u64 {
    // For struct fields, dot notation auto-dereferences:
    r.power  // same as (*r).power
}

// For simple references to primitives:
fun double(x: &u64): u64 {
    *x * 2   // dereference to get the u64 value
}
\`\`\`

You can also write through a mutable reference to a primitive using \`*ref = value\`:

\`\`\`move
fun reset(x: &mut u64) {
    *x = 0;
}
\`\`\`

### Freeze inference

Move automatically converts \`&mut T\` to \`&T\` when needed. So you can pass a \`&mut Ship\` to a function that expects \`&Ship\`:

\`\`\`move
fun read_only(ship: &Ship): u64 { ship.fuel }

fun example() {
    let mut ship = Ship { fuel: 100 };
    // &mut Ship automatically "freezes" to &Ship:
    let f = read_only(&mut ship);
}
\`\`\`

This means \`&mut T\` is a **subtype** of \`&T\` — it can do everything \`&T\` can, plus writes.`,
    },
    {
      type: 'TASK',
      title: 'Modify Through References',
      content: `Use mutable references to change struct fields and dereference primitives.`,
      task: `Write three functions:

1. \`fun charge(reactor: &mut Reactor, amount: u64)\` — adds \`amount\` to \`power\`
2. \`fun emergency_shutdown(reactor: &mut Reactor)\` — sets \`power\` to \`0\`
3. \`fun power_level(reactor: &Reactor): u64\` — returns the current \`power\``,
      hint: `\`\`\`move
fun charge(reactor: &mut Reactor, amount: u64) {
    reactor.power = reactor.power + amount;
}

fun emergency_shutdown(reactor: &mut Reactor) {
    reactor.power = 0;
}

fun power_level(reactor: &Reactor): u64 {
    reactor.power
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::engineering;

public struct Reactor has copy, drop {
    power: u64,
}

// Write charge(&mut Reactor, amount)


// Write emergency_shutdown(&mut Reactor)
// Set power to 0


// Write power_level(&Reactor) -> u64


#[test]
fun test_reactor() {
    let mut r = Reactor { power: 0 };
    charge(&mut r, 50);
    assert!(power_level(&r) == 50, 0);

    charge(&mut r, 30);
    assert!(power_level(&r) == 80, 1);

    emergency_shutdown(&mut r);
    assert!(power_level(&r) == 0, 2);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*engineering\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::engineering;' },
        { test: (code: string) => /fun\s+charge\s*\(\s*\w+\s*:\s*&mut\s+Reactor/.test(code), errorMsg: 'Write: fun charge(reactor: &mut Reactor, amount: u64)' },
        { test: (code: string) => /fun\s+emergency_shutdown\s*\(\s*\w+\s*:\s*&mut\s+Reactor/.test(code), errorMsg: 'Write: fun emergency_shutdown(reactor: &mut Reactor)' },
        { test: (code: string) => /fun\s+power_level\s*\(\s*\w+\s*:\s*&Reactor/.test(code), errorMsg: 'Write: fun power_level(reactor: &Reactor): u64' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::engineering::test_reactor
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Reference Rules',
      content: `Move enforces strict rules about references to prevent bugs. Here's what you need to know:

### Rule 1: No dangling references

You can never hold a reference to a value that's been moved or destroyed. The compiler checks this at compile time — no runtime crashes.

### Rule 2: References cannot be stored

References are **ephemeral** — they exist only during function execution. You **cannot** put a reference in a struct field:

\`\`\`move
// This will NOT compile:
public struct Bad {
    data: &u64,  // ERROR: references cannot be struct fields
}
\`\`\`

If you need persistent access, store the value itself (with \`store\` ability), not a reference to it.

### Rule 3: Reading requires \`copy\`, writing requires \`drop\`

- Dereferencing \`*ref\` to read a value **copies** it — the type needs \`copy\`
- Assigning \`*ref = new_value\` **replaces** the old value (which gets discarded) — the type needs \`drop\`

For struct fields accessed via dot notation (\`ship.fuel\`), this happens automatically for primitive types since they all have \`copy\` and \`drop\`.

### Summary: when to use what

| Passing style | Syntax | When to use |
|--------------|--------|-------------|
| By value | \`ship: Ship\` | When the function needs to own or destroy the value |
| Immutable ref | \`ship: &Ship\` | When the function only reads the value |
| Mutable ref | \`ship: &mut Ship\` | When the function needs to modify the value |

**Default to \`&T\`** (immutable reference) unless you need mutation. This makes your code's intent clear — readers know immediately whether a function might change the data.`,
    },
    {
      type: 'TASK',
      title: 'Reference Patterns',
      content: `Combine ownership, immutable references, and mutable references in one module.`,
      task: `Write three functions for the \`Cargo\` struct:

1. \`fun new_cargo(weight: u64, fragile: bool): Cargo\` — constructor (returns by value)
2. \`fun is_heavy(cargo: &Cargo): bool\` — returns \`true\` if \`weight > 100\` (read-only)
3. \`fun load_more(cargo: &mut Cargo, extra: u64)\` — adds \`extra\` to \`weight\` (mutation)`,
      hint: `\`\`\`move
fun new_cargo(weight: u64, fragile: bool): Cargo {
    Cargo { weight, fragile }
}

fun is_heavy(cargo: &Cargo): bool {
    cargo.weight > 100
}

fun load_more(cargo: &mut Cargo, extra: u64) {
    cargo.weight = cargo.weight + extra;
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::logistics;

public struct Cargo has copy, drop {
    weight: u64,
    fragile: bool,
}

// Write new_cargo(weight, fragile) -> Cargo


// Write is_heavy(&Cargo) -> bool (weight > 100)


// Write load_more(&mut Cargo, extra)


#[test]
fun test_cargo_refs() {
    let mut c = new_cargo(80, true);
    assert!(is_heavy(&c) == false, 0);

    load_more(&mut c, 50);
    assert!(is_heavy(&c) == true, 1);
    assert!(c.weight == 130, 2);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*logistics\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::logistics;' },
        { test: (code: string) => /fun\s+new_cargo\s*\(/.test(code), errorMsg: 'Write a function called new_cargo.' },
        { test: (code: string) => /fun\s+is_heavy\s*\(\s*\w+\s*:\s*&Cargo/.test(code), errorMsg: 'is_heavy takes an immutable reference: &Cargo' },
        { test: (code: string) => /fun\s+load_more\s*\(\s*\w+\s*:\s*&mut\s+Cargo/.test(code), errorMsg: 'load_more takes a mutable reference: &mut Cargo' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::logistics::test_cargo_refs
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 4.2 — Summary',
      content: `- Passing **by value** (\`ship: Ship\`) transfers ownership — the caller loses the value
- **Immutable reference** (\`&T\`) — read-only borrowing, original stays valid
- **Mutable reference** (\`&mut T\`) — read + write borrowing, original must be \`let mut\`
- Create references: \`&value\` or \`&mut value\`
- **Dereference** with \`*ref\` to copy the underlying value (type needs \`copy\`)
- **Freeze inference**: \`&mut T\` auto-converts to \`&T\` where needed
- References are **ephemeral** — they cannot be stored in struct fields
- Dereferencing to read requires \`copy\`; writing through \`*ref = val\` requires \`drop\`
- **Default to \`&T\`** unless you need mutation`,
    },
  ],
};
export default lesson;
