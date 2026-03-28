import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '15.2',
  title: 'Object Capability',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Capability-Based Security Model',
      content: `Sui's object model naturally supports the **Object Capability** security paradigm. The key principle: **access to an object IS the authorization** — no separate permission system needed.

If you have the object reference, you can use it. If you don't, you can't.

\`\`\`move
module frontier::ship_ops;

// The ShipKey IS the permission to operate the ship
public struct ShipKey has key, store {
    id: UID,
    ship_id: ID,
}

// Having &ShipKey proves you can operate this ship
public fun operate(key: &ShipKey, ship: &mut Ship) {
    assert!(object::id(ship) == key.ship_id, EWrongKey);
    // operate ship...
}
\`\`\`

### Benefits

- **No centralized permission table** to maintain or query
- **Delegation is just transferring** the cap object to another address
- **Revocation is destroying** or reclaiming the cap
- **Composable**: functions that accept \`&Cap\` work the same whether called directly or from another module via a PTB`,
    },
    {
      type: 'LEARN',
      title: 'Delegation Patterns',
      content: `Once you think of objects as capabilities, delegation becomes natural:

### Temporary Delegation
Lend via \`&Cap\` reference within a single transaction (using Programmable Transaction Blocks):

\`\`\`move
// Caller passes &key — borrower can use it but can't keep it
public fun temporary_access(key: &ShipKey, ship: &mut Ship) {
    assert!(object::id(ship) == key.ship_id, EWrongKey);
    // do work with borrowed authority...
}
\`\`\`

### Permanent Delegation
Transfer the cap object entirely — the new owner has full authority:

\`\`\`move
public fun delegate_permanently(key: ShipKey, new_pilot: address) {
    transfer::public_transfer(key, new_pilot);
}
\`\`\`

### Scoped Delegation
Create a new, limited cap from an admin cap — the derived cap has narrower authority:

\`\`\`move
public fun create_scoped_key(
    master: &MasterKey,
    zone: u64,
    ctx: &mut TxContext,
): ZoneKey {
    ZoneKey {
        id: object::new(ctx),
        master_id: object::id(master),
        zone,
    }
}
\`\`\`

Choose the delegation style based on how much trust and how much time the delegate needs.`,
    },
    {
      type: 'TASK',
      title: 'Delegation System',
      content: `Build a key delegation system with master keys and scoped access keys.

For example:

\`\`\`move
public struct OwnerKey has key, store { id: UID }

public struct RoomKey has key, store {
    id: UID,
    room: u64,
}

public fun make_owner_key(ctx: &mut TxContext): OwnerKey {
    OwnerKey { id: object::new(ctx) }
}

public fun make_room_key(_owner: &OwnerKey, room: u64, ctx: &mut TxContext): RoomKey {
    RoomKey { id: object::new(ctx), room }
}

public fun has_room_access(key: &RoomKey, room: u64): bool {
    key.room == room
}
\`\`\``,
      task: `Write a delegation module:

1. Define \`MasterKey\` (key, store, with id: UID) and \`AccessKey\` (key, store, with id: UID and zone: u64)
2. Write \`create_master_key(ctx: &mut TxContext): MasterKey\` — creates and returns a new MasterKey
3. Write \`create_access_key(_master: &MasterKey, zone: u64, ctx: &mut TxContext): AccessKey\` — derives a scoped access key for the given zone
4. Write \`check_access(key: &AccessKey, zone: u64): bool\` — returns true if key.zone matches the requested zone`,
      hint: `\`\`\`move
public struct MasterKey has key, store { id: UID }

public struct AccessKey has key, store {
    id: UID,
    zone: u64,
}

public fun create_master_key(ctx: &mut TxContext): MasterKey {
    MasterKey { id: object::new(ctx) }
}

public fun create_access_key(
    _master: &MasterKey,
    zone: u64,
    ctx: &mut TxContext,
): AccessKey {
    AccessKey { id: object::new(ctx), zone }
}

public fun check_access(key: &AccessKey, zone: u64): bool {
    key.zone == zone
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::delegation;

use sui::object::{Self, UID};
use sui::tx_context::TxContext;

// Define MasterKey (key, store) with id: UID


// Define AccessKey (key, store) with id: UID and zone: u64


// Write create_master_key — returns a new MasterKey


// Write create_access_key — requires &MasterKey, returns scoped AccessKey


// Write check_access — returns true if key.zone matches the zone argument


#[test]
fun test_create_and_check() {
    let ctx = &mut tx_context::dummy();
    let master = create_master_key(ctx);
    let key = create_access_key(&master, 42, ctx);
    assert!(check_access(&key, 42) == true, 0);
    assert!(check_access(&key, 99) == false, 1);
    let MasterKey { id } = master;
    object::delete(id);
    let AccessKey { id, zone: _ } = key;
    object::delete(id);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*delegation\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::delegation;' },
        { test: (code: string) => /struct\s+MasterKey/.test(code), errorMsg: 'Define a struct called MasterKey.' },
        { test: (code: string) => /struct\s+AccessKey/.test(code), errorMsg: 'Define a struct called AccessKey.' },
        { test: (code: string) => /zone\s*:\s*u64/.test(code), errorMsg: 'AccessKey needs a zone: u64 field.' },
        { test: (code: string) => /fun\s+create_master_key\s*\(/.test(code), errorMsg: 'Write a function called create_master_key.' },
        { test: (code: string) => /fun\s+create_access_key\s*\(/.test(code), errorMsg: 'Write a function called create_access_key.' },
        { test: (code: string) => /fun\s+check_access\s*\(/.test(code), errorMsg: 'Write a function called check_access.' },
        { test: (code: string) => /:\s*bool/.test(code), errorMsg: 'check_access should return bool.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::delegation::test_create_and_check
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 15.2 — Summary',
      content: `- **Object possession = authorization** — no separate permission table needed
- **Temporary delegation**: lend via \`&Cap\` reference within a transaction
- **Permanent delegation**: transfer the cap object to a new owner
- **Scoped delegation**: derive a limited cap from a broader one
- Caps are composable — functions accepting \`&Cap\` work regardless of how the caller obtained it
- Revocation is destroying or reclaiming the cap object`,
    },
  ],
};
export default lesson;
