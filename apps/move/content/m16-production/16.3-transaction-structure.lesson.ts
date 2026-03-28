import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '16.3',
  title: 'Transaction Structure',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Anatomy of a Sui Transaction',
      content: `Every Sui transaction has four key components:

1. **Sender** — the address that initiated the transaction and signs it
2. **Gas payment** — which coin object pays for execution (the sender must own it)
3. **Commands** — one or more operations to execute (Move calls, transfers, etc.)
4. **Inputs** — the objects and pure values that commands operate on

Unlike Ethereum where a transaction calls a single contract function, Sui transactions can bundle **multiple commands** into one atomic unit. This is Sui's superpower for composability.`,
    },
    {
      type: 'LEARN',
      title: 'Programmable Transaction Blocks (PTBs)',
      content: `A single Sui transaction can contain multiple commands that execute in sequence:

| Command | What it does |
|---------|-------------|
| **MoveCall** | Call a Move function |
| **TransferObjects** | Send objects to an address |
| **SplitCoins** | Divide a coin into pieces |
| **MergeCoins** | Combine multiple coins into one |
| **MakeMoveVec** | Create a vector from command results |

The key insight: **results from one command feed into the next**. This lets you compose complex operations without intermediate transactions.

Example flow (pseudocode):
\`\`\`move
// 1. Split 100 MIST from my gas coin
let payment = SplitCoins(my_coin, [100]);
// 2. Buy a ship with that payment
let ship = MoveCall(frontier::shop::buy_ship, [shop, payment]);
// 3. Send the ship to my friend
TransferObjects([ship], friend_address);
\`\`\`

All three commands execute **atomically** — if the buy fails, the split is rolled back too. No half-completed states.

### Why this matters for Move design:
- Prefer \`public fun\` over \`entry fun\` — public functions return values that PTBs can chain
- An \`entry fun\` is a dead end: its results can't flow into the next command
- Design your functions to be composable building blocks, not monolithic endpoints`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 16.3 — Summary',
      content: `- Sui transactions contain: **sender**, **gas payment**, **commands**, and **inputs**
- **Programmable Transaction Blocks (PTBs)** chain multiple commands in one atomic transaction
- Available commands: MoveCall, TransferObjects, SplitCoins, MergeCoins, MakeMoveVec
- Results from one command **feed into the next** — enabling powerful composition
- **All commands succeed or all fail** — no partial execution
- Design with \`public fun\` (not \`entry fun\`) so your functions compose in PTBs`,
    },
  ],
};
export default lesson;
