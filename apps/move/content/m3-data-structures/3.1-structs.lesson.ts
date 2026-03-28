import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '3.1',
  title: 'Structs',
  time: '~30 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Grouping Data with Structs',
      content: `So far you've worked with single values — a \`u64\` for fuel, a \`bool\` for status. But a ship isn't just one number. It has fuel, shields, a hull rating, maybe a crew count. You need a way to **group related values into a single type**.

That's what a **struct** does. It bundles named fields together under one name:

\`\`\`move
module frontier::ships;

public struct Ship has drop {
    fuel: u64,
    shields: u64,
    hull: u64,
}
\`\`\`

Let's break this down:

- \`public struct\` — declares a new type visible to other modules
- \`Ship\` — the name (must start with an **uppercase letter**)
- \`has drop\` — an **ability** (more on this in a moment)
- The fields inside \`{ }\` each have a name and a type

### What is \`has drop\`?

By default, Move structs have **no abilities** — they can't be copied, they can't be silently discarded, and they can't be stored. This is a safety feature. Imagine a struct representing a valuable token — you wouldn't want code to accidentally throw it away.

For now, we'll use two abilities:

| Ability | What it allows |
|---------|---------------|
| \`drop\` | The value can be discarded (thrown away) when it goes out of scope |
| \`copy\` | The value can be duplicated with \`copy\` or by reading it multiple times |

Without \`drop\`, the compiler forces you to explicitly handle every struct value — you can't just let it disappear. We'll add \`drop\` to our learning structs so they're easy to work with. Later, when we build real on-chain objects, we'll see why restricting abilities is powerful.

\`\`\`move
// Can be dropped and copied — convenient for data
public struct Config has copy, drop {
    max_speed: u64,
    fuel_capacity: u64,
}

// Can only be dropped — not copyable
public struct Ship has drop {
    fuel: u64,
    shields: u64,
}
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Define a Struct',
      content: `Define your first struct to model a pilot's profile.

For example:

\`\`\`move
public struct Config has copy, drop {
    speed: u64,
    power: u64,
}
\`\`\``,
      task: `Define a \`public struct\` named \`Pilot\` with the abilities \`copy\` and \`drop\`, and two fields: \`rank: u64\` and \`missions: u64\`.`,
      hint: `\`\`\`move
public struct Pilot has copy, drop {
    rank: u64,
    missions: u64,
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::roster;

// Define a public struct called Pilot
// Abilities: copy, drop
// Fields: rank (u64), missions (u64)

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*roster\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::roster;' },
        { test: (code: string) => /public\s+struct\s+Pilot\s+has\s+(?=.*\bcopy\b)(?=.*\bdrop\b)/.test(code), errorMsg: 'Write: public struct Pilot has copy, drop { ... }' },
        { test: (code: string) => /rank\s*:\s*u64/.test(code), errorMsg: 'Add field: rank: u64' },
        { test: (code: string) => /missions\s*:\s*u64/.test(code), errorMsg: 'Add field: missions: u64' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
Build Successful
✓ frontier::roster::Pilot compiled
  Pilot { rank: u64, missions: u64 }`,
    },
    {
      type: 'LEARN',
      title: 'Creating, Accessing & Destructuring',
      content: `### Creating a struct (packing)

To create a struct value, use the struct name followed by field values in curly braces:

\`\`\`move
module frontier::roster;

public struct Pilot has copy, drop {
    rank: u64,
    missions: u64,
}

fun new_recruit(): Pilot {
    Pilot { rank: 1, missions: 0 }
}
\`\`\`

Field order doesn't matter — \`Pilot { missions: 0, rank: 1 }\` works too.

If a local variable has the same name as a field, you can use a shorthand called **punning**:

\`\`\`move
fun create_pilot(rank: u64, missions: u64): Pilot {
    Pilot { rank, missions }  // short for rank: rank, missions: missions
}
\`\`\`

### Accessing fields (dot notation)

Read a field with the dot operator. Notice the \`&\` before \`Pilot\` — this is a **reference**, meaning the function borrows the value to read it without consuming it. We'll cover references in depth later; for now, just know that \`&T\` means "read-only access to a T":

\`\`\`move
fun is_veteran(pilot: &Pilot): bool {
    pilot.missions > 100
}
\`\`\`

### Mutating fields

To change a field, the variable must be \`let mut\`, and you assign with dot notation:

\`\`\`move
fun complete_mission(pilot: &mut Pilot) {
    pilot.missions = pilot.missions + 1;
}
\`\`\`

### Destructuring (unpacking)

You can pull a struct apart into separate variables:

\`\`\`move
fun pilot_summary(pilot: Pilot): u64 {
    let Pilot { rank, missions } = pilot;
    rank * 100 + missions
}
\`\`\`

Use \`_\` to ignore fields you don't need:

\`\`\`move
let Pilot { rank: _, missions } = pilot;
// only 'missions' is bound
\`\`\`

**Important:** Only the module that defines a struct can create, destructure, or directly access its fields. Other modules must use public functions. This is how Move enforces **encapsulation** — the defining module controls the rules.`,
    },
    {
      type: 'TASK',
      title: 'Build a Ship',
      content: `Practice creating structs, reading fields, and writing a constructor.

For example:

\`\`\`move
fun new_config(speed: u64, power: u64): Config {
    Config { speed, power }   // field punning
}

fun is_fast(cfg: &Config): bool {
    cfg.speed > 50   // dot notation
}
\`\`\``,
      task: `The \`Ship\` struct is already defined. Write two functions:

1. \`fun new_ship(fuel: u64, shields: u64): Ship\` — creates and returns a Ship (use field punning)
2. \`fun is_combat_ready(ship: &Ship): bool\` — returns \`true\` if \`fuel > 0\` AND \`shields > 50\``,
      hint: `\`\`\`move
fun new_ship(fuel: u64, shields: u64): Ship {
    Ship { fuel, shields }
}

fun is_combat_ready(ship: &Ship): bool {
    ship.fuel > 0 && ship.shields > 50
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fleet;

public struct Ship has copy, drop {
    fuel: u64,
    shields: u64,
}

// Write new_ship(fuel, shields) -> Ship

// Write is_combat_ready(&Ship) -> bool

#[test]
fun test_ship() {
    let ship = new_ship(100, 80);
    assert!(is_combat_ready(&ship) == true, 0);

    let damaged = new_ship(50, 20);
    assert!(is_combat_ready(&damaged) == false, 1);

    let empty = new_ship(0, 100);
    assert!(is_combat_ready(&empty) == false, 2);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fleet\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fleet;' },
        { test: (code: string) => /fun\s+new_ship\s*\(/.test(code), errorMsg: 'Write a function called new_ship.' },
        { test: (code: string) => /fun\s+is_combat_ready\s*\(/.test(code), errorMsg: 'Write a function called is_combat_ready.' },
        { test: (code: string) => /Ship\s*\{/.test(code), errorMsg: 'Create a Ship using: Ship { fuel, shields }' },
        { test: (code: string) => /\.\s*fuel/.test(code) && /\.\s*shields/.test(code), errorMsg: 'Access fields with dot notation: ship.fuel, ship.shields' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::fleet::test_ship
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Mutating & Encapsulation',
      content: `### Mutating through references

In the last task you read fields with \`&Ship\`. To **change** fields, pass a mutable reference \`&mut\`:

\`\`\`move
module frontier::fleet;

public struct Ship has copy, drop {
    fuel: u64,
    shields: u64,
}

fun refuel(ship: &mut Ship, amount: u64) {
    ship.fuel = ship.fuel + amount;
}

fun take_damage(ship: &mut Ship, damage: u64) {
    if (damage >= ship.shields) {
        ship.shields = 0;
    } else {
        ship.shields = ship.shields - damage;
    };
}
\`\`\`

You can also mutate a local variable directly if it's declared \`let mut\`:

\`\`\`move
let mut ship = Ship { fuel: 100, shields: 50 };
ship.fuel = 80;  // direct mutation
refuel(&mut ship, 20);  // mutation through a function
\`\`\`

### The constructor pattern

Move developers follow a convention: provide a \`public fun new(...)\` function as the official way to create a struct. This lets you set defaults and enforce rules:

\`\`\`move
public fun new(fuel: u64): Ship {
    Ship { fuel, shields: 100 }  // shields always start at 100
}
\`\`\`

Since only the defining module can pack a struct, \`new\` becomes the **only** way for other modules to create one. Pair it with public getter and setter functions to control exactly what outsiders can see and change.`,
    },
    {
      type: 'TASK',
      title: 'Shield Manager',
      content: `Practice mutating struct fields through references.

For example:

\`\`\`move
fun charge(reactor: &mut Reactor, amount: u64) {
    reactor.power = reactor.power + amount;
}

fun is_powered(reactor: &Reactor): bool {
    reactor.power > 0
}
\`\`\``,
      task: `Write three functions:

1. \`fun new_shield(strength: u64): Shield\` — creates a Shield with the given \`strength\` and \`active\` set to \`true\`
2. \`fun take_hit(shield: &mut Shield, damage: u64)\` — subtracts \`damage\` from \`strength\`. If \`damage >= strength\`, set \`strength\` to \`0\` and \`active\` to \`false\`
3. \`fun is_active(shield: &Shield): bool\` — returns the \`active\` field`,
      hint: `\`\`\`move
fun new_shield(strength: u64): Shield {
    Shield { strength, active: true }
}

fun take_hit(shield: &mut Shield, damage: u64) {
    if (damage >= shield.strength) {
        shield.strength = 0;
        shield.active = false;
    } else {
        shield.strength = shield.strength - damage;
    };
}

fun is_active(shield: &Shield): bool {
    shield.active
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::defense;

public struct Shield has copy, drop {
    strength: u64,
    active: bool,
}

// Write new_shield(strength) -> Shield
// active should start as true


// Write take_hit(&mut Shield, damage)
// If damage >= strength: set strength to 0 and active to false
// Otherwise: subtract damage from strength


// Write is_active(&Shield) -> bool


#[test]
fun test_shield() {
    let mut s = new_shield(100);
    assert!(is_active(&s) == true, 0);

    take_hit(&mut s, 30);
    assert!(s.strength == 70, 1);
    assert!(is_active(&s) == true, 2);

    take_hit(&mut s, 70);
    assert!(s.strength == 0, 3);
    assert!(is_active(&s) == false, 4);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*defense\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::defense;' },
        { test: (code: string) => /fun\s+new_shield\s*\(/.test(code), errorMsg: 'Write a function called new_shield.' },
        { test: (code: string) => /fun\s+take_hit\s*\(/.test(code), errorMsg: 'Write a function called take_hit.' },
        { test: (code: string) => /fun\s+is_active\s*\(/.test(code), errorMsg: 'Write a function called is_active.' },
        { test: (code: string) => /&\s*mut\s+Shield/.test(code), errorMsg: 'take_hit needs a mutable reference: &mut Shield' },
        { test: (code: string) => /if\s*\(/.test(code), errorMsg: 'Use if/else to check whether damage >= strength.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::defense::test_shield
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 3.1 — Summary',
      content: `- **Structs** group related fields into a named type: \`public struct Name has drop { field: Type }\`
- Struct names must start with an **uppercase letter**
- **Abilities** control what you can do with a struct:
  - \`drop\` — can be discarded
  - \`copy\` — can be duplicated
  - No abilities = the compiler forces you to handle every value explicitly
- **Create** with \`Name { field: value }\` — field punning works: \`Name { field }\`
- **Access** fields with dot notation: \`obj.field\`
- **Mutate** fields via \`&mut\` references or \`let mut\` variables
- **Destructure** with \`let Name { field1, field2 } = value;\`
- Only the **defining module** can pack, unpack, and access fields directly
- Convention: provide a \`public fun new(...)\` constructor + public getters/setters`,
    },
  ],
};
export default lesson;
