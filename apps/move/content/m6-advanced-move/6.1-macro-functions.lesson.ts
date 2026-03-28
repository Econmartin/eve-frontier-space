import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '6.1',
  title: 'Macro Functions',
  time: '~30 min',
  pages: [
    {
      type: 'LEARN',
      title: 'What Are Macros?',
      content: `Macro functions are special functions that are **expanded at compile time** — the compiler copies the macro body into every place it's called, substituting the arguments. This is different from normal functions where arguments are evaluated first.

Why does this matter? Macros can:
- Take **code** as a parameter (called lambdas — small inline functions)
- Evaluate arguments **lazily** (only when used)
- Work with any type without knowing it in advance

You've already been using a macro: \`assert!\` — that \`!\` at the end is the hint. All macro calls end with \`!\`.

### Basic syntax

\`\`\`move
module frontier::utils;

// A macro function — note the $ prefix on parameters
macro fun apply_twice($f: |u64| -> u64, $x: u64): u64 {
    let result = $f($x);
    $f(result)
}

// Call it with !
fun demo(): u64 {
    apply_twice!(|x| x + 1, 5)   // result: 7 (5+1=6, 6+1=7)
}
\`\`\`

Key differences from normal functions:
- Use \`macro fun\` instead of \`fun\`
- Parameter names start with \`$\`
- Type parameter names start with \`$\`
- Called with \`!\`: \`my_macro!(args)\`
- Arguments are substituted as **expressions**, not evaluated first`,
    },
    {
      type: 'LEARN',
      title: 'Lambdas — Passing Code to Macros',
      content: `**Lambdas** are small inline functions you pass to macros. The syntax is \`|params| body\`:

\`\`\`move
module frontier::fleet;

// A macro that applies an operation to each fuel level
macro fun adjust_all($levels: &mut vector<u64>, $f: |u64| -> u64) {
    let v = $levels;
    let mut i = 0;
    while (i < v.length()) {
        v[i] = $f(v[i]);
        i = i + 1;
    };
}

fun demo() {
    let mut fuel_levels = vector[100, 80, 60, 40];

    // Double all fuel levels
    adjust_all!(&mut fuel_levels, |f| f * 2);
    // fuel_levels is now [200, 160, 120, 80]

    // Cap fuel levels at 150
    adjust_all!(&mut fuel_levels, |f| if (f > 150) 150 else f);
}
\`\`\`

### Lambda type syntax

Lambda types are written as \`|input_types| -> return_type\`:

| Lambda type | Meaning |
|-------------|---------|
| \`\\|u64\\| -> u64\` | Takes a \`u64\`, returns a \`u64\` |
| \`\\|u64, u64\\| -> bool\` | Takes two \`u64\`s, returns a \`bool\` |
| \`\\|&mut u64\\|\` | Takes a \`&mut u64\`, returns \`()\` |

If the return type is \`()\`, you can omit the \`-> ()\` part.

### Capturing variables

Lambdas can **capture** variables from their surrounding scope — meaning they can use variables defined outside the lambda:

\`\`\`move
let bonus = 10;
adjust_all!(&mut levels, |f| f + bonus);   // bonus is captured
\`\`\`

### Limitation

Lambdas can only be used directly in macro calls — you cannot store them in variables:

\`\`\`move
// This does NOT work:
// let f = |x| x + 1;   // Error! Lambdas must be used directly in macro calls
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Fleet Mapper',
      content: `Use macros with lambdas to transform data.

For example:

\`\`\`move
// Lambda syntax: |param| body
let doubled = map_fleet!(values, |x| x * 2);

// Lambda can capture outer variables:
let factor = 3;
let scaled = map_fleet!(values, |x| x * factor);

// filter keeps elements where the test returns true:
let big = filter_fleet!(values, |x| *x > 50);
\`\`\``,
      task: `The \`map_fleet\` and \`filter_fleet\` macros are provided. Use them to write two regular functions:

1. \`double_ratings(ratings: vector<u64>): vector<u64>\` — doubles every value using \`map_fleet!\`
2. \`filter_active(fuel_levels: vector<u64>): vector<u64>\` — keeps only values greater than 0 using \`filter_fleet!\``,
      hint: `\`\`\`move
fun double_ratings(ratings: vector<u64>): vector<u64> {
    map_fleet!(ratings, |x| x * 2)
}

fun filter_active(fuel_levels: vector<u64>): vector<u64> {
    filter_fleet!(fuel_levels, |x| *x > 0)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fleet_ops;

// This macro transforms a vector by applying a function to each element
macro fun map_fleet($v: vector<u64>, $f: |u64| -> u64): vector<u64> {
    let mut v = $v;
    let mut result = vector[];
    while (!v.is_empty()) {
        result.push_back($f(v.remove(0)));
    };
    result
}

// This macro filters a vector, keeping elements where the test is true
macro fun filter_fleet($v: vector<u64>, $test: |&u64| -> bool): vector<u64> {
    let mut v = $v;
    let mut result = vector[];
    while (!v.is_empty()) {
        let item = v.remove(0);
        if ($test(&item)) {
            result.push_back(item);
        };
    };
    result
}

// Write double_ratings — use map_fleet! to double every value


// Write filter_active — use filter_fleet! to keep values > 0


#[test]
fun test_double() {
    let ratings = vector[10u64, 20, 30];
    let doubled = double_ratings(ratings);
    assert!(doubled[0] == 20, 0);
    assert!(doubled[1] == 40, 1);
    assert!(doubled[2] == 60, 2);
}

#[test]
fun test_filter() {
    let levels = vector[100u64, 0, 50, 0, 25];
    let active = filter_active(levels);
    assert!(active.length() == 3, 0);
    assert!(active[0] == 100, 1);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fleet_ops\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fleet_ops;' },
        { test: (code: string) => /fun\s+double_ratings\s*\(/.test(code), errorMsg: 'Write a function called double_ratings.' },
        { test: (code: string) => /fun\s+filter_active\s*\(/.test(code), errorMsg: 'Write a function called filter_active.' },
        { test: (code: string) => /map_fleet\s*!/.test(code), errorMsg: 'Use map_fleet! to transform the ratings.' },
        { test: (code: string) => /filter_fleet\s*!/.test(code), errorMsg: 'Use filter_fleet! to filter the fuel levels.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::fleet_ops::test_double
[ PASS ] frontier::fleet_ops::test_filter
Test result: OK. Total tests: 2; passed: 2; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Macro Hygiene & Standard Library Macros',
      content: `### Hygiene

Macros in Move are **hygienic** — variables inside a macro can't accidentally clash with variables at the call site. The compiler gives each scope a unique identifier, so even if a macro uses a variable called \`x\` and your code also has an \`x\`, they won't interfere.

### Control flow in macros

\`return\` inside a macro returns from the **macro body**, not from the calling function:

\`\`\`move
module frontier::safe;

macro fun safe_divide($x: u64, $y: u64): u64 {
    let y = $y;
    if (y == 0) return 0;  // returns from the macro, not the caller
    $x / y
}
\`\`\`

### Standard library macros

The Move standard library provides macros that replace most manual loops. Here are the ones you'll use most:

\`\`\`move
// do! — run code N times with an index
5u64.do!(|i| { /* runs with i = 0, 1, 2, 3, 4 */ });

// do_ref! — iterate a vector by reference
v.do_ref!(|elem| { /* elem is &u64 */ });

// fold! — reduce a vector to a single value
let sum = v.fold!(0, |acc, x| acc + x);

// map! — transform each element into a new vector
let doubled = v.map!(|x| x * 2);

// any! / all! — test elements
let has_zero = v.any!(|x| *x == 0);
let all_positive = v.all!(|x| *x > 0);

// filter! — keep elements matching a condition
let big_ships = v.filter!(|x| x > 100);
\`\`\`

These are cleaner and less error-prone than manual \`while\` loops. Compare:

\`\`\`move
// Manual loop
let mut sum = 0;
let mut i = 0;
while (i < v.length()) {
    sum = sum + v[i];
    i = i + 1;
};

// With fold! macro — one line
let sum = v.fold!(0, |acc, x| acc + x);
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Fleet Stats with Macros',
      content: `Use standard library macros to write clean fleet analytics.

For example:

\`\`\`move
// fold! takes the vector by value — elements are passed as u64:
let sum = v.fold!(0, |acc, x| acc + x);

// any! borrows the vector — elements are passed as &u64:
let has_zero = v.any!(|x| *x == 0);
\`\`\``,
      task: `Write two functions using standard library macros:

1. \`total_fuel(levels: vector<u64>): u64\` — sum all fuel levels using \`fold!\`
2. \`any_critical(levels: vector<u64>): bool\` — return \`true\` if any level is below 20 using \`any!\``,
      hint: `\`\`\`move
fun total_fuel(levels: vector<u64>): u64 {
    levels.fold!(0, |acc, x| acc + x)
}

fun any_critical(levels: vector<u64>): bool {
    levels.any!(|x| *x < 20)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fleet_stats;

// Write total_fuel — sum all values using fold!


// Write any_critical — true if any value < 20 using any!


#[test]
fun test_total() {
    let levels = vector[100u64, 80, 60];
    assert!(total_fuel(levels) == 240, 0);
}

#[test]
fun test_total_empty() {
    let empty: vector<u64> = vector[];
    assert!(total_fuel(empty) == 0, 0);
}

#[test]
fun test_critical() {
    let levels = vector[100u64, 15, 80];
    assert!(any_critical(levels) == true, 0);
}

#[test]
fun test_no_critical() {
    let safe = vector[100u64, 50, 80];
    assert!(any_critical(safe) == false, 0);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fleet_stats\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fleet_stats;' },
        { test: (code: string) => /fun\s+total_fuel\s*\(/.test(code), errorMsg: 'Write a function called total_fuel.' },
        { test: (code: string) => /fun\s+any_critical\s*\(/.test(code), errorMsg: 'Write a function called any_critical.' },
        { test: (code: string) => /fold\s*!/.test(code), errorMsg: 'Use fold! to sum the values.' },
        { test: (code: string) => /any\s*!/.test(code), errorMsg: 'Use any! to check for critical levels.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::fleet_stats::test_total
[ PASS ] frontier::fleet_stats::test_total_empty
[ PASS ] frontier::fleet_stats::test_critical
[ PASS ] frontier::fleet_stats::test_no_critical
Test result: OK. Total tests: 4; passed: 4; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 6.1 — Summary',
      content: `- **\`macro fun\`** defines a function expanded at compile time — not called like normal functions
- Parameters use \`$\` prefix: \`$x\`, \`$T\`
- Called with \`!\`: \`my_macro!(args)\`
- **Lambdas** are inline functions passed to macros: \`|x| x + 1\`
- Lambda types: \`|u64| -> u64\`, \`|&u64| -> bool\`, etc.
- Lambdas can **capture** variables from surrounding scope
- Macros are **hygienic** — no variable name clashes
- \`return\` in a macro exits the macro body, not the caller
- Standard library macros replace manual loops:
  - \`fold!\` — reduce to a single value
  - \`map!\` — transform each element
  - \`any!\` / \`all!\` — test elements
  - \`filter!\` — keep matching elements
  - \`do!\` / \`do_ref!\` — iterate with side effects`,
    },
  ],
};
export default lesson;
