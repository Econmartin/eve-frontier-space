import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '3.2',
  title: 'Vectors',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Dynamic Lists with vector',
      content: `In lesson 2.2 you saw \`vector<T>\` listed as a built-in type. Now it's time to use it.

A \`vector\` is a **growable list** of values that all share the same type. Think of it as a cargo manifest — a list that can get longer or shorter as items are added or removed.

### Creating vectors

\`\`\`move
module frontier::cargo;

fun examples() {
    // Literal syntax — the easiest way
    let fuel_reserves = vector[100u64, 200, 150];

    // Empty vector (you must specify the type)
    let empty: vector<u64> = vector[];
}
\`\`\`

### Byte strings

The type \`vector<u8>\` is so common that Move gives it a shorthand — **byte string literals**:

\`\`\`move
let ship_name: vector<u8> = b"Falcon";
// Same as: vector[70u8, 97, 108, 99, 111, 110]
\`\`\`

You'll see \`b"..."\` used everywhere for names, labels, and identifiers.

### Reading elements

Use square brackets to index into a vector (indices start at \`0\`):

\`\`\`move
let first = fuel_reserves[0];   // 100
let second = fuel_reserves[1];  // 200
\`\`\`

Use \`.length()\` to get the number of elements and \`.is_empty()\` to check if it has none:

\`\`\`move
let count = fuel_reserves.length();  // 3
let empty = fuel_reserves.is_empty();  // false
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Fleet Roster',
      content: `Create a vector and return it from a function.`,
      task: `Write a \`fun fleet_ids(): vector<u64>\` that returns a vector containing the ship IDs \`101\`, \`102\`, and \`103\`.`,
      hint: `\`\`\`move
fun fleet_ids(): vector<u64> {
    vector[101, 102, 103]
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::registry;

// Write fleet_ids() -> vector<u64>
// Return a vector with ship IDs: 101, 102, 103


#[test]
fun test_fleet() {
    let ids = fleet_ids();
    assert!(ids.length() == 3, 0);
    assert!(ids[0] == 101, 1);
    assert!(ids[1] == 102, 2);
    assert!(ids[2] == 103, 3);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*registry\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::registry;' },
        { test: (code: string) => /fun\s+fleet_ids\s*\(\s*\)\s*:\s*vector\s*<\s*u64\s*>/.test(code), errorMsg: 'Write: fun fleet_ids(): vector<u64> { ... }' },
        { test: (code: string) => /vector\s*\[/.test(code), errorMsg: 'Create a vector literal: vector[101, 102, 103]' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::registry::test_fleet
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Building & Modifying Vectors',
      content: `Vectors are mutable — you can add, remove, and change elements. The variable must be \`let mut\` (just like mutable integers from lesson 2.3).

### Adding and removing elements

\`\`\`move
module frontier::cargo;

fun load_cargo() {
    let mut manifest = vector<u64>[];

    manifest.push_back(50);   // [50]
    manifest.push_back(75);   // [50, 75]
    manifest.push_back(30);   // [50, 75, 30]

    let last = manifest.pop_back();  // removes and returns 30
    // manifest is now [50, 75]
}
\`\`\`

- \`push_back(value)\` — adds to the **end**
- \`pop_back()\` — removes and returns the **last** element (aborts if empty!)

### Iterating with a while loop

You already know \`while\` loops from lesson 2.5. Combine them with \`.length()\` and index access to walk through a vector:

\`\`\`move
fun total_cargo(manifest: &vector<u64>): u64 {
    let mut total = 0;
    let mut i = 0;
    while (i < manifest.length()) {
        total = total + manifest[i];
        i = i + 1;
    };
    total
}
\`\`\`

This pattern — counter + while + index — is the standard way to iterate a vector in Move.

### Modifying elements in place

You can write to a specific index using \`&mut\` access:

\`\`\`move
fun double_first(v: &mut vector<u64>) {
    v[0] = v[0] * 2;
}
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Fuel Calculator',
      content: `Build a vector with \`push_back\`, then iterate it to compute a total.`,
      task: `Write two functions:

1. \`fun build_reserves(): vector<u64>\` — start with an empty \`mut\` vector, push the values \`40\`, \`60\`, and \`100\`, then return it
2. \`fun total_fuel(reserves: &vector<u64>): u64\` — iterate the vector with a \`while\` loop and return the sum of all elements`,
      hint: `\`\`\`move
fun build_reserves(): vector<u64> {
    let mut v = vector[];
    v.push_back(40);
    v.push_back(60);
    v.push_back(100);
    v
}

fun total_fuel(reserves: &vector<u64>): u64 {
    let mut total = 0;
    let mut i = 0;
    while (i < reserves.length()) {
        total = total + reserves[i];
        i = i + 1;
    };
    total
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::supplies;

// Write build_reserves() -> vector<u64>
// Start empty, push_back 40, 60, 100


// Write total_fuel(&vector<u64>) -> u64
// Iterate with a while loop and sum all elements


#[test]
fun test_reserves() {
    let reserves = build_reserves();
    assert!(reserves.length() == 3, 0);
    assert!(reserves[0] == 40, 1);
    assert!(total_fuel(&reserves) == 200, 2);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*supplies\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::supplies;' },
        { test: (code: string) => /fun\s+build_reserves\s*\(\s*\)\s*:\s*vector\s*<\s*u64\s*>/.test(code), errorMsg: 'Write: fun build_reserves(): vector<u64> { ... }' },
        { test: (code: string) => /push_back\s*\(/.test(code), errorMsg: 'Use push_back to add elements to the vector.' },
        { test: (code: string) => /fun\s+total_fuel\s*\(/.test(code), errorMsg: 'Write a function called total_fuel.' },
        { test: (code: string) => /while\s*\(/.test(code), errorMsg: 'Use a while loop to iterate over the vector.' },
        { test: (code: string) => /\.length\s*\(\s*\)/.test(code), errorMsg: 'Use .length() to get the size of the vector.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::supplies::test_reserves
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 3.2 — Summary',
      content: `- \`vector<T>\` is Move's growable list type — all elements must be the same type
- Create with literal syntax: \`vector[1, 2, 3]\` or empty: \`vector[]\`
- Byte strings are \`vector<u8>\`, written as \`b"text"\`
- Index access: \`v[0]\`, \`v[1]\` (starts at 0)
- \`v.length()\` — number of elements
- \`v.is_empty()\` — true if no elements
- \`v.push_back(item)\` — add to end (requires \`mut\`)
- \`v.pop_back()\` — remove and return last element (aborts if empty)
- **Iterate** with: \`let mut i = 0; while (i < v.length()) { ... i = i + 1; };\``,
    },
  ],
};
export default lesson;
