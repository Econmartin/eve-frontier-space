import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '13.1',
  title: 'Balance & Coin',
  time: '~30 min',
  pages: [
    {
      type: 'LEARN',
      title: 'How Tokens Work on Sui',
      content: `Sui uses a **two-layer system** for fungible tokens:

- \`Balance<T>\` — a raw amount (no UID, not an object, just a number with a type tag)
- \`Coin<T>\` — an object wrapping a Balance (has UID, can be owned/transferred)

\`T\` is a **phantom type** that identifies the token (e.g., \`Balance<SUI>\`, \`Coin<FUEL_TOKEN>\`).

Think of \`Balance\` as fuel in a tank and \`Coin\` as a fuel canister you can hand to someone.

| Layer | Has UID? | Transferable? | Use case |
|-------|----------|---------------|----------|
| \`Balance<T>\` | No | No (lives inside structs) | Internal bookkeeping |
| \`Coin<T>\` | Yes | Yes (it's an object) | Sending tokens between addresses |

This separation lets smart contracts store raw amounts internally (\`Balance\`) while users interact with transferable objects (\`Coin\`).`,
    },
    {
      type: 'LEARN',
      title: 'Creating a Currency',
      content: `Creating a new token requires a **One-Time Witness** (from M11):

\`\`\`move
module frontier::fuel_token;

use sui::coin::{Self, TreasuryCap};

public struct FUEL_TOKEN has drop {}

fun init(witness: FUEL_TOKEN, ctx: &mut TxContext) {
    let (treasury_cap, metadata) = coin::create_currency(
        witness,
        9,                          // decimals
        b"FUEL",                    // symbol
        b"Frontier Fuel",           // name
        b"Fuel for frontier ships", // description
        option::none(),             // icon URL
        ctx,
    );
    // Transfer treasury cap to publisher (minting authority)
    transfer::public_transfer(treasury_cap, ctx.sender());
    // Freeze metadata (immutable token info)
    transfer::public_freeze_object(metadata);
}
\`\`\`

Key objects created by \`create_currency\`:

- **\`TreasuryCap<T>\`** — the minting authority. Whoever holds this can mint and burn tokens.
- **\`CoinMetadata<T>\`** — token info (name, symbol, decimals). Usually frozen so it can't change.

The OTW pattern guarantees each token type can only be created once — no one can create a second \`FUEL_TOKEN\` currency.`,
    },
    {
      type: 'LEARN',
      title: 'Minting, Splitting, Merging',
      content: `Once you have a \`TreasuryCap\`, you can mint, burn, split, and merge coins:

\`\`\`move
// Mint a new coin
let coin = coin::mint(&mut treasury_cap, 1000, ctx);

// Split off 300 into a new coin
let split_coin = coin.split(300, ctx);

// Merge two coins together
coin.join(split_coin);

// Convert between Coin and Balance
let bal = coin.into_balance();       // Coin -> Balance
let coin2 = bal.into_coin(ctx);      // Balance -> Coin

// Read the value
let amount = coin2.value();          // works on Coin
\`\`\`

| Operation | Function | Returns |
|-----------|----------|---------|
| Mint | \`coin::mint(&mut cap, amount, ctx)\` | \`Coin<T>\` |
| Burn | \`coin::burn(&mut cap, coin)\` | \`u64\` (amount burned) |
| Split | \`coin.split(amount, ctx)\` | \`Coin<T>\` (the split-off portion) |
| Merge | \`coin.join(other_coin)\` | — (mutates in place) |
| Unwrap | \`coin.into_balance()\` | \`Balance<T>\` |
| Wrap | \`balance.into_coin(ctx)\` | \`Coin<T>\` |
| Read | \`coin.value()\` / \`balance.value()\` | \`u64\` |`,
    },
    {
      type: 'TASK',
      title: 'Mint & Burn Fuel Tokens',
      content: `Write minting and burning functions for a frontier fuel token.`,
      task: `Complete the module by writing two functions:

1. \`mint_fuel(cap: &mut TreasuryCap<FUEL_TOKEN>, amount: u64, recipient: address, ctx: &mut TxContext)\` — mints a coin and transfers it to the recipient
2. \`burn_fuel(cap: &mut TreasuryCap<FUEL_TOKEN>, coin: Coin<FUEL_TOKEN>)\` — burns (destroys) the coin

The OTW struct and init function are provided. Focus on the mint and burn logic.`,
      hint: `\`\`\`move
public fun mint_fuel(
    cap: &mut TreasuryCap<FUEL_TOKEN>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    let coin = coin::mint(cap, amount, ctx);
    transfer::public_transfer(coin, recipient);
}

public fun burn_fuel(
    cap: &mut TreasuryCap<FUEL_TOKEN>,
    coin: Coin<FUEL_TOKEN>,
) {
    coin::burn(cap, coin);
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fuel_token;

use sui::coin::{Self, Coin, TreasuryCap};

public struct FUEL_TOKEN has drop {}

fun init(witness: FUEL_TOKEN, ctx: &mut TxContext) {
    let (treasury_cap, metadata) = coin::create_currency(
        witness,
        9,
        b"FUEL",
        b"Frontier Fuel",
        b"Fuel for frontier ships",
        option::none(),
        ctx,
    );
    transfer::public_transfer(treasury_cap, ctx.sender());
    transfer::public_freeze_object(metadata);
}

// Write mint_fuel — mint a coin and transfer it to recipient


// Write burn_fuel — burn (destroy) the coin

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fuel_token\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fuel_token;' },
        { test: (code: string) => /public\s+struct\s+FUEL_TOKEN\s+has\s+drop/.test(code), errorMsg: 'Keep the FUEL_TOKEN One-Time Witness struct.' },
        { test: (code: string) => /fun\s+mint_fuel\s*\(/.test(code), errorMsg: 'Write a function called mint_fuel.' },
        { test: (code: string) => /fun\s+burn_fuel\s*\(/.test(code), errorMsg: 'Write a function called burn_fuel.' },
        { test: (code: string) => /coin\s*::\s*mint/.test(code), errorMsg: 'Use coin::mint to create the coin.' },
        { test: (code: string) => /transfer\s*::\s*public_transfer/.test(code), errorMsg: 'Use transfer::public_transfer to send the minted coin.' },
        { test: (code: string) => /coin\s*::\s*burn/.test(code), errorMsg: 'Use coin::burn to destroy the coin.' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
   Build Successful

mint_fuel mints and transfers coins to recipients.
burn_fuel destroys coins, reducing total supply.`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 13.1 — Summary',
      content: `- **\`Balance<T>\`** — raw amount, no UID, lives inside structs (internal bookkeeping)
- **\`Coin<T>\`** — object wrapping a Balance, has UID, can be owned and transferred
- **One-Time Witness** creates \`TreasuryCap<T>\` (mint/burn authority) and \`CoinMetadata<T>\` (token info)
- **Mint**: \`coin::mint(&mut cap, amount, ctx)\` returns a new \`Coin<T>\`
- **Burn**: \`coin::burn(&mut cap, coin)\` destroys the coin
- **Split/Merge**: \`coin.split(amount, ctx)\` and \`coin.join(other)\`
- **Convert**: \`coin.into_balance()\` and \`balance.into_coin(ctx)\``,
    },
  ],
};
export default lesson;
