import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '5.4',
  title: 'Index Syntax',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Custom Index Access',
      content: `You've used \`v[0]\` to access vector elements since module 3. That's **index syntax** — and it's not limited to vectors. Move lets you define \`[]\` access for your own types using the \`#[syntax(index)]\` attribute.

Here's how vector's index syntax works under the hood:

\`\`\`move
module frontier::example;

fun demo() {
    let mut v = vector[10, 20, 30];

    v[0];          // sugar for *vector::borrow(&v, 0)
    &v[1];         // sugar for vector::borrow(&v, 1)
    &mut v[2];     // sugar for vector::borrow_mut(&mut v, 2)
    v[1] = 99;     // sugar for *vector::borrow_mut(&mut v, 1) = 99
}
\`\`\`

You can define this for your own types by writing two functions annotated with \`#[syntax(index)]\`:

\`\`\`move
module frontier::cargo_bay;

public struct CargoBay has drop {
    slots: vector<u64>,
}

#[syntax(index)]
public fun borrow(bay: &CargoBay, i: u64): &u64 {
    &bay.slots[i]
}

#[syntax(index)]
public fun borrow_mut(bay: &mut CargoBay, i: u64): &mut u64 {
    &mut bay.slots[i]
}
\`\`\`

Now users can write \`bay[0]\` and \`bay[2] = 500\` — just like vectors.

### Rules

- Must be defined in the **same module** as the type
- Must be \`public\`
- Need one **immutable** version (\`&Self\` → \`&T\`) and one **mutable** version (\`&mut Self\` → \`&mut T\`)
- Only **one pair** per type
- Both versions must have matching parameter types (except mutability)`,
    },
    {
      type: 'TASK',
      title: 'Crew Roster Index',
      content: `Define index syntax for a custom type.

For example:

\`\`\`move
#[syntax(index)]
public fun borrow(data: &MyType, i: u64): &u64 {
    &data.items[i]
}

#[syntax(index)]
public fun borrow_mut(data: &mut MyType, i: u64): &mut u64 {
    &mut data.items[i]
}
// Now data[0] and data[1] = 99 work!
\`\`\``,
      task: `The \`CrewRoster\` struct wraps a \`vector<u64>\` of crew IDs. Define the two \`#[syntax(index)]\` functions so that \`roster[i]\` works:

1. \`public fun borrow(roster: &CrewRoster, i: u64): &u64\`
2. \`public fun borrow_mut(roster: &mut CrewRoster, i: u64): &mut u64\``,
      hint: `\`\`\`move
#[syntax(index)]
public fun borrow(roster: &CrewRoster, i: u64): &u64 {
    &roster.members[i]
}

#[syntax(index)]
public fun borrow_mut(roster: &mut CrewRoster, i: u64): &mut u64 {
    &mut roster.members[i]
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::crew;

public struct CrewRoster has drop {
    members: vector<u64>,
}

public fun new(members: vector<u64>): CrewRoster {
    CrewRoster { members }
}

// Define #[syntax(index)] for immutable access
// public fun borrow(roster: &CrewRoster, i: u64): &u64


// Define #[syntax(index)] for mutable access
// public fun borrow_mut(roster: &mut CrewRoster, i: u64): &mut u64


#[test]
fun test_index_read() {
    let roster = new(vector[101, 202, 303]);
    assert!(roster[0] == 101, 0);
    assert!(roster[2] == 303, 1);
}

#[test]
fun test_index_write() {
    let mut roster = new(vector[101, 202, 303]);
    *(&mut roster[1]) = 999;
    assert!(roster[1] == 999, 0);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*crew\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::crew;' },
        { test: (code: string) => /#\[syntax\(index\)\]/.test(code), errorMsg: 'Add #[syntax(index)] before each function.' },
        { test: (code: string) => /public\s+fun\s+borrow\s*\(/.test(code), errorMsg: 'Write: public fun borrow(roster: &CrewRoster, i: u64): &u64' },
        { test: (code: string) => /public\s+fun\s+borrow_mut\s*\(/.test(code), errorMsg: 'Write: public fun borrow_mut(roster: &mut CrewRoster, i: u64): &mut u64' },
        { test: (code: string) => /&CrewRoster/.test(code) && /&mut\s+CrewRoster/.test(code), errorMsg: 'First param should be &CrewRoster (immutable) and &mut CrewRoster (mutable).' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::crew::test_index_read
[ PASS ] frontier::crew::test_index_write
Test result: OK. Total tests: 2; passed: 2; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Multi-Argument Index',
      content: `Index syntax isn't limited to a single index. You can pass **multiple arguments** — perfect for 2D structures like grids or maps.

\`\`\`move
module frontier::star_map;

public struct StarMap has drop {
    grid: vector<vector<u64>>,
}

#[syntax(index)]
public fun borrow(map: &StarMap, row: u64, col: u64): &u64 {
    &map.grid[row][col]
}

#[syntax(index)]
public fun borrow_mut(map: &mut StarMap, row: u64, col: u64): &mut u64 {
    &mut map.grid[row][col]
}
\`\`\`

Now \`map[2, 3]\` returns the value at row 2, column 3. This makes your code read naturally when working with grid-based data.

You can even mix index syntax with field access:

\`\`\`move
let sector_value = galaxy.sectors[i].planets[j];
\`\`\`

Index syntax is just **sugar** — the compiler translates \`map[i, j]\` into a call to the underlying \`borrow\` or \`borrow_mut\` function. No runtime cost, just cleaner code.`,
    },
    {
      type: 'TASK',
      title: 'Navigation Grid',
      content: `Build a 2D grid that supports index syntax.

For example — nested loops to build a 2×3 grid:

\`\`\`move
let mut grid = vector[];
let mut r = 0;
while (r < 2) {
    let mut row = vector[];
    let mut c = 0;
    while (c < 3) {
        row.push_back(0u64);
        c = c + 1;
    };
    grid.push_back(row);
    r = r + 1;
};
\`\`\``,
      task: `Write a \`public fun new(rows: u64, cols: u64): NavGrid\` function that creates a grid filled with zeros. The \`#[syntax(index)]\` functions are already written for you.

Use nested loops: for each row, create a vector of \`cols\` zeros, then push it into the grid.`,
      hint: `\`\`\`move
public fun new(rows: u64, cols: u64): NavGrid {
    let mut grid = vector[];
    let mut r = 0;
    while (r < rows) {
        let mut row = vector[];
        let mut c = 0;
        while (c < cols) {
            row.push_back(0);
            c = c + 1;
        };
        grid.push_back(row);
        r = r + 1;
    };
    NavGrid { grid }
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::nav_grid;

public struct NavGrid has drop {
    grid: vector<vector<u64>>,
}

#[syntax(index)]
public fun borrow(g: &NavGrid, row: u64, col: u64): &u64 {
    &g.grid[row][col]
}

#[syntax(index)]
public fun borrow_mut(g: &mut NavGrid, row: u64, col: u64): &mut u64 {
    &mut g.grid[row][col]
}

// Write public fun new(rows, cols) -> NavGrid
// Create a grid of rows x cols, all values 0


#[test]
fun test_grid() {
    let mut grid = new(3, 4);
    assert!(grid[0, 0] == 0, 0);
    assert!(grid[2, 3] == 0, 1);

    *(&mut grid[1, 2]) = 42;
    assert!(grid[1, 2] == 42, 2);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*nav_grid\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::nav_grid;' },
        { test: (code: string) => /public\s+fun\s+new\s*\(/.test(code), errorMsg: 'Write: public fun new(rows: u64, cols: u64): NavGrid' },
        { test: (code: string) => /NavGrid\s*\{/.test(code), errorMsg: 'Return a NavGrid { grid } at the end.' },
        { test: (code: string) => /while\s*\(/.test(code) || /for\s*\(/.test(code), errorMsg: 'Use loops to build the grid rows and columns.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::nav_grid::test_grid
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 5.4 — Summary',
      content: `- **Index syntax** lets you use \`[]\` on your own types — not just vectors
- Define it with \`#[syntax(index)]\` on \`borrow\` and \`borrow_mut\` functions
- Must be \`public\`, in the same module, with matching signatures
- \`v[i]\` reads, \`&v[i]\` borrows, \`&mut v[i]\` mutable borrows, \`v[i] = x\` writes
- Support multiple indices: \`grid[row, col]\` for 2D access
- Only one immutable and one mutable version per type
- It's pure sugar — compiles to the underlying function calls`,
    },
  ],
};
export default lesson;
