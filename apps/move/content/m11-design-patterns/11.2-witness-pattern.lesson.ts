import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '11.2',
  title: 'Witness & One-Time Witness',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Witness Pattern',
      content: `A **witness** is a struct used to prove a module's identity. It's constructed and immediately consumed — proving "I am the module that defines this type."

This is used when a generic function needs proof of authorization:

\`\`\`move
module frontier::registry;

// The witness — only this module can create it
public struct REGISTRY has drop {}

public fun register<T: drop>(_witness: T, name: vector<u8>) {
    // T proves which module is calling
}
\`\`\`

The key insight: only the module that defines a struct can create instances of it. So passing a witness value proves your module's identity.

The witness must have \`drop\` since it's created just to be consumed — it serves no purpose after proving identity.`,
    },
    {
      type: 'LEARN',
      title: 'One-Time Witness (OTW)',
      content: `A **One-Time Witness (OTW)** is a special witness that can only be created ONCE — in the \`init\` function.

**OTW rules:**
- Name matches the module name (UPPERCASED)
- Has \`drop\` ability only
- No fields
- Not generic

It's received as the first parameter of \`init\`:

\`\`\`move
module frontier::fuel_token;

// OTW — matches module name, drop only, no fields
public struct FUEL_TOKEN has drop {}

fun init(witness: FUEL_TOKEN, ctx: &mut TxContext) {
    // witness can only exist here, this one time
    // Used to create TreasuryCap for coins, etc.
}
\`\`\`

You can verify an OTW at runtime with \`sui::types::is_one_time_witness(&val)\`.

This is how \`coin::create_currency\` works — it requires an OTW to ensure only one \`TreasuryCap\` exists per coin type. The Sui runtime guarantees the OTW is created exactly once, making it perfect for unique authorization.`,
    },
    {
      type: 'TASK',
      title: 'Fleet Pass with OTW',
      content: `Create a module that uses a One-Time Witness to register a fleet — proving that registration can only happen once, at module publish time.`,
      task: `Write a module \`frontier::fleet_pass\` with an OTW called \`FLEET_PASS\`:

1. Define the OTW struct \`FLEET_PASS\` with \`drop\` ability only, no fields
2. Define \`FleetRegistry\` with \`key\` ability, fields: \`id: UID\`, \`name: vector<u8>\`
3. Write a \`register_fleet<T: drop>(_witness: T, name: vector<u8>, ctx: &mut TxContext): FleetRegistry\` function that creates and returns a FleetRegistry
4. The \`init\` function receives the OTW and uses it to call \`register_fleet\`, then transfers the result to the sender`,
      hint: `\`\`\`move
public struct FLEET_PASS has drop {}

public struct FleetRegistry has key {
    id: UID,
    name: vector<u8>,
}

public fun register_fleet<T: drop>(_witness: T, name: vector<u8>, ctx: &mut TxContext): FleetRegistry {
    FleetRegistry {
        id: object::new(ctx),
        name,
    }
}

fun init(witness: FLEET_PASS, ctx: &mut TxContext) {
    let registry = register_fleet(witness, b"EVE Fleet", ctx);
    transfer::transfer(registry, ctx.sender());
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fleet_pass;

// Define the OTW: FLEET_PASS — drop only, no fields


// Define FleetRegistry — key, has UID and name: vector<u8>


// register_fleet<T: drop> — takes witness, name, ctx, returns FleetRegistry


// init — receives FLEET_PASS, calls register_fleet, transfers result to sender

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fleet_pass\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fleet_pass;' },
        { test: (code: string) => /struct\s+FLEET_PASS\s+has\s+drop/.test(code), errorMsg: 'Define the OTW struct FLEET_PASS with drop ability.' },
        { test: (code: string) => /struct\s+FleetRegistry\s+has\s+key/.test(code), errorMsg: 'Define FleetRegistry with key ability.' },
        { test: (code: string) => /fun\s+register_fleet\s*<\s*T\s*:\s*drop\s*>/.test(code), errorMsg: 'Write register_fleet as a generic function with T: drop constraint.' },
        { test: (code: string) => /fun\s+init\s*\(\s*witness\s*:\s*FLEET_PASS/.test(code), errorMsg: 'The init function should receive FLEET_PASS as its first parameter.' },
        { test: (code: string) => /register_fleet\s*\(\s*witness/.test(code) || /register_fleet\s*\<.*\>\s*\(\s*witness/.test(code), errorMsg: 'Call register_fleet with the witness in init.' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
Build Successful`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 11.2 — Summary',
      content: `- **Witness** = a struct that proves a module's identity (only the defining module can create it)
- Created and immediately consumed — needs \`drop\` ability
- **One-Time Witness (OTW)** = a witness created exactly once, in \`init\`
- OTW rules: UPPERCASED module name, \`drop\` only, no fields, not generic
- Received as first param of \`init\`
- Used by \`coin::create_currency\` to guarantee one \`TreasuryCap\` per coin type
- \`sui::types::is_one_time_witness(&val)\` verifies at runtime`,
    },
  ],
};
export default lesson;
