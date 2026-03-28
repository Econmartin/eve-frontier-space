import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '1.2',
  title: 'Comments & Code Structure',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Comments and Code Structure',
      content: `Before we dive into types and deeper syntax, let's cover how Move code is structured and how to write comments. Good comments make your code readable, and understanding structure will help you read the examples ahead.

### Comments

- \`//\` — single-line comment (everything after \`//\` on that line is ignored)
- \`/* ... */\` — block comment (can span multiple lines)
- \`///\` — documentation comment (appears in generated docs, placed before functions and structs)

### Structure within a module

Members can appear in any order inside a module, but a common convention is:

1. Imports (\`use\` statements)
2. Constants
3. Struct / enum definitions
4. Functions

### Semicolons

Most statements end with \`;\`. The last expression in a block does **not** need a semicolon — it becomes the return value. This trips people up at first, and we'll cover it in depth in the expressions lesson.`,
    },
    {
      type: 'LEARN',
      title: 'Comments in Action',
      content: `Let's look at a module that uses all three comment styles and follows the conventional structure:

\`\`\`move
module frontier::fleet;

// This is a single-line comment

/*
    This is a block comment.
    It can span multiple lines.
*/

/// Returns the total firepower of a fleet.
/// Each ship contributes its base damage multiplied by the fleet size.
fun fleet_firepower(ship_damage: u64, fleet_size: u64): u64 {
    // Scale damage by the number of ships
    ship_damage * fleet_size   // no semicolon — this is the return value
}

#[test]
fun test_fleet_firepower() {
    let power = fleet_firepower(150, 4);  // semicolon — this is a statement
    assert!(power == 600, 0);
}
\`\`\`

Notice:
- The \`///\` doc comment sits directly above the function it documents
- \`ship_damage * fleet_size\` has **no semicolon** — it's the last expression, so it's the return value
- \`let power = fleet_firepower(150, 4);\` **has** a semicolon — it's a statement, not a return value
- \`#[test]\` marks a function as a test (only runs during testing, not on chain)
- \`assert!(condition, error_code)\` checks that the condition is true; aborts with the error code if not`,
    },
    {
      type: 'TASK',
      title: 'Add a Doc Comment',
      content: `The starter code has a working function but no documentation. Add a doc comment to explain what it does.`,
      task: `Add a \`///\` doc comment directly above the \`fleet_speed\` function explaining what it does (e.g. "Returns the average speed of the fleet").`,
      hint: `Add a line like \`/// Returns the average speed of the fleet.\` directly above the \`fun\` line.`,
      bonus: null,
      starterCode: `module frontier::fleet;

fun fleet_speed(total_speed: u64, ship_count: u64): u64 {
    total_speed / ship_count
}




#[test]
fun test_fleet_speed() {
    assert!(fleet_speed(300, 3) == 100, 0);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*fleet\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fleet;' },
        { test: code => /\/\/\/.*\n\s*fun\s+fleet_speed/.test(code), errorMsg: 'Add a /// doc comment directly above the fleet_speed function.' },
        { test: code => /total_speed\s*\/\s*ship_count/.test(code), errorMsg: 'Don\'t change the function body — it should still return total_speed / ship_count.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::fleet::test_fleet_speed
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'TASK',
      title: 'Fix the Bug',
      content: `The starter code has a function with a bug. The test is already written — but it will fail until you fix the issue.`,
      task: `Fix the bug in \`fuel_remaining\` so it returns \`tank - used\` instead of adding them.`,
      hint: `Change \`tank + used\` to \`tank - used\`.`,
      bonus: null,
      starterCode: `module frontier::ship;

/// Returns the fuel left after consumption.
fun fuel_remaining(tank: u64, used: u64): u64 {
    tank + used  // BUG: this should subtract, not add
}

#[test]
fun test_fuel_remaining() {
    assert!(fuel_remaining(100, 30) == 70, 0);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*ship\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::ship;' },
        { test: code => /tank\s*-\s*used/.test(code), errorMsg: 'Fix the function so it returns tank - used.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::ship::test_fuel_remaining
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 1.2 — Summary',
      content: `Here's what you've learned:

- \`//\` for single-line comments, \`/* */\` for block comments, \`///\` for doc comments
- Modules conventionally order: imports, constants, structs, functions
- The last expression in a block is the return value (no semicolon needed)
- Regular statements end with a semicolon
- \`#[test]\` marks a function as a test
- \`assert!(condition, error_code)\` verifies conditions in tests`,
    },
  ],
};
export default lesson;
