import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '4.1',
  title: 'Abilities Deep Dive',
  time: '~30 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Copy vs Move',
      content: `In lesson 3.1, you gave your structs \`copy\` and \`drop\` abilities without thinking much about it. Now let's understand what happens **without** them — because that's where Move's real power lies.

### Without \`copy\`: values MOVE

When a struct doesn't have \`copy\`, assigning it to a new variable **moves** it. The original is gone:

\`\`\`move
module frontier::ownership;

public struct Ship has drop {
    fuel: u64,
}

fun example() {
    let ship = Ship { fuel: 100 };
    let other = ship;   // ship is MOVED into other
    // ship is no longer valid here — using it would be a compile error
}
\`\`\`

This is like handing someone a physical object — once you hand it over, you don't have it anymore. The language is literally named after this behaviour.

### With \`copy\`: values are duplicated

When a struct has \`copy\`, assignment creates a duplicate:

\`\`\`move
public struct Config has copy, drop {
    max_speed: u64,
}

fun example() {
    let cfg = Config { max_speed: 100 };
    let backup = cfg;   // cfg is COPIED — both are valid
    // cfg.max_speed is still 100
}
\`\`\`

You can also use the explicit \`copy\` keyword: \`let backup = copy cfg;\`

### Why this matters

Think about digital assets. A \`Coin\` struct representing real money should **not** be copyable — that would be counterfeiting. By leaving off \`copy\`, Move makes duplication a compile error, not a runtime bug.

**All builtin types** (\`u8\`, \`u64\`, \`bool\`, \`address\`) have \`copy\`. For a struct to have \`copy\`, **every field** must also have \`copy\`.`,
    },
    {
      type: 'TASK',
      title: 'Copy and Move',
      content: `Practice the difference between copying and moving.

For example:

\`\`\`move
// copy: use the copy keyword to duplicate
let a = Coords { x: 10, y: 20 };   // has copy ability
let b = copy a;   // a is still valid

// move: ownership transfers, original is gone
let plan = Plan { dest: 5 };   // no copy ability
let moved = plan;   // plan is now invalid
\`\`\``,
      task: `Two structs are defined: \`Coordinates\` (with \`copy, drop\`) and \`FlightPlan\` (with only \`drop\`).

Write two functions:

1. \`fun clone_coordinates(c: Coordinates): (Coordinates, Coordinates)\` — returns the original AND a copy (use \`copy c\`)
2. \`fun transfer_plan(plan: FlightPlan): FlightPlan\` — takes ownership and returns the plan (it moves, not copies)`,
      hint: `\`\`\`move
fun clone_coordinates(c: Coordinates): (Coordinates, Coordinates) {
    let backup = copy c;
    (c, backup)
}

fun transfer_plan(plan: FlightPlan): FlightPlan {
    plan
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::ownership;

public struct Coordinates has copy, drop {
    x: u64,
    y: u64,
}

public struct FlightPlan has drop {
    destination_x: u64,
    destination_y: u64,
}

// Write clone_coordinates(c: Coordinates): (Coordinates, Coordinates)
// Return BOTH the original and a copy


// Write transfer_plan(plan: FlightPlan): FlightPlan
// Take ownership of the plan and return it


#[test]
fun test_copy_and_move() {
    let coords = Coordinates { x: 10, y: 20 };
    let (a, b) = clone_coordinates(coords);
    assert!(a.x == 10 && b.x == 10, 0);

    let plan = FlightPlan { destination_x: 50, destination_y: 60 };
    let received = transfer_plan(plan);
    // plan is now invalid — it was moved into transfer_plan
    assert!(received.destination_x == 50, 1);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*ownership\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::ownership;' },
        { test: (code: string) => /fun\s+clone_coordinates\s*\(/.test(code), errorMsg: 'Write a function called clone_coordinates.' },
        { test: (code: string) => /copy\s+\w/.test(code), errorMsg: 'Use the copy keyword to duplicate the Coordinates value.' },
        { test: (code: string) => /fun\s+transfer_plan\s*\(/.test(code), errorMsg: 'Write a function called transfer_plan.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::ownership::test_copy_and_move
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Drop and Destructuring',
      content: `### Without \`drop\`: values MUST be consumed

When a struct doesn't have \`drop\`, you **cannot** just let it go out of scope. The compiler forces you to explicitly handle it — either by destructuring it or passing it to a function that does.

\`\`\`move
module frontier::tokens;

// No drop — this value can never be silently discarded
public struct FuelToken {
    amount: u64,
}

// The ONLY way to get rid of a FuelToken
fun burn(token: FuelToken): u64 {
    let FuelToken { amount } = token;  // destructure to consume
    amount
}
\`\`\`

If you wrote \`let t = FuelToken { amount: 100 };\` and then never used \`t\`, the compiler would refuse to build your code. This is how Move prevents assets from being accidentally lost.

### With \`drop\`: values can be silently discarded

When a struct has \`drop\`, you can freely ignore it:

\`\`\`move
public struct LogEntry has drop {
    message: u64,
}

fun example() {
    let _log = LogEntry { message: 1 };
    // log goes out of scope — silently discarded, no error
}
\`\`\`

### Choosing abilities for your types

Here's a practical guide:

| Type of data | Abilities | Why |
|-------------|-----------|-----|
| Config/settings | \`copy, drop\` | Freely usable, no restrictions needed |
| Log/event data | \`drop\` (maybe \`copy\`) | Can discard, doesn't need protection |
| Valuable asset (coin, NFT) | None, or just \`store\` | Must be explicitly handled — can't copy or lose |
| Data inside an object | \`store\` (+ \`copy, drop\` as needed) | Required for anything inside a \`key\` struct |
| On-chain object | \`key\` | Is a Sui object (needs \`id: UID\` as first field) |`,
    },
    {
      type: 'TASK',
      title: 'Handle a Non-Droppable Value',
      content: `When a struct has no \`drop\`, you must explicitly destructure it.

For example:

\`\`\`move
public struct Token {
    amount: u64,
}

// The only way to consume a non-droppable value:
fun consume(t: Token): u64 {
    let Token { amount } = t;
    amount
}
\`\`\``,
      task: `The \`FuelCell\` struct has **no abilities** — it can't be copied or dropped.

Write two functions:

1. \`fun new_cell(energy: u64): FuelCell\` — creates a FuelCell
2. \`fun drain(cell: FuelCell): u64\` — destructures the FuelCell and returns the \`energy\` value

This is the only way to "get rid of" a FuelCell — you must take it apart explicitly.`,
      hint: `\`\`\`move
fun new_cell(energy: u64): FuelCell {
    FuelCell { energy }
}

fun drain(cell: FuelCell): u64 {
    let FuelCell { energy } = cell;
    energy
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fuel;

// No abilities — can't copy, can't drop
public struct FuelCell {
    energy: u64,
}

// Write new_cell(energy) -> FuelCell


// Write drain(cell: FuelCell) -> u64
// Destructure to extract the energy value


#[test]
fun test_fuel_cell() {
    let cell = new_cell(500);
    let energy = drain(cell);
    // cell is consumed — can't use it again
    assert!(energy == 500, 0);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fuel\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fuel;' },
        { test: (code: string) => /fun\s+new_cell\s*\(/.test(code), errorMsg: 'Write a function called new_cell.' },
        { test: (code: string) => /fun\s+drain\s*\(/.test(code), errorMsg: 'Write a function called drain.' },
        { test: (code: string) => /let\s+FuelCell\s*\{/.test(code), errorMsg: 'Destructure the FuelCell: let FuelCell { energy } = cell;' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::fuel::test_fuel_cell
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Store and Key — The Path to On-Chain',
      content: `The \`store\` and \`key\` abilities are what connect Move to the Sui blockchain. We'll work with them hands-on in later modules, but understanding them now will help you design better types.

### \`store\` — can live inside objects

A struct with \`store\` can be nested as a field inside an on-chain object. Without \`store\`, the compiler won't allow it.

\`\`\`move
// Has store — can be inside objects
public struct CrewMember has store, drop {
    rank: u64,
    name: vector<u8>,
}
\`\`\`

All primitive types (\`u64\`, \`bool\`, \`address\`, \`vector<u8>\`) already have \`store\`.

On Sui, \`store\` also controls **transferability**: a \`key + store\` object can be transferred by anyone. A \`key\`-only object can only be transferred by its defining module.

### \`key\` — is a Sui object

A struct with \`key\` is an **object** that lives on the blockchain with a unique ID.

\`\`\`move
public struct Starship has key {
    id: UID,            // REQUIRED as the first field
    name: vector<u8>,   // must have store (it does)
    crew: CrewMember,   // must have store (it does)
}
\`\`\`

Rules for \`key\`:
- First field **must** be \`id: UID\`
- All other fields **must** have \`store\`
- **Enums cannot have \`key\`** — only structs can be objects
- A \`key\` struct can never have \`copy\` or \`drop\` (because \`UID\` has neither — you can't duplicate or lose an on-chain object)

### The ability hierarchy

Think of it as layers:

\`\`\`
copy, drop  →  convenient data (configs, coordinates)
store       →  data that can live inside objects
key         →  the object itself (on-chain, unique ID)
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Choose the Right Abilities',
      content: `Design structs with appropriate abilities for each use case.

For example:

\`\`\`move
// Freely copyable/droppable — for temporary data
public struct Config has copy, drop { value: u64 }

// Storable in objects, copyable — for persistent data
public struct Label has store, copy, drop { name: vector<u8> }

// No abilities — must be explicitly consumed
public struct Key { level: u8 }
\`\`\``,
      task: `Define three structs:

1. \`ScanResult\` — temporary sensor data, freely copyable and discardable. Fields: \`signal: u64\`, \`range: u64\`. Give it \`copy, drop\`.
2. \`ShipLog\` — a log entry that needs to be stored inside objects but can also be copied and discarded. Fields: \`entry_id: u64\`, \`timestamp: u64\`. Give it \`store, copy, drop\`.
3. \`AccessKey\` — a valuable credential that must not be copied or accidentally lost. Field: \`level: u8\`. Give it **no abilities**.`,
      hint: `\`\`\`move
public struct ScanResult has copy, drop {
    signal: u64,
    range: u64,
}

public struct ShipLog has store, copy, drop {
    entry_id: u64,
    timestamp: u64,
}

public struct AccessKey {
    level: u8,
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::design;

// Define ScanResult with copy, drop
// Fields: signal: u64, range: u64


// Define ShipLog with store, copy, drop
// Fields: entry_id: u64, timestamp: u64


// Define AccessKey with NO abilities
// Field: level: u8


`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*design\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::design;' },
        { test: (code: string) => /public\s+struct\s+ScanResult\s+has\s+(?=.*\bcopy\b)(?=.*\bdrop\b)/.test(code), errorMsg: 'ScanResult needs: has copy, drop' },
        { test: (code: string) => /public\s+struct\s+ShipLog\s+has\s+(?=.*\bstore\b)(?=.*\bcopy\b)(?=.*\bdrop\b)/.test(code), errorMsg: 'ShipLog needs: has store, copy, drop' },
        { test: (code: string) => /public\s+struct\s+AccessKey\s*\{/.test(code) && !/AccessKey\s+has\s/.test(code), errorMsg: 'AccessKey should have NO abilities — just: public struct AccessKey { ... }' },
        { test: (code: string) => /signal\s*:\s*u64/.test(code), errorMsg: 'ScanResult needs field: signal: u64' },
        { test: (code: string) => /entry_id\s*:\s*u64/.test(code), errorMsg: 'ShipLog needs field: entry_id: u64' },
        { test: (code: string) => /level\s*:\s*u8/.test(code), errorMsg: 'AccessKey needs field: level: u8' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
Build Successful
✓ ScanResult — copy, drop (temporary data)
✓ ShipLog — store, copy, drop (storable data)
✓ AccessKey — no abilities (protected asset)`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 4.1 — Summary',
      content: `- **Without \`copy\`**: assignment **moves** the value — the original is gone
- **With \`copy\`**: assignment duplicates — both are valid. Use \`copy x\` for explicit copies
- **Without \`drop\`**: values **must** be explicitly destructured — can't be silently discarded
- **With \`drop\`**: values can go out of scope without handling
- **\`store\`**: allows a type to be a field inside an on-chain object. Also grants transferability on Sui
- **\`key\`**: makes a type an on-chain object. Requires \`id: UID\` first field, all fields must have \`store\`
- For a struct to have an ability, **all its fields** must also have that ability
- **Enums** can have \`copy\`, \`drop\`, \`store\` — but NOT \`key\`

| Use case | Abilities |
|----------|-----------|
| Temporary data | \`copy, drop\` |
| Storable data | \`store, copy, drop\` |
| Protected asset | None (or just \`store\`) |
| On-chain object | \`key\` (fields need \`store\`) |`,
    },
  ],
};
export default lesson;
