import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '3.3',
  title: 'Enums',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'One of Many: Enums',
      content: `A struct says "this value has ALL of these fields." An **enum** says "this value is exactly ONE of these variants."

Enums are perfect for things that can be in different states. A ship isn't simultaneously docked AND in hyperspace — it's one or the other.

\`\`\`move
module frontier::navigation;

public enum FlightPhase has copy, drop {
    Docked,
    InFlight,
    Hyperspace,
    Docking,
}
\`\`\`

Each option (\`Docked\`, \`InFlight\`, etc.) is called a **variant**. Variant names start with an uppercase letter.

### Variants can carry data

Variants aren't limited to simple labels. They can hold values:

\`\`\`move
public enum ShipCommand has copy, drop {
    Thrust(u64),             // carries a power level
    SetCourse { x: u64, y: u64 },  // carries named fields
    AllStop,                 // no data — just a signal
}
\`\`\`

Three styles:
- **Unit** variant: \`AllStop\` — no data, just a label
- **Tuple** variant: \`Thrust(u64)\` — positional data
- **Struct** variant: \`SetCourse { x: u64, y: u64 }\` — named fields

### Abilities

Enums support \`copy\`, \`drop\`, and \`store\` — but **NOT \`key\`**. Enums cannot be on-chain objects by themselves (they're always stored inside a struct that has \`key\`).

### Creating enum values

Use the enum name followed by \`::\` and the variant:

\`\`\`move
let phase = FlightPhase::Docked;
let cmd = ShipCommand::Thrust(80);
let nav = ShipCommand::SetCourse { x: 10, y: 20 };
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Define an Enum',
      content: `Model the different alert levels on a frontier station.

For example:

\`\`\`move
public enum Status has copy, drop {
    Online,
    Offline,
    Standby,
}

fun default_status(): Status {
    Status::Online
}
\`\`\``,
      task: `Define a \`public enum\` named \`AlertLevel\` with abilities \`copy\` and \`drop\`, and three variants: \`Green\`, \`Yellow\`, and \`Red\`.

Then write a function \`default_alert(): AlertLevel\` that returns \`AlertLevel::Green\`.`,
      hint: `\`\`\`move
public enum AlertLevel has copy, drop {
    Green,
    Yellow,
    Red,
}

fun default_alert(): AlertLevel {
    AlertLevel::Green
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::station;

// Define a public enum AlertLevel
// Abilities: copy, drop
// Variants: Green, Yellow, Red


// Write default_alert() -> AlertLevel
// Return AlertLevel::Green


#[test]
fun test_alert() {
    let alert = default_alert();
    assert!(alert == AlertLevel::Green, 0);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*station\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::station;' },
        { test: (code: string) => /public\s+enum\s+AlertLevel\s+has\s+(?=.*\bcopy\b)(?=.*\bdrop\b)/.test(code), errorMsg: 'Write: public enum AlertLevel has copy, drop { ... }' },
        { test: (code: string) => /\bGreen\b/.test(code), errorMsg: 'Add variant: Green' },
        { test: (code: string) => /\bYellow\b/.test(code), errorMsg: 'Add variant: Yellow' },
        { test: (code: string) => /\bRed\b/.test(code), errorMsg: 'Add variant: Red' },
        { test: (code: string) => /fun\s+default_alert\s*\(\s*\)\s*:\s*AlertLevel/.test(code), errorMsg: 'Write: fun default_alert(): AlertLevel { ... }' },
        { test: (code: string) => /AlertLevel\s*::\s*Green/.test(code), errorMsg: 'Return AlertLevel::Green' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::station::test_alert
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Match Expressions',
      content: `You've created enums — now you need to **act** on them. That's what \`match\` does. It inspects which variant a value is and runs different code for each one.

\`\`\`move
module frontier::navigation;

public enum FlightPhase has copy, drop {
    Docked,
    InFlight,
    Hyperspace,
}

fun fuel_burn_rate(phase: &FlightPhase): u64 {
    match (phase) {
        FlightPhase::Docked => 0,
        FlightPhase::InFlight => 10,
        FlightPhase::Hyperspace => 50,
    }
}
\`\`\`

Key rules:

1. **\`match\` is an expression** — it returns a value, so you can assign it: \`let rate = match (phase) { ... };\`
2. **Exhaustive** — you must handle **every** variant. If you forget one, the compiler will refuse to build. This prevents bugs where you add a new variant but forget to handle it somewhere.
3. **Wildcard \`_\`** — catches any variant you didn't list explicitly:

\`\`\`move
fun is_moving(phase: &FlightPhase): bool {
    match (phase) {
        FlightPhase::Docked => false,
        _ => true,  // InFlight and Hyperspace both match here
    }
}
\`\`\`

### Extracting data from variants

When a variant carries data, \`match\` lets you bind it to a variable:

\`\`\`move
public enum ShipCommand has copy, drop {
    Thrust(u64),
    SetCourse { x: u64, y: u64 },
    AllStop,
}

fun fuel_cost(cmd: &ShipCommand): u64 {
    match (cmd) {
        ShipCommand::Thrust(power) => *power * 2,
        ShipCommand::SetCourse { x, y } => *x + *y,
        ShipCommand::AllStop => 0,
    }
}
\`\`\`

When matching on a reference (\`&ShipCommand\`), the bound variables are also references. Use \`*\` to dereference them when you need the actual value (like for math).`,
    },
    {
      type: 'TASK',
      title: 'Weapon Selector',
      content: `Use \`match\` to return different values based on a weapon mode.

For example:

\`\`\`move
fun describe(s: &Status): u64 {
    match (s) {
        Status::Online => 1,
        Status::Offline => 0,
        Status::Standby => 2,
    }
}
\`\`\``,
      task: `The \`WeaponMode\` enum is defined for you. Write a function \`damage(mode: &WeaponMode): u64\` that uses \`match\` to return:
- \`Laser\` → \`25\`
- \`Missile\` → \`75\`
- \`Disabled\` → \`0\``,
      hint: `\`\`\`move
fun damage(mode: &WeaponMode): u64 {
    match (mode) {
        WeaponMode::Laser => 25,
        WeaponMode::Missile => 75,
        WeaponMode::Disabled => 0,
    }
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::weapons;

public enum WeaponMode has copy, drop {
    Laser,
    Missile,
    Disabled,
}

// Write damage(&WeaponMode) -> u64
// Laser: 25, Missile: 75, Disabled: 0


#[test]
fun test_damage() {
    assert!(damage(&WeaponMode::Laser) == 25, 0);
    assert!(damage(&WeaponMode::Missile) == 75, 1);
    assert!(damage(&WeaponMode::Disabled) == 0, 2);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*weapons\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::weapons;' },
        { test: (code: string) => /fun\s+damage\s*\(/.test(code), errorMsg: 'Write a function called damage.' },
        { test: (code: string) => /match\s*\(/.test(code), errorMsg: 'Use a match expression to handle each variant.' },
        { test: (code: string) => /WeaponMode\s*::\s*Laser/.test(code), errorMsg: 'Match on WeaponMode::Laser' },
        { test: (code: string) => /WeaponMode\s*::\s*Missile/.test(code), errorMsg: 'Match on WeaponMode::Missile' },
        { test: (code: string) => /WeaponMode\s*::\s*Disabled/.test(code) || /_\s*=>/.test(code), errorMsg: 'Handle WeaponMode::Disabled (or use _ wildcard)' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::weapons::test_damage
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 3.3 — Summary',
      content: `- **Enums** define a type that is exactly one of several variants: \`public enum Name has copy, drop { A, B, C }\`
- Three variant styles: **unit** (\`Stop\`), **tuple** (\`Thrust(u64)\`), **struct-like** (\`SetCourse { x: u64 }\`)
- Create values with \`EnumName::Variant\`
- Enums support \`copy\`, \`drop\`, \`store\` — but **NOT \`key\`**
- \`match\` inspects which variant a value is and runs the matching branch
- \`match\` is an **expression** — it returns a value
- \`match\` must be **exhaustive** — every variant must be handled (or use \`_\` wildcard)
- When matching on a reference, bound data is also a reference — use \`*\` to dereference`,
    },
  ],
};
export default lesson;
