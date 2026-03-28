import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '8.2',
  title: 'Error Handling Patterns',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Beyond Basic Assert',
      content: `In lesson 4.3, you learned \`assert!\` and \`#[error]\` for descriptive messages. Now let's look at **patterns** that make error handling clean and maintainable across a whole project.

### Pattern 1: Validation functions that return bool

For conditions that callers might want to check before calling your function:

\`\`\`move
module frontier::docking;

const EDockFull: u64 = 0;
const EShipTooLarge: u64 = 1;

public fun can_dock(bay: &DockingBay, ship_size: u64): bool {
    bay.current < bay.capacity && ship_size <= bay.max_size
}

public fun dock(bay: &mut DockingBay, ship_size: u64) {
    assert!(bay.current < bay.capacity, EDockFull);
    assert!(ship_size <= bay.max_size, EShipTooLarge);
    bay.current = bay.current + 1;
}
\`\`\`

This lets callers either:
- Call \`dock()\` directly (aborts on failure)
- Check \`can_dock()\` first and handle the "no" case themselves

### Pattern 2: Use \`Option<T>\` for "might not exist"

When something genuinely might not be there, return \`Option<T>\` instead of aborting:

\`\`\`move
use std::option::{Self, Option};

public fun find_ship(fleet: &vector<u64>, target: u64): Option<u64> {
    let mut i = 0;
    while (i < fleet.length()) {
        if (fleet[i] == target) {
            return option::some(i)
        };
        i = i + 1;
    };
    option::none()
}
\`\`\`

### Pattern 3: Descriptive #[error] constants

Group errors at the top of the module and use byte-string messages:

\`\`\`move
#[error]
const EInsufficientFuel: vector<u8> = b"Not enough fuel to complete the jump";

#[error]
const ENavigationLocked: vector<u8> = b"Navigation system is locked during combat";
\`\`\`

These messages appear in transaction error output, making debugging much easier.`,
    },
    {
      type: 'TASK',
      title: 'Robust Fleet Manager',
      content: `Use good error patterns to build a fleet manager.

For example:

\`\`\`move
const EFull: u64 = 0;

fun add(items: &mut vector<u64>, item: u64, limit: u64) {
    assert!(items.length() < limit, EFull);
    items.push_back(item);
}
\`\`\``,
      task: `Write a fleet module that uses good error patterns:

1. Define error constants \`EFleetFull\` (value 0) and \`ENotFound\` (value 1)
2. Write \`add_ship(fleet: &mut vector<u64>, ship_id: u64, max_size: u64)\` — asserts fleet length < max_size using EFleetFull, then pushes
3. Write \`find_ship(fleet: &vector<u64>, ship_id: u64): Option<u64>\` — returns \`some(index)\` if found, \`none()\` if not`,
      hint: `\`\`\`move
const EFleetFull: u64 = 0;
const ENotFound: u64 = 1;

fun add_ship(fleet: &mut vector<u64>, ship_id: u64, max_size: u64) {
    assert!(fleet.length() < max_size, EFleetFull);
    fleet.push_back(ship_id);
}

fun find_ship(fleet: &vector<u64>, ship_id: u64): Option<u64> {
    let mut i = 0;
    while (i < fleet.length()) {
        if (fleet[i] == ship_id) {
            return option::some(i)
        };
        i = i + 1;
    };
    option::none()
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fleet_mgr;

use std::option::{Self, Option};

// Define error constants: EFleetFull (0), ENotFound (1)


// Write add_ship — assert fleet.length() < max_size, then push_back


// Write find_ship — return Option<u64> with the index, or none


#[test]
fun test_add_ship() {
    let mut fleet = vector<u64>[];
    add_ship(&mut fleet, 101, 3);
    add_ship(&mut fleet, 202, 3);
    assert!(fleet.length() == 2, 0);
}

#[test]
#[expected_failure(abort_code = 0)]
fun test_fleet_full() {
    let mut fleet = vector<u64>[];
    add_ship(&mut fleet, 101, 1);
    add_ship(&mut fleet, 202, 1);  // should abort — fleet is full
}

#[test]
fun test_find_ship() {
    let fleet = vector[101u64, 202, 303];
    let result = find_ship(&fleet, 202);
    assert!(result.is_some(), 0);
    assert!(*result.borrow() == 1, 1);  // index 1
}

#[test]
fun test_find_missing() {
    let fleet = vector[101u64, 202, 303];
    assert!(find_ship(&fleet, 999).is_none(), 0);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fleet_mgr\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fleet_mgr;' },
        { test: (code: string) => /const\s+EFleetFull/.test(code), errorMsg: 'Define the error constant EFleetFull.' },
        { test: (code: string) => /const\s+ENotFound/.test(code), errorMsg: 'Define the error constant ENotFound.' },
        { test: (code: string) => /fun\s+add_ship\s*\(/.test(code), errorMsg: 'Write a function called add_ship.' },
        { test: (code: string) => /fun\s+find_ship\s*\(/.test(code), errorMsg: 'Write a function called find_ship.' },
        { test: (code: string) => /Option\s*<\s*u64\s*>/.test(code), errorMsg: 'find_ship should return Option<u64>.' },
        { test: (code: string) => /option\s*::\s*some/.test(code), errorMsg: 'Use option::some(...) when the ship is found.' },
        { test: (code: string) => /option\s*::\s*none/.test(code), errorMsg: 'Use option::none() when the ship is not found.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::fleet_mgr::test_add_ship
[ PASS ] frontier::fleet_mgr::test_fleet_full
[ PASS ] frontier::fleet_mgr::test_find_ship
[ PASS ] frontier::fleet_mgr::test_find_missing
Test result: OK. Total tests: 4; passed: 4; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'When to Abort vs Return',
      content: `A common question: should my function abort or return an error? Here's a decision framework:

| Situation | Approach | Why |
|-----------|----------|-----|
| Programmer mistake (wrong args) | \`assert!\` / abort | Shouldn't happen — fail fast |
| User-facing input validation | \`assert!\` with descriptive \`#[error]\` | Transaction should fail clearly |
| "Might not exist" queries | Return \`Option<T>\` | Caller decides what to do |
| Permission checks | \`assert!\` | Unauthorized access should abort |
| Batch operations | Return bool, let caller decide | Partial success may be OK |

The key principle: **abort for violations, return for queries**.

Show the anti-pattern:

\`\`\`move
// BAD: aborting on a lookup miss forces callers into try-catch thinking
// (which Move doesn't even have!)
fun get_ship(fleet: &vector<u64>, id: u64): u64 {
    // ... abort if not found — gives caller no way to handle gracefully
}

// GOOD: return Option, let caller decide
fun find_ship(fleet: &vector<u64>, id: u64): Option<u64> {
    // ... return none if not found
}
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Defense in Depth',
      content: `Build a module with layered error handling — a check function and an asserting function that reuses it.

For example:

\`\`\`move
fun can_act(value: u64): bool {
    value >= 10
}

fun do_action(value: u64) {
    assert!(can_act(value), ENotEnough);
    // ... rest of the action
}
\`\`\``,
      task: `Build a module with layered error handling:

1. \`can_jump(fuel: u64, distance: u64): bool\` — returns true if fuel >= distance * 10
2. \`jump(fuel: u64, distance: u64): u64\` — asserts fuel is sufficient using EInsufficientFuel, returns remaining fuel`,
      hint: `\`\`\`move
fun can_jump(fuel: u64, distance: u64): bool {
    fuel >= distance * 10
}

fun jump(fuel: u64, distance: u64): u64 {
    assert!(can_jump(fuel, distance), EInsufficientFuel);
    fuel - (distance * 10)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::hyperspace;

const EInsufficientFuel: u64 = 0;

// Write can_jump(fuel, distance) -> bool
// True if fuel >= distance * 10


// Write jump(fuel, distance) -> u64
// Assert can_jump is true, return fuel - (distance * 10)


#[test]
fun test_can_jump() {
    assert!(can_jump(100, 5) == true, 0);   // 100 >= 50
    assert!(can_jump(30, 5) == false, 1);   // 30 < 50
}

#[test]
fun test_jump() {
    assert!(jump(100, 5) == 50, 0);  // 100 - 50
}

#[test]
#[expected_failure(abort_code = 0)]
fun test_jump_insufficient() {
    jump(30, 5);  // should abort
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*hyperspace\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::hyperspace;' },
        { test: (code: string) => /fun\s+can_jump\s*\(/.test(code), errorMsg: 'Write a function called can_jump.' },
        { test: (code: string) => /fun\s+jump\s*\(/.test(code), errorMsg: 'Write a function called jump.' },
        { test: (code: string) => /EInsufficientFuel/.test(code), errorMsg: 'Use the EInsufficientFuel error constant in your assert.' },
        { test: (code: string) => /can_jump\s*\(/.test(code) && /assert!/.test(code), errorMsg: 'Call can_jump inside jump to reuse the check (DRY pattern).' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::hyperspace::test_can_jump
[ PASS ] frontier::hyperspace::test_jump
[ PASS ] frontier::hyperspace::test_jump_insufficient
Test result: OK. Total tests: 3; passed: 3; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 8.2 — Summary',
      content: `- **Validation functions** (\`can_dock\`): return bool, let callers decide
- **\`Option<T>\`**: for "might not exist" — \`some(value)\` or \`none()\`
- **\`#[error]\` constants**: descriptive byte-string messages for debugging
- **Abort for violations** (wrong state, unauthorized), **return for queries** (lookups, checks)
- Reuse check functions inside asserting functions for DRY code
- Group error constants at the top of each module
- One unique error constant per failure scenario`,
    },
  ],
};
export default lesson;
