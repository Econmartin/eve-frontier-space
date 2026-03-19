import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '8.1',
  title: 'Coding Conventions',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Naming Conventions',
      content: `Move has strong naming conventions that the community follows. Using them makes your code immediately readable to other Move developers.

| Element | Convention | Example |
|---------|-----------|---------|
| Modules | \`snake_case\` | \`module frontier::fuel_system;\` |
| Functions | \`snake_case\` | \`fun calculate_damage()\` |
| Variables | \`snake_case\` | \`let fuel_level = 100;\` |
| Structs/Enums | \`PascalCase\` | \`public struct ShipConfig { }\` |
| Constants | \`ALL_CAPS\` | \`const MAX_FUEL: u64 = 1000;\` |
| Error constants | \`EPascalCase\` | \`const ENotAuthorized: u64 = 0;\` |
| Type parameters | Single uppercase | \`fun process<T>(x: T)\` |
| Getters | Named after field | \`public fun fuel(s: &Ship): u64\` |
| Mutable getters | Field + \`_mut\` | \`public fun fuel_mut(s: &mut Ship): &mut u64\` |

### Error constant naming

The \`E\` prefix is important — it immediately tells you (and tools) that this constant is an error code, not a regular value:

\`\`\`move
module frontier::auth;

// Error constants — E prefix, PascalCase
const ENotAuthorized: u64 = 0;
const ESessionExpired: u64 = 1;

// Regular constants — ALL_CAPS
const MAX_SESSIONS: u64 = 100;
const DEFAULT_TIMEOUT: u64 = 3600;
\`\`\``,
    },
    {
      type: 'LEARN',
      title: 'Code Organization',
      content: `### Use the modern module label syntax

Move 2024 introduced a cleaner module syntax without the extra indentation:

\`\`\`move
// Modern (preferred)
module frontier::ships;

public struct Ship has key, store { /* ... */ }
public fun new(): Ship { /* ... */ }

// Legacy (avoid in new code)
module frontier::ships {
    public struct Ship has key, store { /* ... */ }
    public fun new(): Ship { /* ... */ }
}
\`\`\`

### Struct organization

Group your struct definitions at the top, followed by constructors, then methods:

\`\`\`move
module frontier::hangar;

// 1. Struct definitions
public struct Hangar has drop {
    capacity: u64,
    ships: vector<u64>,
}

// 2. Constructors
public fun new(capacity: u64): Hangar {
    Hangar { capacity, ships: vector[] }
}

// 3. Public accessors (getters)
public fun capacity(h: &Hangar): u64 { h.capacity }
public fun ship_count(h: &Hangar): u64 { h.ships.length() }

// 4. Public mutators
public fun dock(h: &mut Hangar, ship_id: u64) {
    h.ships.push_back(ship_id);
}

// 5. Private helpers
fun is_full(h: &Hangar): bool {
    h.ships.length() >= h.capacity
}
\`\`\`

### Imports: group with Self

\`\`\`move
// Good — grouped
use std::option::{Self, Option};
use std::string::String;

// Avoid — redundant separate imports
use std::option;
use std::option::Option;
\`\`\`

### Doc comments

Use \`///\` for documentation comments. These are picked up by tooling:

\`\`\`move
/// A ship's fuel tank with capacity and current level.
public struct FuelTank has drop {
    capacity: u64,
    level: u64,
}

/// Creates a new fuel tank at full capacity.
public fun new(capacity: u64): FuelTank {
    FuelTank { capacity, level: capacity }
}
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Clean Up Code',
      content: `Fix all the naming convention violations in the starter code.`,
      task: `The starter code has several convention violations. Fix them all:

1. Rename the struct from \`ship_data\` to \`ShipData\` (PascalCase)
2. Rename the constant from \`MaxFuel\` to \`MAX_FUEL\` (ALL_CAPS)
3. Rename the error from \`NOT_FOUND\` to \`ENotFound\` (E prefix + PascalCase)
4. Rename the getter from \`get_fuel\` to \`fuel\` (no get_ prefix)`,
      hint: `\`\`\`move
const MAX_FUEL: u64 = 1000;
const ENotFound: u64 = 0;

public struct ShipData has drop {
    fuel: u64,
    name: vector<u8>,
}

public fun new(fuel: u64, name: vector<u8>): ShipData {
    assert!(fuel <= MAX_FUEL, ENotFound);
    ShipData { fuel, name }
}

public fun fuel(s: &ShipData): u64 {
    s.fuel
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::cleanup;

const MaxFuel: u64 = 1000;
const NOT_FOUND: u64 = 0;

public struct ship_data has drop {
    fuel: u64,
    name: vector<u8>,
}

public fun new(fuel: u64, name: vector<u8>): ship_data {
    assert!(fuel <= MaxFuel, NOT_FOUND);
    ship_data { fuel, name }
}

public fun get_fuel(s: &ship_data): u64 {
    s.fuel
}

#[test]
fun test_conventions() {
    let ship = new(500, b"Vanguard");
    assert!(fuel(&ship) == 500, 0);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*cleanup\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::cleanup;' },
        { test: (code: string) => /ShipData/.test(code), errorMsg: 'Rename the struct to ShipData (PascalCase).' },
        { test: (code: string) => /MAX_FUEL/.test(code), errorMsg: 'Rename the constant to MAX_FUEL (ALL_CAPS).' },
        { test: (code: string) => /ENotFound/.test(code), errorMsg: 'Rename the error constant to ENotFound (E prefix + PascalCase).' },
        { test: (code: string) => /fun\s+fuel\s*\(/.test(code), errorMsg: 'Rename get_fuel to fuel (no get_ prefix).' },
        { test: (code: string) => !/get_fuel/.test(code), errorMsg: 'Remove all references to get_fuel — rename it to just fuel.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::cleanup::test_conventions
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 8.1 — Summary',
      content: `- Modules, functions, variables: \`snake_case\`
- Structs and enums: \`PascalCase\`
- Regular constants: \`ALL_CAPS\`
- Error constants: \`EPascalCase\` (E prefix)
- Getters: named after the field, no \`get_\` prefix
- Use modern \`module name;\` syntax (no braces)
- Group code: structs -> constructors -> getters -> mutators -> helpers
- Use \`///\` doc comments for public APIs`,
    },
  ],
};
export default lesson;
