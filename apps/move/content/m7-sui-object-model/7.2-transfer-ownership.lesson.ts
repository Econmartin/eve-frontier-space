import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '7.2',
  title: 'Transfer & Ownership',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Three Types of Ownership',
      content: `After creating an object, you must **decide its fate**. On Sui, every object has one of three ownership types:

### 1. Owned — belongs to a specific address

\`\`\`move
transfer::public_transfer(ship, @0xALICE);
\`\`\`

Only the owner can use this object in transactions. Think of it like a physical item in your pocket — only you can hand it to someone else.

### 2. Shared — accessible by anyone

\`\`\`move
transfer::public_share_object(scoreboard);
\`\`\`

Any address can read or modify this object. Think of it like a public bulletin board — anyone can write on it. Shared objects are used for things like marketplaces, game state, or governance.

### 3. Frozen — immutable, readable by all

\`\`\`move
transfer::public_freeze_object(config);
\`\`\`

Once frozen, no one can modify the object — ever. It becomes a permanent read-only reference. Use this for configuration, published rules, or reference data.

### Choosing the right ownership

| Use case | Ownership | Why |
|----------|-----------|-----|
| A pilot's ship | Owned | Only the pilot should control it |
| A fleet leaderboard | Shared | All pilots need to update scores |
| Combat rules / physics constants | Frozen | Rules shouldn't change after deployment |

### \`public_transfer\` vs \`transfer\`

You'll see two versions of each function:
- \`transfer::public_transfer\` — works on objects with \`key + store\`. Anyone can call this.
- \`transfer::transfer\` — works on objects with just \`key\`. Only the defining module can call this.

The same pattern applies: \`public_share_object\` vs \`share_object\`, \`public_freeze_object\` vs \`freeze_object\`.`,
    },
    {
      type: 'TASK',
      title: 'Mint & Transfer',
      content: `Create an object and send it to the transaction sender — the standard "mint" pattern.

For example:

\`\`\`move
entry fun mint(data: u64, ctx: &mut TxContext) {
    let obj = MyObject { id: object::new(ctx), data };
    transfer::public_transfer(obj, ctx.sender());
}
\`\`\``,
      task: `The \`PilotBadge\` struct is defined for you. Write an entry function:

\`entry fun mint(rank: u64, ctx: &mut TxContext)\`

1. Create a \`PilotBadge\` with \`object::new(ctx)\` for the id and \`rank\` from the parameter
2. Transfer it to the sender using \`transfer::public_transfer\` and \`ctx.sender()\``,
      hint: `\`\`\`move
entry fun mint(rank: u64, ctx: &mut TxContext) {
    let badge = PilotBadge {
        id: object::new(ctx),
        rank,
    };
    transfer::public_transfer(badge, ctx.sender());
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::badges;

public struct PilotBadge has key, store {
    id: UID,
    rank: u64,
}

// Write: entry fun mint(rank: u64, ctx: &mut TxContext)
// Create a PilotBadge and transfer it to the sender

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*badges\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::badges;' },
        { test: (code: string) => /entry\s+fun\s+mint/.test(code), errorMsg: 'Write: entry fun mint(rank: u64, ctx: &mut TxContext)' },
        { test: (code: string) => /object\s*::\s*new\s*\(\s*ctx\s*\)/.test(code), errorMsg: 'Create a UID with: object::new(ctx)' },
        { test: (code: string) => /transfer\s*::\s*public_transfer/.test(code), errorMsg: 'Transfer with: transfer::public_transfer(badge, ctx.sender())' },
        { test: (code: string) => /ctx\s*\.\s*sender\s*\(\s*\)|tx_context\s*::\s*sender\s*\(\s*ctx\s*\)/.test(code), errorMsg: 'Get the sender with: ctx.sender()' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
Build Successful
✓ frontier::badges::mint compiled
  Creates PilotBadge with object::new(ctx)
  Transfers to transaction sender
  PilotBadge is now an owned Sui object`,
    },
    {
      type: 'LEARN',
      title: 'Entry Functions & Object Parameters',
      content: `### \`entry\` functions — the transaction boundary

An \`entry fun\` can be called directly from a Sui transaction (from a wallet, dApp, or CLI). This is the gateway between the off-chain world and your on-chain code.

\`\`\`move
module frontier::fleet;

/// Anyone can call this from a transaction
entry fun launch_ship(fuel: u64, ctx: &mut TxContext) {
    let ship = Ship {
        id: object::new(ctx),
        fuel,
    };
    transfer::public_transfer(ship, ctx.sender());
}
\`\`\`

### Receiving objects as parameters

Entry functions can also **receive** existing objects. Sui automatically loads them from on-chain storage:

\`\`\`move
/// Takes an existing Ship and refuels it
entry fun refuel(ship: &mut Ship, amount: u64) {
    ship.fuel = ship.fuel + amount;
}
\`\`\`

When someone calls \`refuel\` in a transaction, they specify which \`Ship\` object (by ID). Sui loads it, passes it in, and saves the changes after.

The parameter type tells Sui what access you need:

| Parameter type | Access | What happens after |
|---------------|--------|-------------------|
| \`ship: &Ship\` | Read-only | Object unchanged |
| \`ship: &mut Ship\` | Read + write | Changes saved back |
| \`ship: Ship\` | Full ownership | Object consumed — you must transfer, share, freeze, or delete it |

### Shared objects in entry functions

For shared objects, anyone can pass them as arguments:

\`\`\`move
/// Any pilot can add their score to the shared scoreboard
entry fun record_score(board: &mut Scoreboard, score: u64) {
    board.scores.push_back(score);
}
\`\`\`

This only works if \`Scoreboard\` was previously shared with \`transfer::public_share_object\`.`,
    },
    {
      type: 'TASK',
      title: 'Shared Object Pattern',
      content: `Create a shared object that anyone can interact with.

For example:

\`\`\`move
entry fun create_board(ctx: &mut TxContext) {
    let board = Scoreboard { id: object::new(ctx), count: 0 };
    transfer::public_share_object(board);   // shared: anyone can use it
}

entry fun increment(board: &mut Scoreboard) {
    board.count = board.count + 1;
}
\`\`\``,
      task: `The \`FuelStation\` struct is defined. Write two entry functions:

1. \`entry fun create_station(fuel_price: u64, ctx: &mut TxContext)\` — creates a \`FuelStation\` with the given price, \`reserve\` of \`1000\`, and **shares** it using \`transfer::public_share_object\`
2. \`entry fun buy_fuel(station: &mut FuelStation, amount: u64)\` — reduces the station's \`reserve\` by \`amount\` (assert \`reserve >= amount\` with error code \`EOutOfFuel\`)`,
      hint: `\`\`\`move
entry fun create_station(fuel_price: u64, ctx: &mut TxContext) {
    let station = FuelStation {
        id: object::new(ctx),
        fuel_price,
        reserve: 1000,
    };
    transfer::public_share_object(station);
}

entry fun buy_fuel(station: &mut FuelStation, amount: u64) {
    assert!(station.reserve >= amount, EOutOfFuel);
    station.reserve = station.reserve - amount;
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::station;

const EOutOfFuel: u64 = 0;

public struct FuelStation has key, store {
    id: UID,
    fuel_price: u64,
    reserve: u64,
}

// Write: entry fun create_station(fuel_price: u64, ctx: &mut TxContext)
// Create a FuelStation with reserve 1000, then share it


// Write: entry fun buy_fuel(station: &mut FuelStation, amount: u64)
// Assert reserve >= amount (error: EOutOfFuel), then reduce reserve

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*station\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::station;' },
        { test: (code: string) => /entry\s+fun\s+create_station/.test(code), errorMsg: 'Write: entry fun create_station(fuel_price: u64, ctx: &mut TxContext)' },
        { test: (code: string) => /transfer\s*::\s*public_share_object/.test(code), errorMsg: 'Share the station with: transfer::public_share_object(station)' },
        { test: (code: string) => /entry\s+fun\s+buy_fuel/.test(code), errorMsg: 'Write: entry fun buy_fuel(station: &mut FuelStation, amount: u64)' },
        { test: (code: string) => /assert!\s*\(/.test(code), errorMsg: 'Assert that the station has enough fuel: assert!(station.reserve >= amount, EOutOfFuel)' },
        { test: (code: string) => /reserve\s*=\s*\w+\.reserve\s*-|\.reserve\s*=.*-\s*amount/.test(code), errorMsg: 'Reduce the reserve: station.reserve = station.reserve - amount' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
Build Successful
✓ frontier::station::create_station — creates and shares a FuelStation
✓ frontier::station::buy_fuel — anyone can buy fuel from the shared station`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 7.2 — Summary',
      content: `- Every object must be **owned**, **shared**, or **frozen** after creation
  - **Owned**: \`transfer::public_transfer(obj, address)\` — only the owner can use it
  - **Shared**: \`transfer::public_share_object(obj)\` — anyone can use it
  - **Frozen**: \`transfer::public_freeze_object(obj)\` — immutable, readable by all
- \`public_*\` versions work on \`key + store\` objects; non-public versions need the defining module
- **\`entry fun\`** — callable directly from Sui transactions (wallets, dApps, CLI)
- Entry functions can receive existing objects as parameters:
  - \`&Object\` — read-only
  - \`&mut Object\` — read + write (changes saved)
  - \`Object\` — takes ownership (must be transferred, shared, frozen, or deleted)
- Convention: \`ctx: &mut TxContext\` is always the last parameter`,
    },
  ],
};
export default lesson;
