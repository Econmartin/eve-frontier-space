import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '2.1',
  title: 'Functions',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Defining Functions',
      content: `Functions are the core building block of any Move module. They are declared with the \`fun\` keyword.

\`\`\`move
module frontier::ship;

fun hull_strength(base: u64, armor: u64): u64 {
    base + armor
}
\`\`\`

Don't worry about \`u64\` yet — it just means "a whole number". We'll cover all the number types next lesson.

Key parts of a function:
- **Name**: starts with lowercase, uses \`snake_case\`
- **Parameters**: each has a name and a type, separated by commas
- **Return type**: after \`:\` following the parameter list. Omit it for functions that return nothing
- **Body**: the last expression is the return value (no \`return\` keyword needed, though you can use it)

### Visibility Modifiers

Functions have three visibility levels:

- \`fun\` — **private** to the module (default). Only other functions in the same module can call it
- \`public fun\` — callable from **any** other module
- \`public(package) fun\` — callable from other modules **within the same package** only

\`\`\`move
module frontier::ship;

// Only this module can call this
fun internal_calculation(x: u64): u64 {
    x * 2
}

// Any module can call this
public fun max_speed(): u64 {
    1000
}

// Only modules in the frontier package can call this
public(package) fun maintenance_cost(): u64 {
    50
}
\`\`\`

Private functions are your internal helpers — they keep your module's logic safe from outside interference.`,
    },
    {
      type: 'TASK',
      title: 'Your First Function',
      content: `Let's write a simple function that takes a parameter and returns a value.

For example:

\`\`\`move
public fun max_speed(): u64 {
    1000
}
\`\`\``,
      task: `Write a \`public fun\` named \`max_shields\` that takes no parameters and returns the \`u64\` value \`500\`.`,
      hint: `\`\`\`move
public fun max_shields(): u64 {
    500
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::ship;

// Write a public function called max_shields
// that returns the u64 value 500


#[test]
fun test_max_shields() {
    assert!(max_shields() == 500, 0);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*ship\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::ship;' },
        { test: code => /public\s+fun\s+max_shields\s*\(\s*\)\s*:\s*u64/.test(code), errorMsg: 'Write: public fun max_shields(): u64 { ... }' },
        { test: code => /\b500\b/.test(code), errorMsg: 'The function should return 500.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::ship::test_max_shields
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Calling Functions',
      content: `Functions can be called in different ways depending on where they live.

### Within the same module

Just use the function name directly:

\`\`\`move
module frontier::pilot;

fun rank_bonus(rank: u64): u64 {
    rank * 10
}

fun pilot_power(base: u64, rank: u64): u64 {
    base + rank_bonus(rank)
}
\`\`\`

### From another module

Use the module path, or import with \`use\`:

\`\`\`move
module frontier::fleet;

use frontier::pilot;

fun fleet_power(base: u64, rank: u64): u64 {
    // Call using the module name
    pilot::pilot_power(base, rank)
}
\`\`\`

You can also import a specific function directly:

\`\`\`move
use frontier::pilot::pilot_power;

fun fleet_power(base: u64, rank: u64): u64 {
    pilot_power(base, rank)
}
\`\`\`

### Functions that return nothing

If a function doesn't return a value, just omit the return type. These are useful for operations that modify state:

\`\`\`move
fun log_launch() {
    // does something but returns nothing
}
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Ship Power Functions',
      content: `Let's build a ship power calculator. You need to write two functions — one private helper and one public function that uses it.`,
      task: `1. Write a private function \`engine_output\` that takes \`engines: u64\` and \`efficiency: u64\` and returns \`engines * efficiency\`
2. Write a \`public fun\` named \`total_power\` that takes \`engines: u64\`, \`efficiency: u64\`, and \`bonus: u64\`. It should call \`engine_output\` to get the base power, then return \`base + bonus\``,
      hint: `Remember every function that returns a value needs a return type after \`:\`. Here's the shape:

\`\`\`move
fun engine_output(engines: u64, efficiency: u64): u64 {
    engines * efficiency
}

public fun total_power(engines: u64, efficiency: u64, bonus: u64): u64 {
    engine_output(engines, efficiency) + bonus
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::combat;

// Write a private function 'engine_output'
// that takes engines and efficiency, returns engines * efficiency


// Write a public function 'total_power'
// that uses engine_output and adds a bonus


#[test]
fun test_power() {
    // 4 engines * 25 efficiency = 100, + 50 bonus = 150
    assert!(total_power(4, 25, 50) == 150, 0);
    // 2 engines * 10 efficiency = 20, + 0 bonus = 20
    assert!(total_power(2, 10, 0) == 20, 1);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*combat\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::combat;' },
        { test: code => /fun\s+engine_output\s*\(/.test(code) && !/public\s+fun\s+engine_output/.test(code), errorMsg: 'Write a private function called engine_output (no public keyword).' },
        { test: code => /public\s+fun\s+total_power\s*\(/.test(code), errorMsg: 'Write a public function called total_power.' },
        { test: code => /engine_output\s*\(/.test(code) && /total_power[\s\S]*engine_output/.test(code), errorMsg: 'total_power should call engine_output internally.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::combat::test_power
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 2.1 — Summary',
      content: `Here's what you've learned:

- Functions are declared with the \`fun\` keyword
- **Parameters** each have a name and type: \`fun name(param: Type): ReturnType\`
- The **last expression** is returned implicitly (no \`return\` needed)
- Omit the return type for functions that return nothing
- **Visibility**: \`fun\` (private), \`public fun\` (anyone), \`public(package) fun\` (same package)
- Call functions within a module by name, or from other modules using \`module::function()\`
- Use \`use\` to import modules or specific functions`,
    },
  ],
};
export default lesson;
