import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '7.1',
  title: 'Sui Objects',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'What is a Sui Object?',
      content: `Everything you've learned so far — structs, abilities, generics — has been pure Move. Now we connect it to the **Sui blockchain**.

The fundamental difference between Sui and other blockchains is the **object model**. On Sui, assets are **objects** — structs stored on-chain, each with a globally unique ID.

### What makes a struct a Sui object?

Two requirements:

1. The \`key\` ability
2. \`id: UID\` as the **first field**

\`\`\`move
module frontier::fleet;

public struct Ship has key, store {
    id: UID,       // required — must be first
    fuel: u64,
    shields: u64,
}
\`\`\`

That's it. \`Ship\` is now a Sui object. Each \`Ship\` created on-chain will have a unique identity that can never be duplicated.

### Why \`key\` and \`UID\`?

Remember from module 4:
- \`key\` means "this is a top-level on-chain object"
- \`UID\` (Unique IDentifier) is a special Sui framework type — it's guaranteed unique across the entire blockchain
- \`UID\` has **no** \`copy\` or \`drop\` — so objects can never be duplicated or accidentally discarded

### \`store\` — optional but common

Adding \`store\` alongside \`key\` allows the object to be:
- Transferred by **anyone** (not just the defining module)
- Nested inside other objects

Without \`store\`, only the defining module can transfer the object — useful for access control.

| Abilities | Who can transfer | Can nest inside objects |
|-----------|-----------------|----------------------|
| \`key\` only | Only the module | No |
| \`key, store\` | Anyone | Yes |`,
    },
    {
      type: 'TASK',
      title: 'Define a Sui Object',
      content: `Create your first Sui object struct.`,
      task: `Define \`public struct Ship\` with:
- Abilities: \`key, store\`
- Fields: \`id: UID\` (first), \`fuel: u64\`, \`name: vector<u8>\`

All the imports are already provided.`,
      hint: `\`\`\`move
public struct Ship has key, store {
    id: UID,
    fuel: u64,
    name: vector<u8>,
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fleet;

// Define public struct Ship with key, store
// Fields: id: UID, fuel: u64, name: vector<u8>

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fleet\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fleet;' },
        { test: (code: string) => /public\s+struct\s+Ship/.test(code), errorMsg: 'Define: public struct Ship' },
        { test: (code: string) => /has\s+(?:key.*store|store.*key)/.test(code), errorMsg: 'Ship needs both key and store abilities: has key, store' },
        { test: (code: string) => /id\s*:\s*UID/.test(code), errorMsg: 'First field must be: id: UID' },
        { test: (code: string) => /fuel\s*:\s*u64/.test(code), errorMsg: 'Add field: fuel: u64' },
        { test: (code: string) => /name\s*:\s*vector\s*<\s*u8\s*>/.test(code), errorMsg: 'Add field: name: vector<u8>' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
Build Successful
✓ frontier::fleet::Ship is a valid Sui object
  has key + store abilities
  id: UID — globally unique identity on Sui`,
    },
    {
      type: 'LEARN',
      title: 'Creating Objects with TxContext',
      content: `### TxContext — the transaction's identity card

Every Sui transaction carries a **TxContext** — a special value that tracks:
- Who sent the transaction (\`ctx.sender()\`)
- A counter for generating unique IDs

You **cannot** create a \`UID\` without a \`TxContext\`. This is by design — it guarantees every object gets a unique ID tied to a real transaction.

\`\`\`move
module frontier::fleet;

public struct Ship has key, store {
    id: UID,
    fuel: u64,
}

/// Creates a new Ship object
public fun new_ship(fuel: u64, ctx: &mut TxContext): Ship {
    Ship {
        id: object::new(ctx),   // generates a fresh UID
        fuel,
    }
}
\`\`\`

### The pattern: constructor returns the object

Notice that \`new_ship\` **returns** the \`Ship\`. It doesn't store it anywhere yet — the caller decides what to do with it (transfer it, share it, etc.). This separation of "create" and "place" is a core Sui pattern.

### \`ctx.sender()\` — who's calling?

The sender is the address of whoever initiated the transaction:

\`\`\`move
public fun who_am_i(ctx: &TxContext): address {
    ctx.sender()
}
\`\`\`

This is how you know who to send objects to, or who to check permissions for.

### Convention: \`ctx\` is always last

By convention, \`ctx: &mut TxContext\` is always the **last parameter**. You'll see this across all Sui code:

\`\`\`move
public fun mint(name: vector<u8>, fuel: u64, ctx: &mut TxContext)
//                                             ^^^ always last
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Write an Object Constructor',
      content: `Write a constructor function that creates a Sui object.`,
      task: `The \`Beacon\` struct is defined for you. Write a constructor:

\`fun new_beacon(signal: u64, ctx: &mut TxContext): Beacon\`

It should create a \`Beacon\` with:
- \`id\` from \`object::new(ctx)\`
- \`signal\` from the parameter
- \`deployed_by\` from \`ctx.sender()\``,
      hint: `\`\`\`move
fun new_beacon(signal: u64, ctx: &mut TxContext): Beacon {
    Beacon {
        id: object::new(ctx),
        signal,
        deployed_by: ctx.sender(),
    }
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::beacon;

public struct Beacon has key, store {
    id: UID,
    signal: u64,
    deployed_by: address,
}

// Write new_beacon(signal: u64, ctx: &mut TxContext): Beacon
// Use object::new(ctx) for the id
// Use ctx.sender() for deployed_by

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*beacon\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::beacon;' },
        { test: (code: string) => /fun\s+new_beacon\s*\(/.test(code), errorMsg: 'Write a function called new_beacon.' },
        { test: (code: string) => /object\s*::\s*new\s*\(\s*ctx\s*\)/.test(code), errorMsg: 'Create the UID with: object::new(ctx)' },
        { test: (code: string) => /ctx\s*\.\s*sender\s*\(\s*\)|tx_context\s*::\s*sender\s*\(\s*ctx\s*\)/.test(code), errorMsg: 'Get the deployer address with: ctx.sender()' },
        { test: (code: string) => /:\s*Beacon\s*\{/.test(code) || /Beacon\s*\{/.test(code), errorMsg: 'Return a Beacon struct.' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
Build Successful
✓ frontier::beacon::new_beacon compiled
  Creates UID with object::new(ctx)
  Records deployer with ctx.sender()`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 7.1 — Summary',
      content: `- A **Sui object** is a struct with the \`key\` ability and \`id: UID\` as its first field
- \`UID\` is globally unique, has no \`copy\` or \`drop\` — objects can't be duplicated or lost
- Adding \`store\` allows anyone to transfer the object; without it, only the defining module can
- **\`TxContext\`** tracks the current transaction — needed to create UIDs and get the sender
  - \`object::new(ctx)\` — creates a fresh UID
  - \`ctx.sender()\` — returns the transaction sender's address
- Convention: \`ctx: &mut TxContext\` is always the **last parameter**
- Constructor functions **return** the object — the caller decides where it goes`,
    },
  ],
};
export default lesson;
