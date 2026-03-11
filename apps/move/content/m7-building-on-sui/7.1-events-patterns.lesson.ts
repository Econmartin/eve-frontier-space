import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '7.1',
  title: 'Events & Patterns',
  time: '~30 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Emitting Events',
      content: `**Events** are the way Sui smart contracts communicate with the outside world. When something important happens on-chain, your contract can emit an event that clients (dApps, indexers, wallets) can listen to.

\`\`\`move
use sui::event;

public struct ShipLaunched has copy, drop {
    ship_id: address,
    fuel: u64,
}

public fun launch(ship_id: address, fuel: u64) {
    event::emit(ShipLaunched { ship_id, fuel });
}
\`\`\`

Event structs need \`copy\` and \`drop\` abilities.

### Common Patterns

**Capability Pattern** — an admin object that gates privileged operations:

\`\`\`move
public struct AdminCap has key, store { id: UID }

entry fun admin_only(cap: &AdminCap, ...) {
    // Only callable by whoever holds AdminCap
}
\`\`\`

**One-Time Witness** — a type that can only be instantiated once, used for coin registration and similar initialisation patterns.`,
    },
    {
      type: 'TASK',
      title: 'Emit an Event',
      content: `Define an event struct and emit it from a function.`,
      task: `In module \`events::demo\`, define \`public struct ShipLaunched has copy, drop\` with fields \`ship_id: address\` and \`fuel: u64\`. Then write \`public fun launch(ship_id: address, fuel: u64)\` that emits a \`ShipLaunched\` event using \`event::emit\`.`,
      hint: `\`event::emit(ShipLaunched { ship_id, fuel });\``,
      bonus: null,
      starterCode: `module events::demo;\n\nuse sui::event;\n\n// Define event struct ShipLaunched (copy, drop)\n// Fields: ship_id: address, fuel: u64\n\n// Write: public fun launch(ship_id: address, fuel: u64)\n// Emit a ShipLaunched event\n\n`,
      checks: [
        { test: code => /public\s+struct\s+ShipLaunched/.test(code), errorMsg: 'Define: public struct ShipLaunched has copy, drop { ... }' },
        { test: code => /has\s+(?:copy.*drop|drop.*copy)/.test(code), errorMsg: 'ShipLaunched needs copy and drop abilities' },
        { test: code => /ship_id\s*:\s*address/.test(code), errorMsg: 'Add field: ship_id: address' },
        { test: code => /fuel\s*:\s*u64/.test(code), errorMsg: 'Add field: fuel: u64' },
        { test: code => /event::emit/.test(code), errorMsg: 'Emit the event with: event::emit(ShipLaunched { ship_id, fuel })' },
      ],
      successOutput: `$ sui move build\n   Compiling events v0.0.1\nBuild Successful\n✓ events::demo::launch compiled\n  Emits ShipLaunched event on-chain\n  Clients can subscribe to ShipLaunched via Sui RPC.`,
    },
    {
      type: 'REVIEW',
      title: 'Course Complete!',
      content: `Congratulations — you've completed the **Move on Sui** course!

### What you've mastered

- 🚀 **Modules** — the basic unit of Move code
- 🔧 **Functions, types, variables, and control flow**
- 🏗️ **Structs, vectors, and enums**
- 🔑 **Abilities, references, and error handling**
- ✅ **Unit testing** with the Move test framework
- ⛓️ **Sui objects** — key, UID, and the ownership model
- ⚡ **Events and patterns** — building real Sui contracts

### What's next?

You now have the fundamentals to explore more advanced Sui topics:

- Dynamic fields and table storage
- Coin and token standards
- Programmable transaction blocks
- The Move Prover for formal verification

Check out the *Sui documentation* and the *Sui Move examples* repository to keep building!`,
    },
  ],
};
export default lesson;
