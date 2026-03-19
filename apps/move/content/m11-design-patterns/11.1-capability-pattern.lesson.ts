import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '11.1',
  title: 'Capability Pattern',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Access Control with Objects',
      content: `Instead of checking addresses (\`if (sender == admin)\`), Sui uses **capabilities** — objects that prove permission.

Convention: suffix with \`Cap\` (e.g., \`AdminCap\`, \`MintCap\`). They're created in \`init\`, transferred to the publisher, and passed as a parameter to prove authorization.

\`\`\`move
module frontier::fleet_command;

public struct CommandCap has key, store { id: UID }

public struct Fleet has key {
    id: UID,
    ships: u64,
}

fun init(ctx: &mut TxContext) {
    transfer::transfer(CommandCap { id: object::new(ctx) }, ctx.sender());
    transfer::share_object(Fleet { id: object::new(ctx), ships: 0 });
}

// Only someone with CommandCap can add ships
public fun add_ship(_cap: &CommandCap, fleet: &mut Fleet) {
    fleet.ships = fleet.ships + 1;
}
\`\`\`

The \`_cap: &CommandCap\` parameter is the guard — if you don't have the cap, you can't call this function.

**Advantages over address checks:**
- **Transferable authority** — hand the cap to someone else
- **Multiple caps possible** — different caps for different roles
- **Self-documenting signatures** — the function signature tells you what permission is needed`,
    },
    {
      type: 'TASK',
      title: 'Minting System with Capability',
      content: `Build a minting system that uses the capability pattern to control who can create ships.`,
      task: `Write a minting system with \`MintCap\`:

1. Define \`MintCap\` with \`key, store\` abilities and a \`UID\` field
2. Define \`Ship\` with \`key, store\` abilities, fields: \`id: UID\`, \`name: vector<u8>\`
3. The \`init\` function creates and transfers \`MintCap\` to the publisher
4. \`mint_ship(_cap: &MintCap, name: vector<u8>, ctx: &mut TxContext): Ship\` — creates and returns a Ship`,
      hint: `\`\`\`move
public struct MintCap has key, store { id: UID }

public struct Ship has key, store {
    id: UID,
    name: vector<u8>,
}

fun init(ctx: &mut TxContext) {
    transfer::transfer(MintCap { id: object::new(ctx) }, ctx.sender());
}

public fun mint_ship(_cap: &MintCap, name: vector<u8>, ctx: &mut TxContext): Ship {
    Ship {
        id: object::new(ctx),
        name,
    }
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::shipyard;

// Define MintCap — key, store, has a UID


// Define Ship — key, store, has UID and name: vector<u8>


// init: create and transfer MintCap to publisher


// mint_ship: takes &MintCap, name, ctx — returns a new Ship

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*shipyard\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::shipyard;' },
        { test: (code: string) => /struct\s+MintCap\s+has\s+key\s*,\s*store/.test(code), errorMsg: 'Define MintCap with key, store abilities.' },
        { test: (code: string) => /struct\s+Ship\s+has\s+key\s*,\s*store/.test(code), errorMsg: 'Define Ship with key, store abilities.' },
        { test: (code: string) => /fun\s+init\s*\(/.test(code), errorMsg: 'Write an init function.' },
        { test: (code: string) => /transfer\s*::\s*transfer\s*\(\s*MintCap/.test(code), errorMsg: 'Transfer MintCap to the publisher in init.' },
        { test: (code: string) => /fun\s+mint_ship\s*\(/.test(code), errorMsg: 'Write a function called mint_ship.' },
        { test: (code: string) => /&\s*MintCap/.test(code), errorMsg: 'mint_ship should take &MintCap as a parameter.' },
        { test: (code: string) => /:\s*Ship/.test(code), errorMsg: 'mint_ship should return a Ship.' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
Build Successful`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 11.1 — Summary',
      content: `- **Capabilities** are objects used as permissions — if you have the cap, you have access
- Convention: suffix with \`Cap\` (e.g., \`AdminCap\`, \`MintCap\`)
- Created in \`init\`, transferred to the publisher
- Passed as \`&Cap\` parameter to guard functions
- Advantages: transferable authority, multiple caps for different roles, self-documenting function signatures
- No address checks needed — the type system enforces access control`,
    },
  ],
};
export default lesson;
