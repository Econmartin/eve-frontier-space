import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '6.2',
  title: 'Transfer & Ownership',
  time: '~30 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Object Ownership',
      content: `After creating an object, you need to *decide its fate*. Objects can be:

- **Owned** — transferred to a specific address (wallet)
- **Shared** — accessible by anyone on the network
- **Frozen** — immutable and shared (no one can modify)

### Transfer Functions

\`\`\`move
use sui::transfer;

// Transfer to a specific address (object needs key + store)
transfer::public_transfer(obj, recipient_address);

// Make the object shared (accessible by all)
transfer::share_object(obj);

// Freeze the object (immutable, shared)
transfer::freeze_object(obj);
\`\`\`

### Entry Functions

To create and send an object from a transaction, use an \`entry fun\`. The sender's address comes from \`tx_context::sender(ctx)\`:

\`\`\`move
entry fun mint(ctx: &mut TxContext) {
    let obj = MyObject { id: object::new(ctx), ... };
    transfer::public_transfer(obj, tx_context::sender(ctx));
}
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Mint & Transfer',
      content: `Create an object and immediately transfer it to the transaction sender — this is the standard "mint" pattern in Sui.`,
      task: `The module is set up for you. Define \`public struct Token has key, store\` with fields \`id: UID\` and \`value: u64\`. Then write \`entry fun mint(value: u64, ctx: &mut TxContext)\` that creates a Token and transfers it to the sender using \`tx_context::sender(ctx)\`.`,
      hint: `Create: \`Token { id: object::new(ctx), value }\` then \`transfer::public_transfer(token, tx_context::sender(ctx))\``,
      bonus: null,
      starterCode: `module transfer_demo::demo;\n\nuse sui::object::{Self, UID};\nuse sui::transfer;\nuse sui::tx_context::{Self, TxContext};\n\n// Define struct Token (id: UID, value: u64) with key + store\n// Write entry fun mint(value: u64, ctx: &mut TxContext)\n// Create a Token and transfer it to tx_context::sender(ctx)\n\n`,
      checks: [
        { test: code => /public\s+struct\s+Token/.test(code), errorMsg: 'Define: public struct Token has key, store { id: UID, value: u64 }' },
        { test: code => /id\s*:\s*UID/.test(code), errorMsg: 'Token must have id: UID as first field' },
        { test: code => /entry\s+fun\s+mint/.test(code), errorMsg: 'Write: entry fun mint(value: u64, ctx: &mut TxContext) { ... }' },
        { test: code => /object::new\s*\(\s*ctx\s*\)/.test(code), errorMsg: 'Create a UID with: object::new(ctx)' },
        { test: code => /transfer::(?:public_)?transfer/.test(code), errorMsg: 'Transfer with: transfer::public_transfer(token, tx_context::sender(ctx))' },
      ],
      successOutput: `$ sui move build\n   Compiling transfer_demo v0.0.1\nBuild Successful\n✓ transfer_demo::demo::mint compiled\n  Creates Token object with object::new(ctx)\n  Transfers to transaction sender\n  Token is now a live Sui owned object.`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 6.2 — Summary',
      content: `- After creating an object, you must transfer, share, or freeze it
- \`transfer::public_transfer(obj, address)\` sends an object to a specific owner
- \`transfer::share_object(obj)\` makes an object accessible by anyone
- \`transfer::freeze_object(obj)\` makes an object immutable
- \`entry fun\` functions can be called directly from Sui transactions
- \`tx_context::sender(ctx)\` returns the address of the transaction sender`,
    },
  ],
};
export default lesson;
