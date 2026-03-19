import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '13.3',
  title: 'Object Display',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Rich Metadata for Your Objects',
      content: `\`Display<T>\` tells wallets, explorers, and marketplaces **how to show your objects**. Without it, your objects are just raw data — with it, they have names, images, and descriptions.

\`\`\`move
module frontier::ship_nft;

use sui::display;

public struct SHIP_NFT has drop {}

public struct ShipNFT has key, store {
    id: UID,
    name: vector<u8>,
    class: vector<u8>,
    power: u64,
}

fun init(otw: SHIP_NFT, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);

    let mut display = display::new<ShipNFT>(&publisher, ctx);
    display.add(b"name".to_string(), b"{name}".to_string());
    display.add(b"description".to_string(), b"A {class}-class ship with {power} power".to_string());
    display.add(b"image_url".to_string(), b"https://frontier.io/ships/{class}.png".to_string());
    display.update_version();

    transfer::public_transfer(display, ctx.sender());
    transfer::public_transfer(publisher, ctx.sender());
}
\`\`\`

**How templates work:**
- Use \`{field_name}\` syntax to reference fields from your struct
- When a wallet renders a \`ShipNFT\` with \`class: b"Destroyer"\`, the description becomes: *"A Destroyer-class ship with 500 power"*

**Common display fields:**

| Field | Purpose |
|-------|---------|
| \`name\` | Object title in wallets |
| \`description\` | Longer description text |
| \`image_url\` | Image shown in wallets/explorers |
| \`link\` | Clickable URL for the object |
| \`project_url\` | Link to your project |

**Important:** Call \`display.update_version()\` after making changes — this notifies indexers to refresh cached metadata.`,
    },
    {
      type: 'TASK',
      title: 'Display for Pilot Badges',
      content: `Define a PilotBadge struct and set up Display with name and description templates.`,
      task: `Complete the module:

1. Define a \`PilotBadge\` struct with fields: \`id: UID\`, \`name: vector<u8>\`, \`rank: vector<u8>\`
2. Write an \`init\` function that:
   - Claims the Publisher
   - Creates a \`Display<PilotBadge>\` with templates for \`name\` (\`{name}\`) and \`description\` (\`Rank: {rank} pilot badge\`)
   - Calls \`update_version()\`
   - Transfers both Display and Publisher to the sender`,
      hint: `\`\`\`move
public struct PilotBadge has key, store {
    id: UID,
    name: vector<u8>,
    rank: vector<u8>,
}

fun init(otw: PILOT_BADGE, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);

    let mut display = display::new<PilotBadge>(&publisher, ctx);
    display.add(b"name".to_string(), b"{name}".to_string());
    display.add(b"description".to_string(), b"Rank: {rank} pilot badge".to_string());
    display.update_version();

    transfer::public_transfer(display, ctx.sender());
    transfer::public_transfer(publisher, ctx.sender());
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::pilot_badge;

use sui::package;
use sui::display;

public struct PILOT_BADGE has drop {}

// Define PilotBadge with: id (UID), name (vector<u8>), rank (vector<u8>)


// Write init:
//   1. Claim Publisher
//   2. Create Display<PilotBadge> with name and description templates
//   3. Call update_version()
//   4. Transfer Display and Publisher to sender

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*pilot_badge\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::pilot_badge;' },
        { test: (code: string) => /public\s+struct\s+PILOT_BADGE\s+has\s+drop/.test(code), errorMsg: 'Keep the PILOT_BADGE One-Time Witness struct.' },
        { test: (code: string) => /struct\s+PilotBadge\s+has\s+key/.test(code), errorMsg: 'Define a PilotBadge struct with key ability.' },
        { test: (code: string) => /name\s*:\s*vector\s*<\s*u8\s*>/.test(code), errorMsg: 'PilotBadge needs a name field of type vector<u8>.' },
        { test: (code: string) => /rank\s*:\s*vector\s*<\s*u8\s*>/.test(code), errorMsg: 'PilotBadge needs a rank field of type vector<u8>.' },
        { test: (code: string) => /fun\s+init\s*\(/.test(code), errorMsg: 'Write an init function.' },
        { test: (code: string) => /package\s*::\s*claim/.test(code), errorMsg: 'Use package::claim to get the Publisher.' },
        { test: (code: string) => /display\s*::\s*new\s*<\s*PilotBadge\s*>/.test(code), errorMsg: 'Use display::new<PilotBadge> to create the Display object.' },
        { test: (code: string) => /update_version\s*\(\s*\)/.test(code), errorMsg: 'Call display.update_version() after adding fields.' },
        { test: (code: string) => (code.match(/transfer\s*::\s*public_transfer/g) || []).length >= 2, errorMsg: 'Transfer both the Display and Publisher to the sender.' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
   Build Successful

PilotBadge Display is configured!
Wallets will show name and rank for each badge.`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 13.3 — Summary',
      content: `- **\`Display<T>\`** — metadata templates that tell wallets/explorers how to render your objects
- Uses \`{field_name}\` syntax to interpolate struct fields into display strings
- Common fields: \`name\`, \`description\`, \`image_url\`, \`link\`, \`project_url\`
- Requires a **Publisher** to create (proof you own the type)
- Call \`display.update_version()\` after changes to notify indexers
- Without Display, objects appear as raw data — with it, they have rich visual metadata`,
    },
  ],
};
export default lesson;
