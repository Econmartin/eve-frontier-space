import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '1.1',
  title: 'Welcome to Move',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'What is Move?',
      content: `**Move** is a programming language designed from the ground up for safe, fast smart contracts. It was originally created at Meta (formerly Facebook) for the Diem blockchain, and is now the foundation of *Sui* — one of the fastest blockchains in the world.

Unlike languages such as Solidity, Move is built around a concept called **resources** — digital assets that cannot be accidentally copied or destroyed. This design eliminates entire categories of bugs that have cost the industry billions of dollars.

### Why Move on Sui?

Sui extends Move with an *object-centric model*. Every asset on Sui is a typed object with a unique ID, owned by an address. This enables:

- Parallel transaction execution (no global state bottleneck)
- Instant finality for owned objects
- Built-in safety for digital ownership

### What you'll build

In this course you'll go from zero to writing real Sui smart contracts — starting with the basics of the Move language and progressing through structs, abilities, error handling, testing, and the Sui object model.`,
    },
    {
      type: 'LEARN',
      title: 'The Move Mental Model',
      content: `Before writing your first line of Move, let's build the right mental model. Move programs are organized into **packages** and **modules**.

\`\`\`move
package
└── module_a   (a .move file)
└── module_b   (another .move file)
\`\`\`

A **package** is a directory with a \`Move.toml\` configuration file. It groups related modules together and has a globally unique address on-chain.

A **module** is a single file that contains functions, structs, and constants. Modules are the unit of code reuse in Move — similar to a class or namespace in other languages.

### Move 2024 Syntax

This course uses *Move 2024* — the modern edition of Move. The key difference is that modules are declared at the **file level** with a semicolon, rather than wrapped in braces:

\`\`\`move
// Move 2024 (modern) — file-level module
module my_package::my_module;

// Code goes directly here...
public fun hello(): u64 { 42 }
\`\`\`

You're ready to write your first module!`,
    },
    {
      type: 'TASK',
      title: 'Your First Module',
      content: `Every Move program starts with a module declaration. The syntax is \`module package_name::module_name;\` — using *snake_case* for both names, separated by \`::\`.`,
      task: `Declare a module named \`first_steps\` inside the \`learning\` package.`,
      hint: `Type exactly: \`module learning::first_steps;\``,
      bonus: null,
      starterCode: `// Every Move program starts with a module declaration.
// Syntax: module package_name::module_name;

`,
      checks: [
        {
          test: code => /module\s+learning\s*::\s*first_steps\s*;/.test(code),
          errorMsg: 'Declare your module as: module learning::first_steps;',
        },
      ],
      successOutput: `$ sui move build
   Compiling learning v0.0.1
   Building module learning::first_steps
Build Successful
✓ Module learning::first_steps is ready.`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 1.1 — Summary',
      content: `Great work! Here's what you've learned:

- Move is a resource-safe language designed for smart contracts
- Sui extends Move with an object-centric execution model
- All Move code lives inside a **module**, grouped into a **package**
- Move 2024 uses file-level module declarations: \`module pkg::name;\`
- Module and package names use *snake_case*`,
    },
  ],
};
export default lesson;
