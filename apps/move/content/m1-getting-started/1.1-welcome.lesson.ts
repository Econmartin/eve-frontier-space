import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '1.1',
  title: 'Welcome to Move',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'What is Move?',
      content: `**Move** is a programming language built for writing safe smart contracts on blockchains like **Sui**. Before we write any code, let's understand what makes it different.

If you've written JavaScript or Python before, you know that values are freely copyable — \`let y = x\` and now both hold the same data. That's fine for most programming, but it's a problem when your values represent real assets like money or tickets. You don't want money to be copy-pasteable.

Move was designed around three ideas:

**1. Resources can't be copied or lost by accident.**
If you create a token, the language itself guarantees you can't duplicate it. You can't accidentally discard it either — the compiler will refuse to compile code that "forgets" about a valuable resource.

**2. Values move, they don't copy.**
When you assign a value to a new variable, the original is gone — it has been *moved*. Think of handing someone a physical object: once you hand it over, you don't have it anymore. The language is literally named after this behaviour.

**3. Only the owner module controls a type.**
If someone publishes a \`Coin\` module, only that module's code can create, destroy, or access internal fields of coins. No other code can. The rules are locked in at the module level.

On Sui specifically, Move programs create and manage **objects** — persistent pieces of data stored on the blockchain. Every object has a unique ID and an owner. Your Move code defines what objects exist, who can change them, and how they behave.

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

A **module** is a single file that contains functions, structs, and constants. Modules are the unit of code used in Move — similar to a class or namespace in other languages. Inside a module you can have:

- **Functions** — blocks of logic (\`fun my_function() { ... }\`)
- **Structs** — custom data types
- **Constants** — fixed values
- **Imports** — things pulled in from other modules

### Move 2024 Syntax

This course uses *Move 2024* — the modern edition of Move. The key difference is that modules are declared at the **file level** with a semicolon, rather than wrapped in braces:

\`\`\`move
// Move 2024 (modern) — file-level module
module my_package::my_module;

// Code goes directly here...
public fun ship_number(): u64 { 42 }
\`\`\`

You're ready to write your first module!`,
    },
    {
      type: 'TASK',
      title: 'Your First Module',
      content: `Every Move program starts with a module declaration. The syntax is:

\`module package_name::module_name;\`

Both names use *snake_case* and are separated by \`::\`.`,
      task: `Declare a module named \`ship\` inside the \`frontier\` package.`,
      hint: `Type exactly: \`module frontier::ship;\``,
      bonus: null,
      starterCode: `// Every Move program starts with a module declaration.
// Syntax: module package_name::module_name;

`,
      checks: [
        {
          test: code => /module\s+frontier\s*::\s*ship\s*;/.test(code),
          errorMsg: 'Declare your module as: module frontier::ship;',
        },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
   Building module frontier::ship
Build Successful
✓ Module frontier::ship is ready.`,
    },
    {
      type: 'TASK',
      title: 'Add a Function',
      content: `Now let's add something to our module. A **function** is declared with the \`fun\` keyword. Don't worry about the syntax details yet — we'll cover functions properly in the next subject.

\`\`\`move
fun my_function(): u64 {
    42
}
\`\`\``,
      task: `The module is already declared for you. Add a function called \`ship_id\` that returns the number \`42\`. The test is pre-written — hit Run to check your work.`,
      hint: `Add this below the module declaration:

\`\`\`move
fun ship_id(): u64 {
    42
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::ship;

// Add a function called ship_id that returns 42


#[test]
fun test_ship_id() {
    assert!(ship_id() == 42, 0);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*ship\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::ship;' },
        { test: code => /fun\s+ship_id\s*\(\s*\)\s*:\s*u64/.test(code), errorMsg: 'Write: fun ship_id(): u64 { 42 }' },
        { test: code => /\b42\b/.test(code), errorMsg: 'The function should return 42.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::ship::test_ship_id
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 1.1 — Summary',
      content: `Great work! Here's what you've learned:

- Move is built around **resources** — values that can't be copied or lost by accident
- Values **move** instead of copying — the language is named after this behaviour
- Only the **owner module** can control a type's internals
- On Sui, Move programs create and manage **objects** with unique IDs
- All Move code lives inside a **module**, grouped into a **package**
- Move 2024 uses file-level module declarations: \`module pkg::name;\`
- Functions are declared with \`fun\` and the last expression is the return value`,
    },
  ],
};
export default lesson;
