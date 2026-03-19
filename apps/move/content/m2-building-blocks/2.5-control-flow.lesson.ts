import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '2.5',
  title: 'Control Flow',
  time: '~35 min',
  pages: [
    {
      type: 'LEARN',
      title: 'If / Else',
      content: `\`if\` / \`else\` lets your code make decisions. Parentheses around the condition are **required** in Move:

\`\`\`move
module frontier::flight;

fun launch_check(fuel: u64, crew: u64) {
    if (fuel > 100 && crew > 0) {
        // cleared for launch
    } else {
        // hold launch
    };
}
\`\`\`

You can chain conditions with \`else if\`:

\`\`\`move
fun ship_class(tonnage: u64): u64 {
    if (tonnage > 1000) {
        3  // capital ship
    } else if (tonnage > 100) {
        2  // cruiser
    } else {
        1  // fighter
    }
}
\`\`\`

### if/else is an expression

Just like blocks, \`if\`/\`else\` produces a value. You can use it to assign a variable directly:

\`\`\`move
let status = if (shields > 0) { 1 } else { 0 };
\`\`\`

When both branches return a value, they must return the **same type**.`,
    },
    {
      type: 'TASK',
      title: 'Docking Permission',
      content: `Use if/else to make a decision.`,
      task: `Write a function \`can_dock\` that takes \`fuel: u64\` and \`cargo: u64\`:
- If fuel is less than \`10\`, return \`true\` (emergency docking always allowed)
- If cargo is greater than \`500\`, return \`false\` (too heavy)
- Otherwise return \`true\``,
      hint: `\`\`\`move
fun can_dock(fuel: u64, cargo: u64): bool {
    if (fuel < 10) {
        true
    } else if (cargo > 500) {
        false
    } else {
        true
    }
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::station;

// Write can_dock(fuel, cargo) -> bool
// fuel < 10: true (emergency), cargo > 500: false (too heavy), else: true


#[test]
fun test_docking() {
    assert!(can_dock(5, 1000) == true, 0);   // emergency: low fuel
    assert!(can_dock(100, 600) == false, 1);  // too heavy
    assert!(can_dock(100, 200) == true, 2);   // normal dock
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*station\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::station;' },
        { test: code => /fun\s+can_dock\s*\(/.test(code), errorMsg: 'Write a function called can_dock.' },
        { test: code => /if\s*\(/.test(code), errorMsg: 'Use if/else to check the conditions.' },
        { test: code => /:\s*bool/.test(code), errorMsg: 'can_dock should return bool.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::station::test_docking
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Loops',
      content: `### While loop

Repeats as long as the condition is true:

\`\`\`move
fun count_jumps(fuel: u64): u64 {
    let mut remaining = fuel;
    let mut jumps = 0;
    while (remaining >= 10) {
        remaining = remaining - 10;
        jumps = jumps + 1;
    };
    jumps
}
\`\`\`

### For loop

Move 2024 added range-based for loops — cleaner when you know the count:

\`\`\`move
fun total_crew(ships: u64, crew_per_ship: u64): u64 {
    let mut total = 0;
    for (_i in 0..ships) {
        total = total + crew_per_ship;
    };
    total
}
\`\`\`

\`0..ships\` means "from 0 up to (but not including) ships".

### Loop controls

- \`break\` — exit the loop immediately
- \`continue\` — skip to the next iteration`,
    },
    {
      type: 'TASK',
      title: 'Hyperspace Jumps',
      content: `Use a loop to calculate a journey.`,
      task: `Write a function \`jump_count\` that takes \`fuel: u64\` and \`cost_per_jump: u64\`.

Use a \`while\` loop to count how many jumps the ship can make before running out of fuel. Each jump costs \`cost_per_jump\` fuel.`,
      hint: `\`\`\`move
fun jump_count(fuel: u64, cost_per_jump: u64): u64 {
    let mut remaining = fuel;
    let mut jumps = 0;
    while (remaining >= cost_per_jump) {
        remaining = remaining - cost_per_jump;
        jumps = jumps + 1;
    };
    jumps
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::hyperspace;

// Write jump_count(fuel, cost_per_jump) -> u64
// Count how many jumps until fuel runs out


#[test]
fun test_jumps() {
    assert!(jump_count(100, 30) == 3, 0);   // 100 -> 70 -> 40 -> 10 (3 jumps)
    assert!(jump_count(50, 50) == 1, 1);     // exactly one jump
    assert!(jump_count(10, 20) == 0, 2);     // can't even jump once
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*hyperspace\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::hyperspace;' },
        { test: code => /fun\s+jump_count\s*\(/.test(code), errorMsg: 'Write a function called jump_count.' },
        { test: code => /while\s*\(/.test(code), errorMsg: 'Use a while loop to count the jumps.' },
        { test: code => /let\s+mut\s+/.test(code), errorMsg: 'You need mutable variables for the loop counter and remaining fuel.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::hyperspace::test_jumps
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Abort & Assert',
      content: `Sometimes your code needs to **stop everything** and say "this shouldn't happen." That's what \`abort\` does — it halts execution and reverts all changes.

### abort

\`abort\` takes an error code (a number) so you can identify what went wrong:

\`\`\`move
fun withdraw_fuel(tank: u64, amount: u64): u64 {
    if (amount > tank) {
        abort 1  // error: not enough fuel
    };
    tank - amount
}
\`\`\`

### assert!

\`assert!\` is a shorthand — it checks a condition and aborts if it's false:

\`\`\`move
fun withdraw_fuel(tank: u64, amount: u64): u64 {
    assert!(amount <= tank, 1);  // same as the if/abort above
    tank - amount
}
\`\`\`

\`assert!(condition, error_code)\` means: "if this condition is NOT true, abort with this error code."

### Named error constants

Use constants instead of magic numbers — makes your code much easier to debug:

\`\`\`move
const ENotEnoughFuel: u64 = 0;
const ECrewTooSmall: u64 = 1;

fun prepare_launch(fuel: u64, crew: u64) {
    assert!(fuel > 100, ENotEnoughFuel);
    assert!(crew >= 3, ECrewTooSmall);
}
\`\`\`

The \`E\` prefix is a Move convention for error constants.`,
    },
    {
      type: 'TASK',
      title: 'Flight Computer',
      content: `Put everything together — if/else, loops, and assert.`,
      task: `1. Add error constants \`ENoFuel\` (value \`0\`) and \`ENoRoute\` (value \`1\`)
2. Write \`validate_route\` that takes \`fuel: u64\` and \`waypoints: u64\`. Assert that fuel > 0 and waypoints > 0 using the error constants
3. Write \`journey_cost\` that takes \`waypoints: u64\` and returns the total fuel cost — each waypoint costs 15 fuel. Use a loop to calculate`,
      hint: `\`\`\`move
const ENoFuel: u64 = 0;
const ENoRoute: u64 = 1;

fun validate_route(fuel: u64, waypoints: u64) {
    assert!(fuel > 0, ENoFuel);
    assert!(waypoints > 0, ENoRoute);
}

fun journey_cost(waypoints: u64): u64 {
    let mut cost = 0;
    let mut i = 0;
    while (i < waypoints) {
        cost = cost + 15;
        i = i + 1;
    };
    cost
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::flight;

// Add error constants ENoFuel (0) and ENoRoute (1)


// Write validate_route(fuel, waypoints)
// Assert fuel > 0 and waypoints > 0


// Write journey_cost(waypoints) -> u64
// Each waypoint costs 15 fuel, use a loop


#[test]
fun test_validate() {
    validate_route(100, 3);  // should not abort
}

#[test]
#[expected_failure(abort_code = 0)]
fun test_no_fuel() {
    validate_route(0, 3);  // should abort with ENoFuel
}

#[test]
fun test_journey() {
    assert!(journey_cost(0) == 0, 0);
    assert!(journey_cost(3) == 45, 1);
    assert!(journey_cost(10) == 150, 2);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*flight\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::flight;' },
        { test: code => /const\s+ENoFuel\s*:\s*u64\s*=\s*0/.test(code), errorMsg: 'Add: const ENoFuel: u64 = 0;' },
        { test: code => /const\s+ENoRoute\s*:\s*u64\s*=\s*1/.test(code), errorMsg: 'Add: const ENoRoute: u64 = 1;' },
        { test: code => /fun\s+validate_route\s*\(/.test(code), errorMsg: 'Write a function called validate_route.' },
        { test: code => /assert!\s*\(/.test(code), errorMsg: 'Use assert! to check the conditions.' },
        { test: code => /fun\s+journey_cost\s*\(/.test(code), errorMsg: 'Write a function called journey_cost.' },
        { test: code => /while\s*\(/.test(code) || /for\s*\(/.test(code), errorMsg: 'Use a loop (while or for) to calculate the total cost.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::flight::test_validate
[ PASS ] frontier::flight::test_no_fuel
[ PASS ] frontier::flight::test_journey
Test result: OK. Total tests: 3; passed: 3; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Labeled Control Flow',
      content: `When you have **nested loops**, sometimes you need to break out of the outer loop from inside the inner one. Move supports **labels** — you give a loop a name and then target it with \`break\` or \`continue\`.

Labels start with a single quote: \`'label_name:\`

\`\`\`move
module frontier::navigation;

fun find_target(sectors: &vector<vector<u64>>, target: u64): bool {
    let mut i = 0;
    let found = 'search: loop {
        if (i >= sectors.length()) {
            break 'search false
        };
        let sector = &sectors[i];
        let mut j = 0;
        while (j < sector.length()) {
            if (sector[j] == target) {
                break 'search true   // exits BOTH loops
            };
            j = j + 1;
        };
        i = i + 1;
    };
    found
}
\`\`\`

Without labels, \`break\` only exits the **innermost** loop. With \`'search:\`, we can break all the way out to the outer loop.

### \`loop\` can return values

\`loop\` (unlike \`while\`) can produce a value via \`break\`:

\`\`\`move
let result = loop {
    if (done) {
        break 42   // the loop "returns" 42
    };
};
\`\`\`

### Labeled blocks

You can also label a regular code block and use \`return\` to exit it early:

\`\`\`move
fun classify(n: u64): u64 {
    let category = 'check: {
        if (n == 0) { return 'check 0 };
        if (n < 10) { return 'check 1 };
        2
    };
    category
}
\`\`\`

Key rules:
- Labels use \`'name:\` syntax (single quote, then name, then colon)
- Use \`break 'label\` and \`continue 'label\` with **loop labels**
- Use \`return 'label\` with **block labels**
- \`loop\` can return a value via \`break value\` or \`break 'label value\``,
    },
    {
      type: 'TASK',
      title: 'Sector Search',
      content: `Use a labeled loop to sum values with a ceiling.`,
      task: `Write a function \`count_until_limit\` that takes \`values: &vector<u64>\` and \`limit: u64\`.

Use a \`'scan: loop\` to iterate through the vector and sum the values. If adding the next value would make the sum exceed \`limit\`, break out with the current sum. If you reach the end, break with the total sum.`,
      hint: `\`\`\`move
fun count_until_limit(values: &vector<u64>, limit: u64): u64 {
    let mut sum = 0;
    let mut i = 0;
    'scan: loop {
        if (i >= values.length()) {
            break 'scan sum
        };
        if (sum + values[i] > limit) {
            break 'scan sum
        };
        sum = sum + values[i];
        i = i + 1;
    }
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::scanner;

// Write count_until_limit(values, limit) -> u64
// Sum values until adding the next one would exceed limit
// Use a labeled loop: 'scan: loop { ... break 'scan sum ... }


#[test]
fun test_count() {
    let vals = vector[10u64, 20, 30, 40, 50];
    assert!(count_until_limit(&vals, 55) == 30, 0);   // 10+20=30, adding 30 would be 60 > 55
    assert!(count_until_limit(&vals, 1000) == 150, 1); // all values fit
}

#[test]
fun test_empty() {
    let empty: vector<u64> = vector[];
    assert!(count_until_limit(&empty, 100) == 0, 0);
}
`,
      checks: [
        { test: code => /module\s+frontier\s*::\s*scanner\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::scanner;' },
        { test: code => /fun\s+count_until_limit\s*\(/.test(code), errorMsg: 'Write a function called count_until_limit.' },
        { test: code => /'/.test(code), errorMsg: 'Use a label (starts with single quote) on your loop.' },
        { test: code => /break/.test(code), errorMsg: 'Use break to exit the labeled loop with a value.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::scanner::test_count
[ PASS ] frontier::scanner::test_empty
Test result: OK. Total tests: 2; passed: 2; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 2.5 — Summary',
      content: `Here's what you've learned:

- \`if (cond) { ... } else { ... }\` — parentheses required around the condition
- Chain with \`else if\` for multiple branches
- if/else is an **expression** — it returns a value: \`let x = if (a) { 1 } else { 0 };\`
- \`while (cond) { ... }\` repeats while true
- \`for (i in 0..n) { ... }\` for counted loops (Move 2024)
- \`break\` exits a loop, \`continue\` skips to next iteration
- \`'label: loop/while\` — labels let you \`break\` or \`continue\` a specific loop in nested loops
- \`loop\` can return a value via \`break value\`
- \`'label: { ... }\` — labeled blocks with \`return 'label value\` for early exits
- \`abort code\` halts execution and reverts all changes
- \`assert!(condition, code)\` is shorthand for "abort if condition is false"
- Use \`E\`-prefixed constants for error codes: \`const ENotFound: u64 = 0;\``,
    },
  ],
};
export default lesson;
