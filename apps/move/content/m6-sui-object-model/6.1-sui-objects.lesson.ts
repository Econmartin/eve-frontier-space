import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '6.1',
  title: 'Sui Objects',
  time: '~30 min',
  pages: [
    {
      type: 'LEARN',
      title: 'What is a Sui Object?',
      content: `The fundamental difference between Sui and other blockchains is the **object model**. In Sui, assets are *objects* — typed values stored in global storage, each with a globally unique ID.

### What Makes a Sui Object?

A struct becomes a Sui object when it:

- Has the \`key\` ability
- Has \`id: UID\` as its **first field**

\`\`\`move
use sui::object::UID;

public struct Ship has key, store {
    id: UID,       // required — must be first
    fuel: u64,
    shields: u64,
}
\`\`\`

### Creating Objects

\`\`\`move
use sui::object;
use sui::tx_context::TxContext;

public fun new_ship(ctx: &mut TxContext): Ship {
    Ship {
        id: object::new(ctx),  // creates a fresh UID
        fuel: 100,
        shields: 80,
    }
}
\`\`\`

The \`TxContext\` tracks the current transaction and is needed to create new UIDs.`,
    },
    {
      type: 'TASK',
      title: 'Define a Sui Object',
      content: `Create a struct that qualifies as a proper Sui object by including the required \`key\` ability and \`id: UID\` field.`,
      task: `In module \`objects::ship\` (the import line is provided), define \`public struct Ship\` with \`key\` and \`store\` abilities, and fields \`id: UID\` (first) and \`fuel: u64\`.`,
      hint: `\`public struct Ship has key, store { id: UID, fuel: u64 }\``,
      bonus: null,
      starterCode: `module objects::ship;\n\nuse sui::object::UID;\n\n// Define a Ship struct that is a Sui object\n// It needs: key and store abilities, id: UID, fuel: u64\n\n`,
      checks: [
        { test: code => /use\s+sui\s*::\s*object/.test(code), errorMsg: 'Keep the Sui object import' },
        { test: code => /public\s+struct\s+Ship/.test(code), errorMsg: 'Define: public struct Ship' },
        { test: code => /has\s+(?:key.*store|store.*key)/.test(code), errorMsg: 'Ship needs both key and store abilities: has key, store' },
        { test: code => /id\s*:\s*UID/.test(code), errorMsg: 'First field must be: id: UID' },
        { test: code => /fuel\s*:\s*u64/.test(code), errorMsg: 'Add field: fuel: u64' },
      ],
      successOutput: `$ sui move build\n   Compiling objects v0.0.1\nBuild Successful\n✓ objects::ship::Ship is a valid Sui object\n  has key + store abilities\n  id: UID — globally unique identity on Sui`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 6.1 — Summary',
      content: `- Sui uses an **object model** — assets are typed values with globally unique IDs
- A struct is a Sui object when it has the \`key\` ability and \`id: UID\` as its first field
- \`store\` ability allows the object to be transferred and stored
- Create new UIDs with \`object::new(ctx)\` using the transaction context
- The \`TxContext\` tracks the current transaction and generates unique IDs`,
    },
  ],
};
export default lesson;
