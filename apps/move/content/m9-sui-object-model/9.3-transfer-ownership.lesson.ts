import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '9.3',
  title: 'Transfer & Ownership',
  time: '~30 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Three Ownership Types',
      content: `### Owned, shared, and frozen

After creating an object, you must decide its ownership. Sui gives you three choices:

| Type | Function | Who can use it | EVE Frontier example |
|------|----------|---------------|---------------------|
| **Owned** | \`transfer::public_transfer(obj, addr)\` | Only the owner | Your personal fighter |
| **Shared** | \`transfer::public_share_object(obj)\` | Anyone | A space station |
| **Frozen** | \`transfer::public_freeze_object(obj)\` | Anyone (read-only) | Published fleet rules |

### Examples

\`\`\`move
module frontier::fleet;

use sui::object::{Self, UID};
use sui::transfer;
use sui::tx_context::TxContext;

public struct Ship has key, store {
    id: UID,
    fuel: u64,
}

public struct Station has key, store {
    id: UID,
    capacity: u64,
}

public struct FleetRules has key, store {
    id: UID,
    max_speed: u64,
}

// Owned — only the sender can use this ship
public fun mint_ship(ctx: &mut TxContext) {
    let ship = Ship { id: object::new(ctx), fuel: 100 };
    transfer::public_transfer(ship, ctx.sender());
}

// Shared — anyone can interact with this station
public fun create_station(ctx: &mut TxContext) {
    let station = Station { id: object::new(ctx), capacity: 50 };
    transfer::public_share_object(station);
}

// Frozen — permanently read-only
public fun publish_rules(ctx: &mut TxContext) {
    let rules = FleetRules { id: object::new(ctx), max_speed: 100 };
    transfer::public_freeze_object(rules);
}
\`\`\`

Once shared, an object **stays** shared. Once frozen, it's frozen forever. Owned objects can be transferred to a new owner or later shared/frozen.`,
    },
    {
      type: 'LEARN',
      title: 'Entry Functions & Object Parameters',
      content: `### \`entry\` functions

An \`entry fun\` is callable directly from a transaction. This is how users interact with your module from the outside:

\`\`\`move
entry fun launch_ship(ctx: &mut TxContext) {
    let ship = Ship { id: object::new(ctx), fuel: 100 };
    transfer::public_transfer(ship, ctx.sender());
}
\`\`\`

### How objects arrive as parameters

When a user calls your function, Sui **loads** the object and passes it in. The reference type determines what you can do:

| Parameter type | Access | Works with |
|---------------|--------|-----------|
| \`&T\` | Read only | Owned, shared, frozen |
| \`&mut T\` | Read & write | Owned, shared |
| \`T\` (by value) | Consume / destroy | Owned only |

### Examples with a Ship

\`\`\`move
// Read-only — check fuel level
entry fun check_fuel(ship: &Ship): u64 {
    ship.fuel
}

// Mutable — refuel the ship
entry fun refuel(ship: &mut Ship) {
    ship.fuel = 100;
}

// By value — scrap the ship permanently
entry fun scrap_ship(ship: Ship) {
    let Ship { id, fuel: _ } = ship;
    id.delete();
}
\`\`\`

**By-value** is destructive — you're consuming the object. To properly destroy it, you must destructure the struct and call \`id.delete()\` on the UID. Sui requires every UID to be explicitly deleted — you can't just drop an object.`,
    },
    {
      type: 'TASK',
      title: 'Fleet Operations',
      content: `Build the core operations for a fleet of fighters.

For example:

\`\`\`move
public fun create_ship(name: vector<u8>, ctx: &mut TxContext) {
    let ship = Ship { id: object::new(ctx), name, fuel: 50 };
    transfer::public_transfer(ship, ctx.sender());
}

public fun refuel(ship: &mut Ship, amount: u64) {
    ship.fuel = ship.fuel + amount;
}

public fun scrap(ship: Ship) {
    let Ship { id, name: _, fuel: _ } = ship;
    id.delete();
}
\`\`\``,
      task: `Write three functions for the \`Fighter\` struct:

1. \`create_fighter(name: vector<u8>, ctx: &mut TxContext)\` — create a Fighter with \`power: 10\` and transfer it to the sender
2. \`upgrade_fighter(fighter: &mut Fighter, power_boost: u64)\` — add \`power_boost\` to the fighter's power
3. \`decommission(fighter: Fighter)\` — destructure the Fighter and delete the UID

The struct and test are provided.`,
      hint: `\`\`\`move
public fun create_fighter(name: vector<u8>, ctx: &mut TxContext) {
    let fighter = Fighter {
        id: object::new(ctx),
        name,
        power: 10,
    };
    transfer::public_transfer(fighter, ctx.sender());
}

public fun upgrade_fighter(fighter: &mut Fighter, power_boost: u64) {
    fighter.power = fighter.power + power_boost;
}

public fun decommission(fighter: Fighter) {
    let Fighter { id, name: _, power: _ } = fighter;
    id.delete();
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fighters;

use sui::object::{Self, UID};
use sui::transfer;
use sui::tx_context::TxContext;

public struct Fighter has key, store {
    id: UID,
    name: vector<u8>,
    power: u64,
}

// Write create_fighter — creates a Fighter with power 10, transfers to sender


// Write upgrade_fighter — takes &mut Fighter and power_boost, adds to power


// Write decommission — takes Fighter by value, destructure and delete UID


public fun power(f: &Fighter): u64 { f.power }

#[test]
fun test_fleet_operations() {
    let mut ctx = tx_context::dummy();
    let mut fighter = Fighter {
        id: object::new(&mut ctx),
        name: b"Viper",
        power: 10,
    };
    assert!(power(&fighter) == 10, 0);
    upgrade_fighter(&mut fighter, 25);
    assert!(power(&fighter) == 35, 1);
    decommission(fighter);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fighters\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fighters;' },
        { test: (code: string) => /public\s+fun\s+create_fighter/.test(code), errorMsg: 'Define a public fun create_fighter.' },
        { test: (code: string) => /public\s+fun\s+upgrade_fighter/.test(code), errorMsg: 'Define a public fun upgrade_fighter.' },
        { test: (code: string) => /public\s+fun\s+decommission/.test(code), errorMsg: 'Define a public fun decommission.' },
        { test: (code: string) => /transfer\s*::\s*public_transfer/.test(code), errorMsg: 'Use transfer::public_transfer to send the fighter to the sender.' },
        { test: (code: string) => /power\s*\+\s*power_boost|power_boost\s*\+\s*power/.test(code) || /fighter\.power\s*=\s*fighter\.power\s*\+\s*power_boost/.test(code), errorMsg: 'Add power_boost to the fighter\'s power field.' },
        { test: (code: string) => /id\s*\.\s*delete\s*\(\s*\)/.test(code) || /object\s*::\s*delete\s*\(\s*id\s*\)/.test(code), errorMsg: 'Delete the UID with id.delete() in decommission.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::fighters::test_fleet_operations
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Public vs Module-Only Transfer',
      content: `### Two flavors of every transfer function

Sui provides paired transfer functions:

| Public version | Module-only version | Requires |
|---------------|-------------------|----------|
| \`transfer::public_transfer\` | \`transfer::transfer\` | \`key + store\` vs \`key\` only |
| \`transfer::public_share_object\` | \`transfer::share_object\` | \`key + store\` vs \`key\` only |
| \`transfer::public_freeze_object\` | \`transfer::freeze_object\` | \`key + store\` vs \`key\` only |

### Why this matters

If your object has \`key + store\`, **anyone** can call \`public_transfer\` on it — your module, other modules, even the user directly. The object moves freely.

If your object has only \`key\` (no \`store\`), only the **module-only** versions work, and they can only be called from within your module. This gives you full control:

\`\`\`move
// Only key — restricted transfer
public struct PilotCredential has key {
    id: UID,
    pilot_name: vector<u8>,
    clearance: u64,
}

// Only YOUR module can issue and transfer credentials
public fun issue(pilot_name: vector<u8>, to: address, ctx: &mut TxContext) {
    let cred = PilotCredential {
        id: object::new(ctx),
        pilot_name,
        clearance: 1,
    };
    // Module-only transfer — works because we're inside the defining module
    transfer::transfer(cred, to);
}
\`\`\`

The pilot can't transfer their credential to someone else. Only your module decides when credentials move. This is the pattern for soulbound tokens, access passes, and anything that shouldn't be freely tradeable.

### The delete pattern

To destroy any object, you must destructure it and explicitly delete the UID:

\`\`\`move
public fun revoke(cred: PilotCredential) {
    let PilotCredential { id, pilot_name: _, clearance: _ } = cred;
    id.delete();
}
\`\`\`

Sui enforces this — you can't just "drop" an object with a UID. Every object must be explicitly accounted for.`,
    },
    {
      type: 'TASK',
      title: 'Restricted Transfer',
      content: `Create a non-transferable credential using module-only transfer.

For example:

\`\`\`move
public fun issue(name: vector<u8>, to: address, ctx: &mut TxContext) {
    let badge = Badge { id: object::new(ctx), name };
    transfer::transfer(badge, to);  // module-only transfer
}

public fun revoke(badge: Badge) {
    let Badge { id, name: _ } = badge;
    id.delete();
}
\`\`\``,
      task: `Write two functions for the \`Credential\` struct (which has \`key\` only — no \`store\`):

1. \`issue(name: vector<u8>, to: address, ctx: &mut TxContext)\` — create a Credential and transfer it using the **module-only** \`transfer::transfer\`
2. \`revoke(cred: Credential)\` — destructure the Credential and delete the UID

Because \`Credential\` lacks \`store\`, only this module can move it.`,
      hint: `\`\`\`move
public fun issue(name: vector<u8>, to: address, ctx: &mut TxContext) {
    let cred = Credential {
        id: object::new(ctx),
        name,
    };
    transfer::transfer(cred, to);
}

public fun revoke(cred: Credential) {
    let Credential { id, name: _ } = cred;
    id.delete();
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::credentials;

use sui::object::{Self, UID};
use sui::transfer;
use sui::tx_context::TxContext;

public struct Credential has key {
    id: UID,
    name: vector<u8>,
}

// Write issue — creates a Credential and transfers using transfer::transfer (not public_transfer)


// Write revoke — destructures the Credential and deletes the UID


public fun name(c: &Credential): &vector<u8> { &c.name }

#[test]
fun test_issue_and_revoke() {
    let mut ctx = tx_context::dummy();
    let sender = ctx.sender();
    issue(b"Commander", sender, &mut ctx);
}

#[test]
fun test_revoke() {
    let mut ctx = tx_context::dummy();
    let cred = Credential {
        id: object::new(&mut ctx),
        name: b"Commander",
    };
    assert!(name(&cred) == &b"Commander", 0);
    revoke(cred);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*credentials\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::credentials;' },
        { test: (code: string) => /public\s+fun\s+issue/.test(code), errorMsg: 'Define a public fun issue.' },
        { test: (code: string) => /public\s+fun\s+revoke/.test(code), errorMsg: 'Define a public fun revoke.' },
        { test: (code: string) => /transfer\s*::\s*transfer\s*\(/.test(code) && !/public_transfer/.test(code.split('fun issue')[1]?.split('fun ')[0] || ''), errorMsg: 'Use transfer::transfer (not public_transfer) in issue — Credential has no store.' },
        { test: (code: string) => /id\s*\.\s*delete\s*\(\s*\)/.test(code) || /object\s*::\s*delete\s*\(\s*id\s*\)/.test(code), errorMsg: 'Delete the UID with id.delete() in revoke.' },
        { test: (code: string) => /let\s+Credential\s*\{/.test(code), errorMsg: 'Destructure the Credential in revoke: let Credential { id, name: _ } = cred;' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::credentials::test_issue_and_revoke
[ PASS ] frontier::credentials::test_revoke
Test result: OK. Total tests: 2; passed: 2; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 9.3 — Summary',
      content: `- Three ownership types: **owned** (\`public_transfer\`), **shared** (\`public_share_object\`), **frozen** (\`public_freeze_object\`)
- Once shared or frozen, the ownership mode is permanent
- \`entry fun\` marks functions callable from transactions
- Object parameter types control access: \`&T\` (read), \`&mut T\` (write), \`T\` (consume)
- By-value parameters destroy the object — you must destructure and call \`id.delete()\`
- **Public** transfer functions require \`key + store\` — anyone can call them
- **Module-only** transfer functions require only \`key\` — only your module controls transfers
- Use module-only transfer for soulbound/non-transferable assets (credentials, access passes)`,
    },
  ],
};
export default lesson;
