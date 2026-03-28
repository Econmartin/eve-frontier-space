import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '5.3',
  title: 'Method Syntax',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Dot-Notation Method Calls',
      content: `You've been writing \`v.push_back(42)\` and \`v.length()\` since module 3. You've also called \`opt.is_some()\` and \`name.length()\` in the last lesson. This dot-notation is called **method syntax** — and it's time to understand how it works.

### The rule

If a function's **first parameter** is a type defined in the **same module**, you can call it with dot notation:

\`\`\`move
module frontier::counter;

public struct Counter has drop {
    value: u64,
}

// These are regular functions...
public fun new(): Counter { Counter { value: 0 } }

public fun increment(c: &mut Counter) {
    c.value = c.value + 1;
}

public fun get(c: &Counter): u64 {
    c.value
}
\`\`\`

But because the first parameter is \`Counter\` (or a reference to it), you can call them with dot notation:

\`\`\`move
let mut c = Counter::new();
c.increment();          // same as increment(&mut c)
let val = c.get();      // same as get(&c)
\`\`\`

The compiler automatically takes a reference based on the function signature:
- First param is \`&Counter\` → auto-borrows immutably
- First param is \`&mut Counter\` → auto-borrows mutably
- First param is \`Counter\` → takes ownership (moves)

### This is what vector has been doing all along

\`\`\`move
// These pairs are equivalent:
v.push_back(42);           // method syntax
vector::push_back(&mut v, 42);   // function syntax

v.length();                // method syntax
vector::length(&v);        // function syntax

v.is_empty();              // method syntax
vector::is_empty(&v);      // function syntax
\`\`\`

Method syntax is just **sugar** — it compiles to the same code. Use whichever reads better.`,
    },
    {
      type: 'TASK',
      title: 'Define Methods',
      content: `Write functions that can be called with method syntax on your own struct.

For example:

\`\`\`move
public struct Counter has drop { value: u64 }

public fun new(): Counter { Counter { value: 0 } }
public fun increment(c: &mut Counter) { c.value = c.value + 1; }
public fun get(c: &Counter): u64 { c.value }

// These can all be called with dot notation:
// let mut c = Counter::new();
// c.increment();   // same as increment(&mut c)
// let v = c.get(); // same as get(&c)
\`\`\``,
      task: `Write three functions for the \`FuelTank\` struct:

1. \`public fun new(capacity: u64): FuelTank\` — creates a tank with the given capacity and \`level\` starting at \`0\`
2. \`public fun fill(tank: &mut FuelTank, amount: u64)\` — adds amount to level (cap at capacity)
3. \`public fun percentage(tank: &FuelTank): u64\` — returns \`(level * 100) / capacity\`

The test uses method syntax to call them: \`tank.fill(50)\`, \`tank.percentage()\`.`,
      hint: `\`\`\`move
public fun new(capacity: u64): FuelTank {
    FuelTank { capacity, level: 0 }
}

public fun fill(tank: &mut FuelTank, amount: u64) {
    tank.level = tank.level + amount;
    if (tank.level > tank.capacity) {
        tank.level = tank.capacity;
    };
}

public fun percentage(tank: &FuelTank): u64 {
    (tank.level * 100) / tank.capacity
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fuel_system;

public struct FuelTank has drop {
    capacity: u64,
    level: u64,
}

// Write public fun new(capacity) -> FuelTank (level starts at 0)


// Write public fun fill(&mut FuelTank, amount) — cap at capacity


// Write public fun percentage(&FuelTank) -> u64 — (level * 100) / capacity


#[test]
fun test_fuel_tank() {
    // Method syntax works because first param is FuelTank/&FuelTank/&mut FuelTank
    let mut tank = FuelTank::new(200);
    assert!(tank.percentage() == 0, 0);

    tank.fill(50);
    assert!(tank.percentage() == 25, 1);

    tank.fill(300);  // should cap at capacity
    assert!(tank.percentage() == 100, 2);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fuel_system\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fuel_system;' },
        { test: (code: string) => /public\s+fun\s+new\s*\(/.test(code), errorMsg: 'Write: public fun new(capacity: u64): FuelTank' },
        { test: (code: string) => /public\s+fun\s+fill\s*\(\s*\w+\s*:\s*&mut\s+FuelTank/.test(code), errorMsg: 'Write: public fun fill(tank: &mut FuelTank, amount: u64)' },
        { test: (code: string) => /public\s+fun\s+percentage\s*\(\s*\w+\s*:\s*&FuelTank/.test(code), errorMsg: 'Write: public fun percentage(tank: &FuelTank): u64' },
        { test: (code: string) => /capacity/.test(code) && /level/.test(code), errorMsg: 'Use the capacity and level fields.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::fuel_system::test_fuel_tank
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Index Syntax & Standard Library Methods',
      content: `### Index syntax

You've been using \`v[0]\` to read vector elements. This is **index syntax** — sugar for borrowing:

\`\`\`move
let v = vector[10, 20, 30];

v[0]         // reads value — same as *vector::borrow(&v, 0)
&v[1]        // borrows — same as vector::borrow(&v, 1)
&mut v[2]    // mutable borrow — same as vector::borrow_mut(&mut v, 2)

v[1] = 99;   // write — same as *vector::borrow_mut(&mut v, 1) = 99
\`\`\`

Out-of-bounds access aborts at runtime, just like calling the underlying functions directly.

### Standard library overview

Here's a reference table of the modules you'll use most:

| Module | Key items | What it's for |
|--------|----------|---------------|
| \`std::vector\` | \`push_back\`, \`pop_back\`, \`length\`, \`is_empty\`, \`contains\` | Growable lists |
| \`std::option\` | \`Option<T>\`, \`some\`, \`none\`, \`is_some\`, \`borrow\`, \`extract\` | Optional values |
| \`std::string\` | \`String\`, \`utf8\`, \`append\`, \`length\`, \`bytes\` | UTF-8 text |
| \`std::ascii\` | \`String\` (ASCII), \`string\` | ASCII-only text |
| \`std::type_name\` | \`get<T>()\` | Runtime type reflection |
| \`std::debug\` | \`print\` | Debugging output |

On Sui, additional modules:

| Module | Key items | What it's for |
|--------|----------|---------------|
| \`sui::object\` | \`UID\`, \`new\`, \`delete\` | Object identity |
| \`sui::transfer\` | \`transfer\`, \`share_object\`, \`freeze_object\` | Moving objects between owners |
| \`sui::tx_context\` | \`TxContext\`, \`sender\` | Transaction metadata |
| \`sui::event\` | \`emit\` | Emitting on-chain events |

You'll work with the Sui modules hands-on in modules 7 and 8.`,
    },
    {
      type: 'TASK',
      title: 'Combine It All',
      content: `Use method syntax, index syntax, and standard library types together.

For example:

\`\`\`move
use std::option::{Self, Option};

fun first_item(v: &vector<u64>): Option<u64> {
    if (v.is_empty()) {       // method syntax
        option::none()
    } else {
        option::some(v[0])    // index syntax
    }
}
\`\`\``,
      task: `Write a function \`fun highest_rank(ranks: &vector<u64>): Option<u64>\` that:
- Returns \`option::none()\` if the vector is empty
- Otherwise, iterates the vector to find the highest value and returns \`option::some(highest)\`

Use method syntax (\`ranks.length()\`, \`ranks.is_empty()\`) and index syntax (\`ranks[i]\`).`,
      hint: `\`\`\`move
fun highest_rank(ranks: &vector<u64>): Option<u64> {
    if (ranks.is_empty()) {
        return option::none()
    };
    let mut highest = ranks[0];
    let mut i = 1;
    while (i < ranks.length()) {
        if (ranks[i] > highest) {
            highest = ranks[i];
        };
        i = i + 1;
    };
    option::some(highest)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::rankings;

use std::option::{Self, Option};

// Write highest_rank(&vector<u64>) -> Option<u64>
// Empty vector -> none, otherwise -> some(highest value)


#[test]
fun test_highest() {
    let ranks = vector[3u64, 7, 2, 9, 1];
    let result = highest_rank(&ranks);
    assert!(result.is_some(), 0);
    assert!(*result.borrow() == 9, 1);

    let empty: vector<u64> = vector[];
    assert!(highest_rank(&empty).is_none(), 2);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*rankings\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::rankings;' },
        { test: (code: string) => /fun\s+highest_rank\s*\(/.test(code), errorMsg: 'Write a function called highest_rank.' },
        { test: (code: string) => /Option\s*<\s*u64\s*>/.test(code), errorMsg: 'Return type should be Option<u64>.' },
        { test: (code: string) => /option\s*::\s*some/.test(code) && /option\s*::\s*none/.test(code), errorMsg: 'Use option::some() and option::none() for the return values.' },
        { test: (code: string) => /while\s*\(/.test(code) || /for\s*\(/.test(code), errorMsg: 'Use a loop to iterate through the vector.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::rankings::test_highest
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 5.3 — Summary',
      content: `- **Method syntax**: if a function's first param is your type, call it with dot notation: \`counter.increment()\`
- The compiler auto-borrows based on the function signature (\`&T\`, \`&mut T\`, or by value)
- Methods must be defined in the **same module** as the struct
- **Index syntax**: \`v[i]\` reads, \`&v[i]\` borrows, \`v[i] = val\` writes
- Standard library essentials: \`std::vector\`, \`std::option\`, \`std::string\`
- Sui framework modules (\`sui::object\`, \`sui::transfer\`, etc.) are covered in later modules
- Method and index syntax are **sugar** — they compile to regular function calls`,
    },
  ],
};
export default lesson;
