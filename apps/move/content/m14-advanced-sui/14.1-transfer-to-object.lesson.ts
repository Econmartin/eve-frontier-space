import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '14.1',
  title: 'Transfer to Object',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Objects Owning Objects',
      content: `So far you've transferred objects to **addresses** (wallets). But Sui has a powerful trick: you can transfer an object **to another object**.

The receiving object becomes the **parent**, and the sent object becomes a **child**. The child inherits the parent's ownership for consensus purposes — whoever owns the parent effectively owns all its children.

\`\`\`move
module frontier::object_transfer;

use sui::transfer;

/// Send a weapon to a ship (the ship "owns" the weapon)
public fun send_weapon_to_ship(weapon: Weapon, ship_id: ID) {
    transfer::public_transfer(weapon, ship_id.to_address());
}
\`\`\`

The key insight: \`ID\` can be converted to an address with \`.to_address()\`. When you transfer to an object's address, that object becomes the parent.

**Why is this useful?**
- **Inventory systems**: a ship object can own cargo, weapons, modules
- **Mailboxes**: objects can receive items while their owner is offline
- **Composability**: complex nested ownership hierarchies`,
    },
    {
      type: 'LEARN',
      title: 'Receiving Objects',
      content: `Sending objects to another object is easy. **Receiving** them requires a special type: \`Receiving<T>\`.

\`\`\`move
module frontier::ship_inventory;

use sui::transfer::Receiving;

public fun claim_weapon(ship: &mut Ship, weapon: Receiving<Weapon>): Weapon {
    transfer::public_receive(&mut ship.id, weapon)
}
\`\`\`

Key rules:
- The **parent** must be passed as \`&mut\` — this proves you own it
- \`transfer::public_receive\` claims the child object and returns it
- The \`Receiving<T>\` value is provided by the transaction — it references a child object that was previously sent to the parent

**When to use this pattern:**
- **Cargo delivery**: ships receive cargo crates from other players
- **Async workflows**: deposit items now, claim them later
- **Modular equipment**: attach/detach components from parent objects

Once received, the child object is yours to keep, transfer, or destroy — it's no longer attached to the parent.`,
    },
    {
      type: 'TASK',
      title: 'Cargo Delivery System',
      content: `Build a cargo delivery system where crates can be sent to ships and received later.

For example:

\`\`\`move
public fun send_item(item: Parcel, dest_id: ID) {
    transfer::public_transfer(item, dest_id.to_address());
}

public fun receive_item(box: &mut Box, parcel: Receiving<Parcel>): Parcel {
    transfer::public_receive(&mut box.id, parcel)
}
\`\`\``,
      task: `Write a cargo delivery module:

1. \`send_cargo(cargo: CargoCrate, ship_id: ID)\` — transfers the cargo crate to the ship using \`transfer::public_transfer\` and \`ship_id.to_address()\`
2. \`receive_cargo(ship: &mut Ship, incoming: Receiving<CargoCrate>): CargoCrate\` — receives the cargo using \`transfer::public_receive\``,
      hint: `\`\`\`move
public fun send_cargo(cargo: CargoCrate, ship_id: ID) {
    transfer::public_transfer(cargo, ship_id.to_address());
}

public fun receive_cargo(ship: &mut Ship, incoming: Receiving<CargoCrate>): CargoCrate {
    transfer::public_receive(&mut ship.id, incoming)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::cargo_delivery;

use sui::transfer;
use sui::transfer::Receiving;

public struct Ship has key {
    id: UID,
    name: vector<u8>,
}

public struct CargoCrate has key, store {
    id: UID,
    contents: vector<u8>,
    weight: u64,
}

// Write send_cargo — transfer cargo to a ship by its ID


// Write receive_cargo — receive cargo sent to the ship

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*cargo_delivery\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::cargo_delivery;' },
        { test: (code: string) => /fun\s+send_cargo\s*\(/.test(code), errorMsg: 'Write a function called send_cargo.' },
        { test: (code: string) => /fun\s+receive_cargo\s*\(/.test(code), errorMsg: 'Write a function called receive_cargo.' },
        { test: (code: string) => /to_address\s*\(\s*\)/.test(code), errorMsg: 'Use ship_id.to_address() to convert the ID to an address.' },
        { test: (code: string) => /public_transfer/.test(code), errorMsg: 'Use transfer::public_transfer to send the cargo.' },
        { test: (code: string) => /public_receive/.test(code), errorMsg: 'Use transfer::public_receive to claim the cargo.' },
        { test: (code: string) => /Receiving\s*<\s*CargoCrate\s*>/.test(code), errorMsg: 'The incoming parameter should be Receiving<CargoCrate>.' },
        { test: (code: string) => /&mut\s+ship\s*\.\s*id/.test(code), errorMsg: 'Pass &mut ship.id to public_receive to prove ownership.' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
   Build Successful

Cargo delivery system ready! Ships can now send and receive crates.`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 14.1 — Summary',
      content: `- **Transfer to object**: use \`transfer::public_transfer(obj, id.to_address())\` to send an object to another object
- The receiving object becomes the **parent**, the sent object is the **child**
- Child objects inherit the parent's ownership for consensus
- **\`Receiving<T>\`**: special type that references a child object sent to a parent
- **\`transfer::public_receive(&mut parent.id, receiving)\`**: claims the child object
- The parent must be passed as \`&mut\` to prove ownership
- Use cases: inventory systems, mailboxes, async delivery, composable objects`,
    },
  ],
};
export default lesson;
