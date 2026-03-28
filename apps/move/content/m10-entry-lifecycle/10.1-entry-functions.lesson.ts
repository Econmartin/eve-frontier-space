import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '10.1',
  title: 'Entry Functions',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Transaction Boundaries',
      content: `When you call a function from a wallet, CLI, or dApp, you're creating a **transaction**. But not every Move function can be called this way — only functions marked with the \`entry\` keyword.

### \`entry fun\` vs \`public fun\`

- \`entry fun\` — callable directly from transactions (wallets, CLI, dApps)
- \`public fun\` — callable from other Move code, but NOT directly from transactions (unless also \`entry\`)
- \`public entry fun\` — both: callable from transactions AND from other modules

\`\`\`move
module frontier::hangar;

// Called directly from a transaction
entry fun park_ship(hangar: &mut Hangar, ship: Ship) {
    hangar.ships.push_back(ship);
}

// Public for composability — other modules can call this too
public fun ship_count(hangar: &Hangar): u64 {
    hangar.ships.length()
}
\`\`\`

### How objects arrive as \`entry\` function parameters

The Sui runtime resolves objects for you based on their ownership:

| Object type | How you pass it | What happens |
|---|---|---|
| **Owned** | by value (\`Ship\`) or by ref (\`&mut Ship\`) | Caller must own it; passed from their wallet |
| **Shared** | by ref (\`&mut GameState\`) | Runtime provides access; anyone can use it |
| **Frozen** | by immutable ref (\`&Config\`) | Always \`&T\` — nobody can mutate it |

Since Move 2024, \`entry\` functions **can return values**. This is essential for Programmable Transaction Blocks (PTBs), where the result of one command feeds into the next.

**Best practice:** prefer \`public fun\` over \`entry fun\` for composability. Use \`entry\` only when you need to restrict a function to transaction-level calls.`,
    },
    {
      type: 'TASK',
      title: 'Launch a Ship',
      content: `Write an \`entry\` function that removes a ship from a hangar by index and returns it.

For example:

\`\`\`move
entry fun grab_item(bag: &mut ItemBag, idx: u64): Item {
    bag.items.swap_remove(idx)
}
\`\`\``,
      task: `Complete the \`entry fun launch\` function:
1. It takes \`hangar: &mut Hangar\` and \`idx: u64\`
2. It removes the ship at \`idx\` from \`hangar.ships\` using \`swap_remove\`
3. It returns the removed \`Ship\``,
      hint: `\`\`\`move
entry fun launch(hangar: &mut Hangar, idx: u64): Ship {
    hangar.ships.swap_remove(idx)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::hangar;

public struct Ship has drop, store {
    hull: u64,
}

public struct Hangar has key {
    id: UID,
    ships: vector<Ship>,
}

// Remove and return the ship at \`idx\`
// Hint: use swap_remove(idx)
entry fun launch(hangar: &mut Hangar, idx: u64): Ship {
    // your code here
}

public fun ship_count(hangar: &Hangar): u64 {
    hangar.ships.length()
}
`,
      checks: [
        { test: (code: string) => /entry\s+fun\s+launch/.test(code), errorMsg: 'Declare the function as entry fun launch.' },
        { test: (code: string) => /hangar\s*:\s*&mut\s+Hangar/.test(code), errorMsg: 'The first parameter should be hangar: &mut Hangar.' },
        { test: (code: string) => /swap_remove/.test(code), errorMsg: 'Use swap_remove(idx) to remove the ship from the vector.' },
        { test: (code: string) => /:\s*Ship\s*\{/.test(code) || /:\s*Ship\s*$/.test(code.split('\n').find(l => l.includes('fun launch')) || ''), errorMsg: 'The function should return a Ship.' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
   Build Successful

Ship at index 0 removed from hangar and returned to caller's transaction.`,
    },
    {
      type: 'LEARN',
      title: 'Programmable Transaction Blocks (PTBs)',
      content: `One of Sui's most powerful features is that a single transaction can contain **multiple commands**. These are called **Programmable Transaction Blocks** (PTBs).

Results from one command can feed directly into the next — all within a single atomic transaction:

\`\`\`move
// Single transaction with 3 commands:
// 1. Split off 100 units
let coin = split(my_coin, 100);
// 2. Buy a ship with that coin
let ship = buy_ship(shop, coin);
// 3. Equip it immediately
equip_shield(ship, my_shield);
\`\`\`

This is why \`public fun\` returning values is so powerful. Each function is a building block that PTBs can chain together.

### Design for composability

Write small functions that do one thing and return useful results:

\`\`\`move
module frontier::shipyard;

// Each function is a composable building block
public fun build_hull(ctx: &mut TxContext): Ship { /* ... */ }
public fun install_engine(ship: &mut Ship, class: u8) { /* ... */ }
public fun install_shields(ship: &mut Ship, power: u64) { /* ... */ }
public fun commission(fleet: &mut Fleet, ship: Ship) { /* ... */ }
\`\`\`

A dApp can combine these into one transaction:
\`\`\`move
let ship = build_hull();
install_engine(ship, 3);
install_shields(ship, 500);
commission(fleet, ship);
\`\`\`

All four steps succeed or fail **together** — no half-built ships floating around.

**Key insight:** you rarely need \`entry\` if your functions are \`public\`. PTBs can call \`public fun\` directly. Reserve \`entry\` for functions you want to restrict from being called by other modules.`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 10.1 — Summary',
      content: `- \`entry fun\` marks functions callable directly from transactions (wallets, CLI, dApps)
- \`public fun\` is callable from other Move modules and from PTBs
- \`entry\` functions can return values (since Move 2024) for use in PTBs
- Object parameter modes depend on ownership: owned by value/ref, shared by ref, frozen as \`&T\`
- **Programmable Transaction Blocks** chain multiple commands in a single atomic transaction
- Results from one command feed into the next
- Prefer \`public fun\` over \`entry fun\` for maximum composability
- Use \`entry\` only to restrict a function to direct transaction calls`,
    },
  ],
};
export default lesson;
