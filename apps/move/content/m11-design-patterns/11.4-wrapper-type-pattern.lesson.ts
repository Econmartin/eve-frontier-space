import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '11.4',
  title: 'Wrapper Type Pattern',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Wrapping Objects',
      content: `A **wrapper** is a struct that contains another object as a field. Wrapping "hides" the inner object from external access — only the wrapper module can reach it.

\`\`\`move
module frontier::vault;

public struct Vault has key {
    id: UID,
    ship: Ship,      // wrapped — only this module can access
    locked: bool,
}

public fun lock(ship: Ship, ctx: &mut TxContext): Vault {
    Vault { id: object::new(ctx), ship, locked: true }
}

public fun unlock(vault: Vault): Ship {
    let Vault { id, ship, locked: _ } = vault;
    id.delete();
    ship
}
\`\`\`

When a Ship is inside a Vault, no one can access it directly. The wrapper module decides who gets access and when.

**Common accessor patterns:**
- \`inner(&self): &T\` — read-only peek at the wrapped object
- \`inner_mut(&mut self): &mut T\` — mutable access to the wrapped object
- \`into_inner(self): T\` — unwrap and consume the wrapper

This pattern is used for vaults, escrow systems, timelocks, and any scenario where you want to control access to an object.`,
    },
    {
      type: 'TASK',
      title: 'Build a Lockbox',
      content: `Create a Lockbox wrapper that can hold a Ship, let you peek inside, and unlock it to get the Ship back.`,
      task: `Write a \`Lockbox\` wrapper:

1. Define \`Ship\` with \`key, store\` abilities, fields: \`id: UID\`, \`name: vector<u8>\`
2. Define \`Lockbox\` with \`key\` ability, fields: \`id: UID\`, \`ship: Ship\`
3. \`lock(ship: Ship, ctx: &mut TxContext): Lockbox\` — wraps the ship in a Lockbox
4. \`peek(lockbox: &Lockbox): &Ship\` — returns a reference to the inner ship
5. \`unlock(lockbox: Lockbox): Ship\` — destructures the Lockbox, deletes the UID, returns the Ship`,
      hint: `\`\`\`move
public struct Ship has key, store {
    id: UID,
    name: vector<u8>,
}

public struct Lockbox has key {
    id: UID,
    ship: Ship,
}

public fun lock(ship: Ship, ctx: &mut TxContext): Lockbox {
    Lockbox { id: object::new(ctx), ship }
}

public fun peek(lockbox: &Lockbox): &Ship {
    &lockbox.ship
}

public fun unlock(lockbox: Lockbox): Ship {
    let Lockbox { id, ship } = lockbox;
    id.delete();
    ship
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::lockbox;

// Define Ship — key, store, has UID and name: vector<u8>


// Define Lockbox — key, has UID and ship: Ship


// lock: wraps a Ship in a Lockbox


// peek: returns &Ship from a &Lockbox


// unlock: destructures Lockbox, deletes UID, returns Ship

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*lockbox\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::lockbox;' },
        { test: (code: string) => /struct\s+Ship\s+has\s+key\s*,\s*store/.test(code), errorMsg: 'Define Ship with key, store abilities.' },
        { test: (code: string) => /struct\s+Lockbox\s+has\s+key/.test(code), errorMsg: 'Define Lockbox with key ability.' },
        { test: (code: string) => /fun\s+lock\s*\(/.test(code), errorMsg: 'Write a function called lock.' },
        { test: (code: string) => /fun\s+peek\s*\(/.test(code), errorMsg: 'Write a function called peek.' },
        { test: (code: string) => /fun\s+unlock\s*\(/.test(code), errorMsg: 'Write a function called unlock.' },
        { test: (code: string) => /&\s*Ship/.test(code), errorMsg: 'peek should return a reference &Ship.' },
        { test: (code: string) => /let\s+Lockbox\s*\{/.test(code), errorMsg: 'Destructure the Lockbox in unlock to extract the Ship.' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
Build Successful`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 11.4 — Summary',
      content: `- **Wrappers** are structs that contain other objects as fields
- Wrapping hides the inner object — only the wrapper module controls access
- Common accessors: \`inner(&self): &T\`, \`inner_mut(&mut self): &mut T\`, \`into_inner(self): T\`
- Destructure the wrapper and delete its UID to unwrap
- Used for vaults, escrow, timelocks, and access-controlled storage`,
    },
  ],
};
export default lesson;
