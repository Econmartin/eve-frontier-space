import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '13.2',
  title: 'Publisher Authority',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Proving Package Authorship',
      content: `The \`Publisher\` object proves you published a specific package on Sui. It's your **proof of authorship** — and it unlocks powerful capabilities.

\`\`\`move
module frontier::nft;

use sui::package;

public struct NFT has drop {}

fun init(otw: NFT, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);
    transfer::public_transfer(publisher, ctx.sender());
}
\`\`\`

**How it works:**
- Created with \`package::claim(otw)\` in your \`init\` function
- Consumes the One-Time Witness, so only one Publisher can exist per module
- Stored as an owned object — whoever holds it has publisher authority

**What Publisher unlocks:**
- Setting up **Object Display** (how wallets/explorers show your objects)
- Creating **TransferPolicy** (custom rules for marketplace transfers)
- Any future Sui features that require proof of package ownership

**Verification methods:**
- \`publisher.from_module<MyType>()\` — returns \`true\` if Publisher is from the module that defines \`MyType\`
- \`publisher.from_package<MyType>()\` — returns \`true\` if Publisher is from the same package as \`MyType\`

Think of Publisher as your **master key** for display and policy operations on your types.`,
    },
    {
      type: 'TASK',
      title: 'Claim Publisher & Create AdminCap',
      content: `Write an init function that claims the Publisher and creates an admin capability.`,
      task: `Complete the init function to:

1. Claim the \`Publisher\` using the One-Time Witness
2. Create an \`AdminCap\` (using \`object::new(ctx)\` for the UID)
3. Transfer both the Publisher and AdminCap to the sender`,
      hint: `\`\`\`move
fun init(otw: FRONTIER_ADMIN, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);
    let admin_cap = AdminCap { id: object::new(ctx) };
    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(admin_cap, ctx.sender());
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::frontier_admin;

use sui::package;

public struct FRONTIER_ADMIN has drop {}

public struct AdminCap has key, store {
    id: UID,
}

// Write init — claim Publisher, create AdminCap, transfer both to sender


#[test_only]
use sui::test_scenario;

#[test]
fun test_init() {
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        init(FRONTIER_ADMIN {}, scenario.ctx());
    };
    scenario.next_tx(admin);
    {
        let cap = scenario.take_from_sender<AdminCap>();
        scenario.return_to_sender(cap);
    };
    scenario.end();
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*frontier_admin\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::frontier_admin;' },
        { test: (code: string) => /public\s+struct\s+FRONTIER_ADMIN\s+has\s+drop/.test(code), errorMsg: 'Keep the FRONTIER_ADMIN One-Time Witness struct.' },
        { test: (code: string) => /public\s+struct\s+AdminCap\s+has\s+key/.test(code), errorMsg: 'Keep the AdminCap struct.' },
        { test: (code: string) => /fun\s+init\s*\(/.test(code), errorMsg: 'Write an init function.' },
        { test: (code: string) => /package\s*::\s*claim/.test(code), errorMsg: 'Use package::claim to claim the Publisher.' },
        { test: (code: string) => /AdminCap\s*\{/.test(code), errorMsg: 'Create an AdminCap instance.' },
        { test: (code: string) => /object\s*::\s*new/.test(code), errorMsg: 'Use object::new(ctx) to create the UID for AdminCap.' },
        { test: (code: string) => (code.match(/transfer\s*::\s*public_transfer/g) || []).length >= 2, errorMsg: 'Transfer both the Publisher and AdminCap using transfer::public_transfer.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::frontier_admin::test_init
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 13.2 — Summary',
      content: `- **\`Publisher\`** — proof that you published a specific package
- Created with \`package::claim(otw)\` in \`init\`, consuming the One-Time Witness
- Required for setting up **Object Display** and **TransferPolicy**
- **\`from_module<T>()\`** — checks if Publisher is from the module defining \`T\`
- **\`from_package<T>()\`** — checks if Publisher is from the same package as \`T\`
- Treat Publisher as a **master key** — store it securely`,
    },
  ],
};
export default lesson;
