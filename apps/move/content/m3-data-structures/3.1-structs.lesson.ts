// TODO: When reviewing m3, make sure to introduce the `address` type properly here or in a dedicated lesson.
// It was listed but not taught in m2 (2.2 covers integers & booleans only).
// Address fits naturally with structs/objects since that's where students first need it.
// Also ensure `vector` gets a proper intro in 3.2 — students have seen it listed but not used yet.
import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '3.1',
  title: 'Structs',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Grouping Data with Structs',
      content: `A **struct** groups related fields into a single named type. Structs are the primary way to model domain objects in Move.

\`\`\`move
public struct Ship {
    fuel: u64,
    shields: u64,
    name: vector<u8>,
}
\`\`\`

### Creating Instances

\`\`\`move
let ship = Ship {
    fuel: 100,
    shields: 80,
    name: b"Falcon",
};
\`\`\`

### Accessing Fields

\`\`\`move
let f = ship.fuel;    // read a field
ship.fuel = 90;       // write (requires mut)
\`\`\`

### Destructuring

\`\`\`move
let Ship { fuel, shields, name } = ship;
\`\`\`

Struct fields are **private to the defining module** by default — other modules cannot read or write them directly. This is Move's encapsulation model.`,
    },
    {
      type: 'TASK',
      title: 'Define a Struct',
      content: `Model a spaceship by defining a struct with the right fields.`,
      task: `In module \`ships::types\`, define a \`public struct\` named \`Ship\` with three fields: \`fuel: u64\`, \`shields: u64\`, and \`name: vector<u8>\`.`,
      hint: `\`public struct Ship { fuel: u64, shields: u64, name: vector<u8> }\``,
      bonus: null,
      starterCode: `module ships::types;

// Define a public struct called Ship
// with fields: fuel (u64), shields (u64), name (vector<u8>)

`,
      checks: [
        { test: code => /public\s+struct\s+Ship\s*\{/.test(code), errorMsg: 'Write: public struct Ship { ... }' },
        { test: code => /fuel\s*:\s*u64/.test(code), errorMsg: 'Add field: fuel: u64' },
        { test: code => /shields\s*:\s*u64/.test(code), errorMsg: 'Add field: shields: u64' },
        { test: code => /name\s*:\s*vector\s*<\s*u8\s*>/.test(code), errorMsg: 'Add field: name: vector<u8>' },
      ],
      successOutput: `$ sui move build
   Compiling ships v0.0.1
Build Successful
✓ ships::types::Ship compiled
  Ship {
    fuel: u64,
    shields: u64,
    name: vector<u8>
  }`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 3.1 — Summary',
      content: `- Structs group related fields into a named type: \`public struct Name { field: Type }\`
- Create instances with \`Name { field: value }\`
- Access fields with dot notation: \`obj.field\`
- Fields are private to the defining module by default
- Structs can be destructured: \`let Name { field } = value;\``,
    },
  ],
};
export default lesson;
