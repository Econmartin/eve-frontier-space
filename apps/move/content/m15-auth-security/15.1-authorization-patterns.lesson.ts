import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '15.1',
  title: 'Authorization Patterns',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Combining Patterns',
      content: `Real apps combine multiple authorization mechanisms. You've seen some of these individually — now let's layer them together:

1. **Capability objects** (from M11) — transferable authority tokens
2. **Witness types** — prove module identity
3. **Address checks** — simple but inflexible (\`ctx.sender() == admin\`)
4. **Object ownership** — Sui enforces at runtime

Here's a layered example with a fleet hierarchy:

\`\`\`move
module frontier::fleet_command;

// Tier 1: Fleet-wide admin (can do anything)
public struct FleetAdminCap has key, store { id: UID }

// Tier 2: Ship commander (can manage one ship)
public struct CommanderCap has key, store {
    id: UID,
    ship_id: ID,
}

// Only fleet admin can promote commanders
public fun promote(
    _admin: &FleetAdminCap,
    ship_id: ID,
    commander: address,
    ctx: &mut TxContext,
) {
    transfer::public_transfer(
        CommanderCap { id: object::new(ctx), ship_id },
        commander,
    );
}

// Commander can only modify their assigned ship
public fun modify_ship(cap: &CommanderCap, ship: &mut Ship) {
    assert!(object::id(ship) == cap.ship_id, ENotAssigned);
    // make changes...
}
\`\`\`

The admin tier grants broad authority, the commander tier is scoped to a single ship. Sui's ownership model enforces that only the holder of a cap can pass it as an argument.`,
    },
    {
      type: 'LEARN',
      title: 'Role-Based Access Control',
      content: `The pattern above generalizes into **Role-Based Access Control (RBAC)**:

- **One cap type per role** — each role gets its own struct
- **Scoped to specific resources** — caps carry an ID linking them to what they can act on
- **Admin creates lower-level caps** — the hierarchy is enforced by requiring \`&AdminCap\` to mint sub-caps

### Revocation

Revoking access is straightforward:
- **Transfer cap back** — the commander sends their cap back to the admin
- **Destroy it** — if the cap has \`drop\`, the admin can destroy it directly
- **Expiry field** — add a \`valid_until: u64\` epoch and check it in every function

\`\`\`move
public fun revoke_commander(cap: CommanderCap) {
    let CommanderCap { id, ship_id: _ } = cap;
    object::delete(id);
}
\`\`\`

This pattern scales well: add more tiers by creating more cap types, each scoped narrower than the last.`,
    },
    {
      type: 'TASK',
      title: 'Base Defense System',
      content: `Build a hierarchical authorization system for a starbase defense network.`,
      task: `Write a base defense module with two authorization tiers:

1. Define \`BaseAdminCap\` (key, store, with id: UID) and \`GunnerCap\` (key, store, with id: UID and base_id: ID)
2. Write \`assign_gunner(_admin: &BaseAdminCap, base_id: ID, gunner: address, ctx: &mut TxContext)\` — creates a GunnerCap and transfers it to the gunner
3. Write \`fire_turret(cap: &GunnerCap, base: &mut Base)\` — asserts \`cap.base_id == object::id(base)\` using ENotAssigned, then increments \`base.shots_fired\``,
      hint: `\`\`\`move
public struct BaseAdminCap has key, store { id: UID }

public struct GunnerCap has key, store {
    id: UID,
    base_id: ID,
}

public fun assign_gunner(
    _admin: &BaseAdminCap,
    base_id: ID,
    gunner: address,
    ctx: &mut TxContext,
) {
    transfer::public_transfer(
        GunnerCap { id: object::new(ctx), base_id },
        gunner,
    );
}

public fun fire_turret(cap: &GunnerCap, base: &mut Base) {
    assert!(cap.base_id == object::id(base), ENotAssigned);
    base.shots_fired = base.shots_fired + 1;
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::base_defense;

use sui::object::{Self, UID, ID};
use sui::transfer;
use sui::tx_context::TxContext;

const ENotAssigned: u64 = 0;

public struct Base has key {
    id: UID,
    shots_fired: u64,
}

// Define BaseAdminCap (key, store) with id: UID


// Define GunnerCap (key, store) with id: UID and base_id: ID


// Write assign_gunner — creates and transfers a GunnerCap


// Write fire_turret — assert cap.base_id matches, increment shots_fired


#[test_only]
use sui::test_scenario;

#[test]
fun test_assign_and_fire() {
    let admin_addr = @0xAD;
    let gunner_addr = @0x61;

    let mut scenario = test_scenario::begin(admin_addr);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let admin_cap = BaseAdminCap { id: object::new(ctx) };
        let base = Base { id: object::new(ctx), shots_fired: 0 };
        let base_id = object::id(&base);
        assign_gunner(&admin_cap, base_id, gunner_addr, ctx);
        transfer::public_transfer(admin_cap, admin_addr);
        transfer::public_share_object(base);
    };

    test_scenario::next_tx(&mut scenario, gunner_addr);
    {
        let cap = test_scenario::take_from_sender<GunnerCap>(&scenario);
        let mut base = test_scenario::take_shared<Base>(&scenario);
        fire_turret(&cap, &mut base);
        assert!(base.shots_fired == 1, 0);
        test_scenario::return_to_sender(&scenario, cap);
        test_scenario::return_shared(base);
    };

    test_scenario::end(scenario);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*base_defense\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::base_defense;' },
        { test: (code: string) => /struct\s+BaseAdminCap/.test(code), errorMsg: 'Define a struct called BaseAdminCap.' },
        { test: (code: string) => /struct\s+GunnerCap/.test(code), errorMsg: 'Define a struct called GunnerCap.' },
        { test: (code: string) => /base_id\s*:\s*ID/.test(code), errorMsg: 'GunnerCap needs a base_id: ID field.' },
        { test: (code: string) => /fun\s+assign_gunner\s*\(/.test(code), errorMsg: 'Write a function called assign_gunner.' },
        { test: (code: string) => /fun\s+fire_turret\s*\(/.test(code), errorMsg: 'Write a function called fire_turret.' },
        { test: (code: string) => /ENotAssigned/.test(code), errorMsg: 'Use ENotAssigned in your assertion inside fire_turret.' },
        { test: (code: string) => /shots_fired/.test(code), errorMsg: 'Increment base.shots_fired in fire_turret.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::base_defense::test_assign_and_fire
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 15.1 — Summary',
      content: `- **Layer capability objects** for hierarchical access control
- **Scope caps to resources** — include an ID field linking the cap to what it can act on
- **Admin creates lower-level caps** — hierarchy enforced by requiring \`&AdminCap\` to mint sub-caps
- **Revocation**: transfer the cap back, destroy it, or add expiry checks
- Combine patterns (caps + ownership + witness) for defense in depth`,
    },
  ],
};
export default lesson;
