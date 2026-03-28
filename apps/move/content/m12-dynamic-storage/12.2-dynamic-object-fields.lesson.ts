import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '12.2',
  title: 'Dynamic Object Fields',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Storing Objects Inside Objects',
      content: `Regular dynamic fields **wrap** the value — it becomes invisible to external tools. **Dynamic object fields** store objects that keep their own UID visible.

Use \`sui::dynamic_object_field\` (often aliased as \`ofield\`):

\`\`\`move
use sui::dynamic_object_field as ofield;

public fun equip_weapon(ship: &mut Ship, weapon: Weapon) {
    ofield::add(&mut ship.id, b"weapon", weapon);
}

public fun unequip_weapon(ship: &mut Ship): Weapon {
    ofield::remove(&mut ship.id, b"weapon")
}
\`\`\`

The Weapon object is still discoverable by its ID (unlike regular dynamic fields). This means explorers, indexers, and other tools can find the object even while it's attached.

The tradeoff: it costs more gas (2 objects stored vs 1). Use regular dynamic fields when discoverability isn't needed.`,
    },
    {
      type: 'LEARN',
      title: 'When to Use Which',
      content: `Here's how to decide between dynamic fields and dynamic object fields:

| Feature | Dynamic Field | Dynamic Object Field |
|---------|--------------|---------------------|
| Value type | Any with \`store\` | Must have \`key + store\` |
| Discoverable by ID | No | Yes |
| Gas cost | Lower | Higher |
| Use when | Storing data/primitives | Storing objects that need to be found |

**Rule of thumb:** if the value is a primitive or a struct without its own identity, use \`df\`. If the value is an object with a UID that others need to look up, use \`ofield\`.`,
    },
    {
      type: 'TASK',
      title: 'Equipment System',
      content: `Write an equipment system using dynamic object fields to attach gear to a ship.

For example:

\`\`\`move
public fun attach(station: &mut Station, slot: vector<u8>, module: Module) {
    ofield::add(&mut station.id, slot, module);
}

public fun check(station: &Station, slot: vector<u8>): &Module {
    ofield::borrow(&station.id, slot)
}

public fun detach(station: &mut Station, slot: vector<u8>): Module {
    ofield::remove(&mut station.id, slot)
}
\`\`\``,
      task: `Write an equipment system:

1. \`equip(ship: &mut Ship, name: vector<u8>, gear: Equipment)\` — attaches equipment as dynamic object field
2. \`inspect(ship: &Ship, name: vector<u8>): &Equipment\` — borrows the equipment
3. \`unequip(ship: &mut Ship, name: vector<u8>): Equipment\` — removes and returns`,
      hint: `\`\`\`move
public fun equip(ship: &mut Ship, name: vector<u8>, gear: Equipment) {
    ofield::add(&mut ship.id, name, gear);
}

public fun inspect(ship: &Ship, name: vector<u8>): &Equipment {
    ofield::borrow(&ship.id, name)
}

public fun unequip(ship: &mut Ship, name: vector<u8>): Equipment {
    ofield::remove(&mut ship.id, name)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::equipment;

use sui::dynamic_object_field as ofield;

public struct Ship has key {
    id: UID,
    name: vector<u8>,
}

public struct Equipment has key, store {
    id: UID,
    power: u64,
}

// Write equip — attach gear as a dynamic object field with the given name


// Write inspect — borrow the equipment by name


// Write unequip — remove and return the equipment


#[test]
fun test_equip_and_inspect() {
    let ctx = &mut tx_context::dummy();
    let mut ship = Ship { id: object::new(ctx), name: b"Warship" };
    let laser = Equipment { id: object::new(ctx), power: 50 };

    equip(&mut ship, b"laser", laser);
    assert!(inspect(&ship, b"laser").power == 50, 0);

    let removed = unequip(&mut ship, b"laser");
    let Equipment { id: eid, power: _ } = removed;
    eid.delete();

    let Ship { id, name: _ } = ship;
    id.delete();
}

#[test]
fun test_multiple_equipment() {
    let ctx = &mut tx_context::dummy();
    let mut ship = Ship { id: object::new(ctx), name: b"Cruiser" };
    let shield = Equipment { id: object::new(ctx), power: 30 };
    let cannon = Equipment { id: object::new(ctx), power: 80 };

    equip(&mut ship, b"shield", shield);
    equip(&mut ship, b"cannon", cannon);

    assert!(inspect(&ship, b"shield").power == 30, 0);
    assert!(inspect(&ship, b"cannon").power == 80, 1);

    let s = unequip(&mut ship, b"shield");
    let c = unequip(&mut ship, b"cannon");

    let Equipment { id: id1, power: _ } = s;
    let Equipment { id: id2, power: _ } = c;
    id1.delete();
    id2.delete();

    let Ship { id, name: _ } = ship;
    id.delete();
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*equipment\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::equipment;' },
        { test: (code: string) => /fun\s+equip\s*\(/.test(code), errorMsg: 'Write a function called equip.' },
        { test: (code: string) => /fun\s+inspect\s*\(/.test(code), errorMsg: 'Write a function called inspect.' },
        { test: (code: string) => /fun\s+unequip\s*\(/.test(code), errorMsg: 'Write a function called unequip.' },
        { test: (code: string) => /ofield\s*::\s*add/.test(code), errorMsg: 'Use ofield::add to attach the equipment.' },
        { test: (code: string) => /ofield\s*::\s*borrow/.test(code), errorMsg: 'Use ofield::borrow to inspect the equipment.' },
        { test: (code: string) => /ofield\s*::\s*remove/.test(code), errorMsg: 'Use ofield::remove to unequip.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::equipment::test_equip_and_inspect
[ PASS ] frontier::equipment::test_multiple_equipment
Test result: OK. Total tests: 2; passed: 2; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 12.2 — Summary',
      content: `- **Dynamic object fields** (\`ofield\`) keep stored objects discoverable by their ID
- Use \`ofield::add\`, \`ofield::borrow\`, \`ofield::remove\` — same API as \`df\`
- Higher gas cost than regular dynamic fields (2 objects stored vs 1)
- Use \`df\` for data/primitives, \`ofield\` for objects that need external visibility`,
    },
  ],
};
export default lesson;
