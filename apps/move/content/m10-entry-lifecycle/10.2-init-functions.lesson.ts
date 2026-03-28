import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '10.2',
  title: 'Init Functions',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'One-Time Setup',
      content: `When you publish a module to Sui, you often need to set up some initial state — create an admin capability, initialize a shared registry, configure defaults. Move has a special mechanism for this: the **\`init\` function**.

\`\`\`move
module frontier::game;

public struct AdminCap has key, store {
    id: UID,
}

public struct GameState has key {
    id: UID,
    active: bool,
}

fun init(ctx: &mut TxContext) {
    // Create admin capability — only publisher gets this
    transfer::transfer(
        AdminCap { id: object::new(ctx) },
        ctx.sender()
    );
    // Create shared game state
    transfer::share_object(
        GameState { id: object::new(ctx), active: true }
    );
}
\`\`\`

### Rules of \`init\`

1. **Runs exactly once** — when the module is first published
2. **Must be private** — no \`public\` or \`entry\` keyword
3. **No return value** — it only creates and transfers objects
4. **Signature:** \`fun init(ctx: &mut TxContext)\` — only \`TxContext\` as parameter
5. It is the **only** function that runs automatically at publish time

### The standard pattern

Most modules follow the same init pattern:

1. **Create a capability object** (\`AdminCap\`, \`OwnerCap\`) and transfer it to the publisher
2. **Create shared state** (a registry, config, or game state) and share it

The publisher receives the capability object in their wallet, which they can later use to prove they have admin rights. The shared state is accessible to everyone.

Whatever you create in \`init\` determines your module's initial on-chain state. There's no second chance — if you forget to create something here, you'll need to publish a new package.`,
    },
    {
      type: 'TASK',
      title: 'Initialize a Registry',
      content: `Write an \`init\` function that sets up a pilot registry with an admin cap and shared state.

For example:

\`\`\`move
fun init(ctx: &mut TxContext) {
    transfer::transfer(
        AdminCap { id: object::new(ctx) },
        ctx.sender()
    );
    transfer::share_object(
        GameBoard { id: object::new(ctx), players: vector[] }
    );
}
\`\`\``,
      task: `Complete the \`init\` function:
1. Create a \`RegistryCap { id: object::new(ctx) }\` and transfer it to \`ctx.sender()\`
2. Create a \`Registry { id: object::new(ctx), pilots: vector[] }\` and share it with \`transfer::share_object\``,
      hint: `\`\`\`move
fun init(ctx: &mut TxContext) {
    transfer::transfer(
        RegistryCap { id: object::new(ctx) },
        ctx.sender()
    );
    transfer::share_object(
        Registry { id: object::new(ctx), pilots: vector[] }
    );
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::registry;

public struct RegistryCap has key, store {
    id: UID,
}

public struct Registry has key {
    id: UID,
    pilots: vector<address>,
}

// Runs once at publish time:
// 1. Create RegistryCap and transfer to publisher (ctx.sender())
// 2. Create Registry with empty pilots vector and share it
fun init(ctx: &mut TxContext) {
    // your code here
}

public fun register(registry: &mut Registry, pilot: address) {
    registry.pilots.push_back(pilot);
}
`,
      checks: [
        { test: (code: string) => /fun\s+init\s*\(\s*ctx\s*:\s*&mut\s+TxContext\s*\)/.test(code), errorMsg: 'Define init as: fun init(ctx: &mut TxContext)' },
        { test: (code: string) => !/public\s+fun\s+init/.test(code) && !/entry\s+fun\s+init/.test(code), errorMsg: 'The init function must be private — no public or entry keyword.' },
        { test: (code: string) => /transfer\s*::\s*transfer\s*\(/.test(code), errorMsg: 'Use transfer::transfer to send the RegistryCap to the publisher.' },
        { test: (code: string) => /RegistryCap\s*\{/.test(code), errorMsg: 'Create a RegistryCap object.' },
        { test: (code: string) => /transfer\s*::\s*share_object\s*\(/.test(code), errorMsg: 'Use transfer::share_object to share the Registry.' },
        { test: (code: string) => /Registry\s*\{/.test(code.split('share_object')[1] || ''), errorMsg: 'Create a Registry object inside share_object.' },
        { test: (code: string) => /ctx\.sender\s*\(\s*\)/.test(code), errorMsg: 'Transfer the RegistryCap to ctx.sender().' },
      ],
      successOutput: `$ sui client publish
   Compiling frontier v0.0.1
   Published to 0xABC...

Created objects:
  - RegistryCap (owned by publisher: 0x1234...)
  - Registry (shared object)`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 10.2 — Summary',
      content: `- \`fun init(ctx: &mut TxContext)\` runs **exactly once** when your module is published
- It must be **private** — no \`public\` or \`entry\` keyword
- No return value — it only creates and transfers objects
- Standard pattern: create a capability and transfer to publisher, create shared state and share it
- The publisher receives the cap in their wallet for admin rights
- Whatever you create in \`init\` determines the module's initial on-chain state
- There's no second chance — forgotten setup requires a new package`,
    },
  ],
};
export default lesson;
