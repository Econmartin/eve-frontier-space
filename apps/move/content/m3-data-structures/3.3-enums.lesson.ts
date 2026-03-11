import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '3.3',
  title: 'Enums',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Enums in Move 2024',
      content: `**Enums** (enumerated types) are a Move 2024 feature. An enum defines a type that can be exactly *one* of several named variants.

\`\`\`move
public enum Status {
    Active,
    Inactive,
    Paused,
}
\`\`\`

Enums are great for representing **state machines** — things that can be in different states.

### Variants with Data

Variants can carry data:

\`\`\`move
public enum Command {
    Thrust(u64),          // variant with a u64
    Turn { angle: u8 },   // variant with named fields
    Stop,                 // unit variant
}
\`\`\`

### Matching on Enums

\`\`\`move
let action = match (cmd) {
    Command::Thrust(power) => power,
    Command::Turn { angle } => angle as u64,
    Command::Stop => 0,
};
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Define an Enum',
      content: `Model the operational status of a ship system using an enum.`,
      task: `In module \`state::machine\`, define a \`public enum\` named \`Status\` with three variants: \`Active\`, \`Inactive\`, and \`Paused\`.`,
      hint: `\`public enum Status { Active, Inactive, Paused }\``,
      bonus: null,
      starterCode: `module state::machine;

// Define a public enum called Status
// with variants: Active, Inactive, Paused

`,
      checks: [
        { test: code => /public\s+enum\s+Status\s*\{/.test(code), errorMsg: 'Write: public enum Status { ... }' },
        { test: code => /\bActive\b/.test(code), errorMsg: 'Add variant: Active' },
        { test: code => /\bInactive\b/.test(code), errorMsg: 'Add variant: Inactive' },
        { test: code => /\bPaused\b/.test(code), errorMsg: 'Add variant: Paused' },
      ],
      successOutput: `$ sui move build
   Compiling state v0.0.1
Build Successful
✓ state::machine::Status compiled
  Variants: Active | Inactive | Paused`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 3.3 — Summary',
      content: `- Enums define a type with multiple named variants
- Introduced in Move 2024 edition
- Variants can be unit (\`Stop\`), tuple (\`Thrust(u64)\`), or struct-like (\`Turn { angle: u8 }\`)
- Use \`match\` expressions to handle each variant exhaustively
- Enums are ideal for state machines and tagged unions`,
    },
  ],
};
export default lesson;
