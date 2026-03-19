import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '14.3',
  title: 'Randomness',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'On-Chain Random Numbers',
      content: `Randomness on-chain is tricky — if validators can predict outcomes, they can cheat. Sui solves this with a built-in **\`Random\`** system object that provides secure, unbiasable randomness.

### How it works

\`\`\`move
module frontier::random_demo;

use sui::random::{Self, Random};

entry fun random_encounter(r: &Random, ctx: &mut TxContext) {
    let mut gen = random::new_generator(r, ctx);
    let roll = gen.generate_u64_in_range(1, 100);
    // roll is a random number between 1 and 100
}
\`\`\`

Three steps:
1. Accept \`&Random\` as a parameter (shared system object)
2. Create a generator with \`random::new_generator(r, ctx)\`
3. Generate values with \`gen.generate_*()\` methods

### Available generators

| Function | Returns |
|----------|---------|
| \`generate_u8()\` | Random u8 (0-255) |
| \`generate_u64()\` | Random u64 |
| \`generate_u128()\` | Random u128 |
| \`generate_bool()\` | Random true/false |
| \`generate_u8_in_range(min, max)\` | Random u8 in [min, max] |
| \`generate_u64_in_range(min, max)\` | Random u64 in [min, max] |

### Security: entry functions only

Random functions **must be called from \`entry fun\`** — not regular \`public fun\`. This prevents MEV (miner extractable value) attacks where someone could inspect the random result in a composing transaction and abort if they don't like it.

\`\`\`move
// CORRECT: entry fun prevents inspection
entry fun roll_dice(r: &Random, ctx: &mut TxContext) { ... }

// WRONG: public fun allows composability attacks
public fun roll_dice(r: &Random, ctx: &mut TxContext) { ... }
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Loot Drop System',
      content: `Build a loot drop system that assigns random rarity to items.`,
      task: `Write a loot drop function:

1. \`roll_loot(r: &Random, ctx: &mut TxContext): u8\` — an \`entry fun\` that creates a random generator and returns a rarity value from 1 to 5 using \`generate_u8_in_range(1, 5)\``,
      hint: `\`\`\`move
entry fun roll_loot(r: &Random, ctx: &mut TxContext): u8 {
    let mut gen = random::new_generator(r, ctx);
    gen.generate_u8_in_range(1, 5)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::loot_drop;

use sui::random::{Self, Random};

// Write roll_loot — entry fun that returns a random rarity (1-5)
// 1. Create a generator with random::new_generator
// 2. Use generate_u8_in_range(1, 5)

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*loot_drop\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::loot_drop;' },
        { test: (code: string) => /entry\s+fun\s+roll_loot\s*\(/.test(code), errorMsg: 'Write an entry function called roll_loot (must be entry fun for security).' },
        { test: (code: string) => /new_generator/.test(code), errorMsg: 'Use random::new_generator(r, ctx) to create a generator.' },
        { test: (code: string) => /generate_u8_in_range/.test(code), errorMsg: 'Use gen.generate_u8_in_range(1, 5) for rarity values.' },
        { test: (code: string) => /&Random/.test(code), errorMsg: 'Accept &Random as a parameter.' },
        { test: (code: string) => /u8/.test(code), errorMsg: 'The function should return u8.' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
   Build Successful

Loot drop system ready! Rarity rolls: 1 (common) to 5 (legendary).`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 14.3 — Summary',
      content: `- **\`Random\`**: Sui's system object for secure on-chain randomness
- Create a generator: \`random::new_generator(r, ctx)\`
- Generate values: \`generate_u8()\`, \`generate_u64()\`, \`generate_bool()\`, \`generate_u8_in_range(min, max)\`, etc.
- **\`entry fun\` only**: randomness functions must be entry to prevent MEV attacks
- A \`public fun\` using randomness could be composed into a transaction that aborts on unfavorable results
- The Random object is shared — pass it as \`&Random\``,
    },
  ],
};
export default lesson;
