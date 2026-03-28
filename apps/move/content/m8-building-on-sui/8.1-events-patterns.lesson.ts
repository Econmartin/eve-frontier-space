import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '8.1',
  title: 'Events & Patterns',
  time: '~30 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Emitting Events',
      content: `Your on-chain code runs in silence — no console, no logs. So how do you tell the outside world what happened? **Events**.

Events are structs you **emit** during a transaction. They don't change state — they're broadcast to anyone listening (dApps, indexers, wallets, dashboards).

\`\`\`move
module frontier::fleet;

use sui::event;

public struct ShipLaunched has copy, drop {
    ship_id: address,
    pilot: address,
    fuel: u64,
}

entry fun launch(fuel: u64, ctx: &mut TxContext) {
    let ship = Ship { id: object::new(ctx), fuel };
    let ship_id = object::id_address(&ship);

    event::emit(ShipLaunched {
        ship_id,
        pilot: ctx.sender(),
        fuel,
    });

    transfer::public_transfer(ship, ctx.sender());
}
\`\`\`

### Event struct rules

- Must have \`copy\` and \`drop\` abilities (no \`key\` — events aren't objects)
- Can contain any fields with \`copy\` and \`drop\`
- Emitted with \`event::emit(my_event)\`

### What events look like off-chain

After the transaction, clients can query events via the Sui RPC:

\`\`\`json
{
  "type": "frontier::fleet::ShipLaunched",
  "ship_id": "0xabc...",
  "pilot": "0x123...",
  "fuel": 100
}
\`\`\`

Use events for: trade notifications, game actions, state changes, audit trails — anything the outside world needs to react to.`,
    },
    {
      type: 'TASK',
      title: 'Emit an Event',
      content: `Define an event struct and emit it from a function.

For example:

\`\`\`move
public struct ItemCreated has copy, drop {
    creator: address,
    value: u64,
}

fun create(value: u64, ctx: &TxContext) {
    event::emit(ItemCreated { creator: ctx.sender(), value });
}
\`\`\``,
      task: `Write:

1. \`public struct DockingComplete has copy, drop\` with fields \`station_id: address\` and \`pilot: address\`
2. \`public fun dock(station_id: address, pilot: address)\` that emits a \`DockingComplete\` event`,
      hint: `\`\`\`move
public struct DockingComplete has copy, drop {
    station_id: address,
    pilot: address,
}

public fun dock(station_id: address, pilot: address) {
    event::emit(DockingComplete { station_id, pilot });
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::docking;

use sui::event;

// Define: public struct DockingComplete has copy, drop
// Fields: station_id: address, pilot: address


// Write: public fun dock(station_id: address, pilot: address)
// Emit a DockingComplete event

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*docking\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::docking;' },
        { test: (code: string) => /public\s+struct\s+DockingComplete/.test(code), errorMsg: 'Define: public struct DockingComplete has copy, drop { ... }' },
        { test: (code: string) => /has\s+(?:copy.*drop|drop.*copy)/.test(code), errorMsg: 'DockingComplete needs copy and drop abilities.' },
        { test: (code: string) => /station_id\s*:\s*address/.test(code), errorMsg: 'Add field: station_id: address' },
        { test: (code: string) => /pilot\s*:\s*address/.test(code), errorMsg: 'Add field: pilot: address' },
        { test: (code: string) => /event\s*::\s*emit/.test(code), errorMsg: 'Emit the event with: event::emit(DockingComplete { station_id, pilot })' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
Build Successful
✓ frontier::docking::dock compiled
  Emits DockingComplete event on-chain
  Clients can subscribe via Sui RPC`,
    },
    {
      type: 'LEARN',
      title: 'Module Init & Capability Pattern',
      content: `### \`init\` — runs once when the module is published

Every module can have a special function called \`init\` that runs **exactly once** — when the package is first published to the blockchain. It's used for one-time setup: creating admin capabilities, shared registries, or initial configuration.

\`\`\`move
module frontier::fleet_admin;

public struct AdminCap has key, store {
    id: UID,
}

/// Runs once at publish — creates the admin capability
fun init(ctx: &mut TxContext) {
    let cap = AdminCap { id: object::new(ctx) };
    transfer::transfer(cap, ctx.sender());
}
\`\`\`

Rules for \`init\`:
- Must be called \`init\` (exact name)
- Must be **private** (no \`public\` or \`entry\`)
- Takes \`ctx: &mut TxContext\` as its last (or only) parameter
- Cannot be called manually — only runs at publish time

### The Capability Pattern

A **capability** is an object that proves you have permission to do something. Whoever holds the \`AdminCap\` object can call admin-only functions:

\`\`\`move
/// Only the admin (holder of AdminCap) can set the fuel price
entry fun set_price(
    _cap: &AdminCap,   // proves the caller is admin
    station: &mut FuelStation,
    new_price: u64,
) {
    station.fuel_price = new_price;
}
\`\`\`

The \`_cap: &AdminCap\` parameter doesn't do anything in the function body — its purpose is the **type signature**. Because \`AdminCap\` is an owned object, only its owner can pass it as an argument. This is access control through object ownership.

### Why this pattern works

- \`init\` creates the \`AdminCap\` and sends it to the publisher
- Only the publisher (or whoever they transfer it to) has the \`AdminCap\`
- Functions requiring \`&AdminCap\` can only be called by whoever owns it
- The capability can be transferred to a new admin by transferring the object
- No passwords, no role tables — just object ownership`,
    },
    {
      type: 'TASK',
      title: 'Admin Capability',
      content: `Set up a module with an init function and an admin-only operation.

For example:

\`\`\`move
fun init(ctx: &mut TxContext) {
    let cap = AdminCap { id: object::new(ctx) };
    transfer::transfer(cap, ctx.sender());
}

// Only the AdminCap holder can call this:
entry fun admin_action(_cap: &AdminCap, data: u64) {
    // _cap proves the caller is authorized
}
\`\`\``,
      task: `Write:

1. \`fun init(ctx: &mut TxContext)\` — creates a \`FleetCommand\` and transfers it to the sender using \`transfer::transfer\` (not \`public_transfer\` — we want only this module to control it)
2. \`entry fun promote_pilot(_cmd: &FleetCommand, pilot: address, ctx: &mut TxContext)\` — creates a \`PilotBadge\` and transfers it to the \`pilot\` address using \`transfer::public_transfer\``,
      hint: `\`\`\`move
fun init(ctx: &mut TxContext) {
    let cmd = FleetCommand { id: object::new(ctx) };
    transfer::transfer(cmd, ctx.sender());
}

entry fun promote_pilot(
    _cmd: &FleetCommand,
    pilot: address,
    ctx: &mut TxContext,
) {
    let badge = PilotBadge {
        id: object::new(ctx),
        rank: 1,
    };
    transfer::public_transfer(badge, pilot);
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::command;

public struct FleetCommand has key {
    id: UID,
}

public struct PilotBadge has key, store {
    id: UID,
    rank: u64,
}

// Write: fun init(ctx: &mut TxContext)
// Create FleetCommand, transfer to sender (use transfer::transfer)


// Write: entry fun promote_pilot(_cmd: &FleetCommand, pilot: address, ctx: &mut TxContext)
// Create a PilotBadge with rank 1, transfer to the pilot address

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*command\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::command;' },
        { test: (code: string) => /fun\s+init\s*\(/.test(code), errorMsg: 'Write the init function: fun init(ctx: &mut TxContext)' },
        { test: (code: string) => !/public\s+fun\s+init/.test(code) && !/entry\s+fun\s+init/.test(code), errorMsg: 'init must be private — no public or entry keyword' },
        { test: (code: string) => /transfer\s*::\s*transfer\s*\(/.test(code), errorMsg: 'Transfer FleetCommand with: transfer::transfer(cmd, ctx.sender())' },
        { test: (code: string) => /entry\s+fun\s+promote_pilot/.test(code), errorMsg: 'Write: entry fun promote_pilot(_cmd: &FleetCommand, pilot: address, ctx: &mut TxContext)' },
        { test: (code: string) => /transfer\s*::\s*public_transfer/.test(code), errorMsg: 'Transfer PilotBadge with: transfer::public_transfer(badge, pilot)' },
        { test: (code: string) => /FleetCommand/.test(code) && /PilotBadge/.test(code), errorMsg: 'Use both FleetCommand and PilotBadge structs.' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
Build Successful
✓ frontier::command::init — creates FleetCommand at publish time
✓ frontier::command::promote_pilot — admin-only, requires FleetCommand
  Only the FleetCommand holder can promote pilots`,
    },
    {
      type: 'REVIEW',
      title: 'Course Complete!',
      content: `Congratulations — you've completed the **Move on Sui** fundamentals course!

### What you've learned

**Move language** (modules 1–6):
- Modules, functions, types, variables, and control flow
- Structs, vectors, and enums — custom data structures
- Abilities — \`copy\`, \`drop\`, \`store\`, \`key\` — controlling what values can do
- References — borrowing values without taking ownership
- Error handling — \`assert!\`, \`abort\`, error constants
- Generics — writing code that works with any type, phantom types
- Standard library — \`Option\`, \`String\`, imports
- Method syntax and index syntax
- Unit testing — \`#[test]\`, \`#[expected_failure]\`, \`#[test_only]\`, testing patterns

**Sui blockchain** (modules 7–8):
- Sui objects — \`key\`, \`UID\`, \`TxContext\`
- Ownership — owned, shared, and frozen objects
- Transfer — \`public_transfer\`, \`public_share_object\`, \`public_freeze_object\`
- Entry functions — the gateway between off-chain and on-chain
- Events — broadcasting what happened to the outside world
- Init functions — one-time setup at publish
- Capability pattern — access control through object ownership

### What's next?

You now have the fundamentals to explore more advanced Sui topics in the dedicated **Sui Development** course:

- Dynamic fields and table storage
- Coin and token standards
- Programmable transaction blocks
- The Witness and One-Time Witness patterns
- Package upgrades`,
    },
  ],
};
export default lesson;
