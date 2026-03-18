import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '12.1',
  title: 'Dynamic Fields',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Attaching Data to Objects',
      content: `Struct fields are fixed at compile time. But what if you need to add arbitrary data later?

**Dynamic fields** attach key-value pairs to any object's UID. Think of it as a hidden map on every object.

\`\`\`move
module frontier::ship_mods;

use sui::dynamic_field as df;

public struct Ship has key {
    id: UID,
    name: vector<u8>,
}

// Attach a modification to a ship
public fun add_mod(ship: &mut Ship, mod_name: vector<u8>, power: u64) {
    df::add(&mut ship.id, mod_name, power);
}

// Read a modification
public fun get_mod(ship: &Ship, mod_name: vector<u8>): &u64 {
    df::borrow(&ship.id, mod_name)
}
\`\`\`

Key rules:
- **Key** can be any type with \`copy + drop + store\`
- **Value** can be any type with \`store\`
- Methods: \`add\`, \`remove\`, \`borrow\`, \`borrow_mut\`, \`exists_\`, \`exists_with_type\``,
    },
    {
      type: 'LEARN',
      title: 'Custom Key Types',
      content: `Using strings as keys works but lacks type safety. Better: define a custom key type per field kind.

\`\`\`move
public struct ShieldKey has copy, drop, store {}
public struct WeaponKey has copy, drop, store {}

public fun add_shield(ship: &mut Ship, level: u64) {
    df::add(&mut ship.id, ShieldKey {}, level);
}
\`\`\`

Now \`ShieldKey\` and \`WeaponKey\` can't be confused — the type system prevents mistakes. Each key type creates its own namespace on the object, so you never accidentally overwrite unrelated data.`,
    },
    {
      type: 'TASK',
      title: 'Cargo System',
      content: `Write a cargo system using dynamic fields to attach named cargo to a ship.`,
      task: `Write a cargo system using dynamic fields:

1. \`add_cargo(ship: &mut Ship, cargo_name: vector<u8>, quantity: u64)\` — adds a dynamic field
2. \`get_cargo(ship: &Ship, cargo_name: vector<u8>): &u64\` — borrows the field
3. \`remove_cargo(ship: &mut Ship, cargo_name: vector<u8>): u64\` — removes and returns`,
      hint: `\`\`\`move
public fun add_cargo(ship: &mut Ship, cargo_name: vector<u8>, quantity: u64) {
    df::add(&mut ship.id, cargo_name, quantity);
}

public fun get_cargo(ship: &Ship, cargo_name: vector<u8>): &u64 {
    df::borrow(&ship.id, cargo_name)
}

public fun remove_cargo(ship: &mut Ship, cargo_name: vector<u8>): u64 {
    df::remove(&mut ship.id, cargo_name)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::cargo;

use sui::dynamic_field as df;

public struct Ship has key {
    id: UID,
    name: vector<u8>,
}

// Write add_cargo — attach cargo_name -> quantity as a dynamic field


// Write get_cargo — borrow the quantity for a given cargo_name


// Write remove_cargo — remove and return the quantity


#[test]
fun test_cargo() {
    let ctx = &mut tx_context::dummy();
    let mut ship = Ship { id: object::new(ctx), name: b"Hauler" };

    add_cargo(&mut ship, b"ore", 500);
    assert!(*get_cargo(&ship, b"ore") == 500, 0);

    let removed = remove_cargo(&mut ship, b"ore");
    assert!(removed == 500, 1);

    let Ship { id, name: _ } = ship;
    id.delete();
}

#[test]
fun test_multiple_cargo() {
    let ctx = &mut tx_context::dummy();
    let mut ship = Ship { id: object::new(ctx), name: b"Freighter" };

    add_cargo(&mut ship, b"fuel", 100);
    add_cargo(&mut ship, b"ice", 200);

    assert!(*get_cargo(&ship, b"fuel") == 100, 0);
    assert!(*get_cargo(&ship, b"ice") == 200, 1);

    let _ = remove_cargo(&mut ship, b"fuel");
    let _ = remove_cargo(&mut ship, b"ice");

    let Ship { id, name: _ } = ship;
    id.delete();
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*cargo\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::cargo;' },
        { test: (code: string) => /fun\s+add_cargo\s*\(/.test(code), errorMsg: 'Write a function called add_cargo.' },
        { test: (code: string) => /fun\s+get_cargo\s*\(/.test(code), errorMsg: 'Write a function called get_cargo.' },
        { test: (code: string) => /fun\s+remove_cargo\s*\(/.test(code), errorMsg: 'Write a function called remove_cargo.' },
        { test: (code: string) => /df\s*::\s*add/.test(code), errorMsg: 'Use df::add to attach the dynamic field.' },
        { test: (code: string) => /df\s*::\s*borrow/.test(code), errorMsg: 'Use df::borrow to read the dynamic field.' },
        { test: (code: string) => /df\s*::\s*remove/.test(code), errorMsg: 'Use df::remove to remove the dynamic field.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::cargo::test_cargo
[ PASS ] frontier::cargo::test_multiple_cargo
Test result: OK. Total tests: 2; passed: 2; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 12.1 — Summary',
      content: `- **Dynamic fields** = runtime key-value pairs attached to any object's UID
- Key needs \`copy + drop + store\`, value needs \`store\`
- Core methods: \`add\`, \`remove\`, \`borrow\`, \`borrow_mut\`, \`exists_\`, \`exists_with_type\`
- **Custom key types** provide type safety — prefer them over raw strings
- Dynamic fields are stored on-chain as separate objects linked to the parent`,
    },
  ],
};
export default lesson;
