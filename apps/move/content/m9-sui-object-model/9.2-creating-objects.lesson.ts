import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '9.2',
  title: 'Creating Objects',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Objects = key + UID',
      content: `### What makes a struct an object?

A Sui object is just a Move struct with two requirements:

1. The \`key\` ability
2. \`id: UID\` as the **first field**

That's it. The \`UID\` is a globally unique identifier — no two objects on the entire network can share one.

\`\`\`move
module frontier::ships;

use sui::object::{Self, UID};
use sui::tx_context::TxContext;

public struct Ship has key {
    id: UID,
    name: vector<u8>,
    fuel: u64,
}
\`\`\`

\`Ship\` is now a Sui object. It will get a unique ID, an owner, a version — the full object treatment.

### Creating a UID

You create a \`UID\` with \`object::new(ctx)\`, where \`ctx\` is a mutable reference to the transaction context:

\`\`\`move
let id = object::new(ctx);
\`\`\`

Each call to \`object::new\` produces a fresh, globally unique ID. You can't copy or duplicate UIDs — every object is guaranteed to be unique.

### Structs without \`key\` are not objects

A struct with only \`store\` (or \`drop\`, \`copy\`) is just data — it can live *inside* an object as a field, but it doesn't get its own ID or appear independently on-chain.`,
    },
    {
      type: 'LEARN',
      title: 'TxContext & Constructors',
      content: `### The transaction context

\`TxContext\` is a special Sui type passed to any function that needs to:
- Create objects (via \`object::new(ctx)\`)
- Know the sender's address (via \`ctx.sender()\`)

It's always passed as \`&mut TxContext\` — a mutable reference.

### The constructor pattern

By convention, constructors **return** the object and let the caller decide what to do with it:

\`\`\`move
public fun new(name: vector<u8>, fuel: u64, ctx: &mut TxContext): Ship {
    Ship {
        id: object::new(ctx),
        name,
        fuel,
    }
}
\`\`\`

The caller might transfer it to someone, share it, or freeze it. Separating creation from ownership keeps your code flexible.

### The \`store\` ability and public transfer

Adding \`store\` to your object unlocks **public transfer** — anyone can transfer it, not just your module:

\`\`\`move
// Without store — only your module controls transfers
public struct ClassifiedShip has key {
    id: UID,
    clearance_level: u64,
}

// With store — anyone can transfer freely
public struct CargoShip has key, store {
    id: UID,
    cargo: u64,
}
\`\`\`

Think of \`store\` as "this object is freely tradeable." Without it, your module acts as the gatekeeper for all transfers.`,
    },
    {
      type: 'TASK',
      title: 'Build a Space Station',
      content: `Create a constructor for a space station object.

For example:

\`\`\`move
public fun new(name: vector<u8>, slots: u64, ctx: &mut TxContext): Depot {
    Depot {
        id: object::new(ctx),
        name,
        slots,
        stored: 0,
    }
}
\`\`\``,
      task: `Write the \`new\` function for \`SpaceStation\`. It should:

1. Take \`name: vector<u8>\`, \`capacity: u64\`, and \`ctx: &mut TxContext\`
2. Return a \`SpaceStation\` with \`docked_ships\` starting at \`0\`
3. Create the UID using \`object::new(ctx)\`

The struct and getter functions are provided for you.`,
      hint: `\`\`\`move
public fun new(name: vector<u8>, capacity: u64, ctx: &mut TxContext): SpaceStation {
    SpaceStation {
        id: object::new(ctx),
        name,
        capacity,
        docked_ships: 0,
    }
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::stations;

use sui::object::{Self, UID};
use sui::tx_context::TxContext;

public struct SpaceStation has key, store {
    id: UID,
    name: vector<u8>,
    capacity: u64,
    docked_ships: u64,
}

// Write the \`new\` function here:
// - takes name, capacity, and ctx
// - returns a SpaceStation with docked_ships = 0


public fun name(s: &SpaceStation): &vector<u8> { &s.name }
public fun capacity(s: &SpaceStation): u64 { s.capacity }
public fun docked_ships(s: &SpaceStation): u64 { s.docked_ships }

#[test]
fun test_new_station() {
    let mut ctx = tx_context::dummy();
    let station = new(b"Omega Station", 50, &mut ctx);
    assert!(capacity(&station) == 50, 0);
    assert!(docked_ships(&station) == 0, 1);
    assert!(name(&station) == &b"Omega Station", 2);
    sui::test_utils::destroy(station);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*stations\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::stations;' },
        { test: (code: string) => /public\s+fun\s+new/.test(code), errorMsg: 'Define a public fun new constructor.' },
        { test: (code: string) => /object::new\s*\(\s*ctx\s*\)/.test(code), errorMsg: 'Create the UID with object::new(ctx).' },
        { test: (code: string) => /SpaceStation\s*\{/.test(code), errorMsg: 'Return a SpaceStation struct literal.' },
        { test: (code: string) => /docked_ships\s*:\s*0/.test(code), errorMsg: 'Set docked_ships to 0 in the constructor.' },
        { test: (code: string) => /:\s*SpaceStation\s*/.test(code), errorMsg: 'The function should return a SpaceStation.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::stations::test_new_station
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 9.2 — Summary',
      content: `- A Sui object is a struct with the \`key\` ability and \`id: UID\` as its first field
- \`UID\` is globally unique — created with \`object::new(ctx)\`
- \`TxContext\` provides object creation and the sender's address
- Convention: constructors **return** the object, letting the caller decide ownership
- \`key + store\` = public transfer (anyone can transfer)
- \`key\` only = restricted transfer (only your module controls it)
- Structs without \`key\` are just data — not independent on-chain objects`,
    },
  ],
};
export default lesson;
