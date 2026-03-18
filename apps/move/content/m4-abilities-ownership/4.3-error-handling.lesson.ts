import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '4.3',
  title: 'Error Handling',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Errors as Safety Guards',
      content: `In lesson 2.5, you learned the basics: \`abort\` stops execution and \`assert!\` is a shorthand for "abort if this condition is false." Now let's go deeper — how do you write error handling that's **clear, testable, and maintainable**?

### Quick recap

\`\`\`move
module frontier::docking;

const ENoFuel: u64 = 0;
const EDockFull: u64 = 1;

fun request_dock(fuel: u64, bays_available: u64) {
    assert!(fuel > 0, ENoFuel);
    assert!(bays_available > 0, EDockFull);
}
\`\`\`

Key principles:
- \`abort\` reverts the **entire transaction** — there are no partial changes
- There is **no catch/try** in Move — if something aborts, it's game over for that transaction
- Use \`const E...\` for every error, never raw numbers

### One error constant per scenario

This is critical for debugging. If your module uses the same error code for two different problems, you can't tell them apart:

\`\`\`move
// BAD: same code for different problems
assert!(fuel > 0, 1);
assert!(crew > 0, 1);  // which assert failed?

// GOOD: unique code per check
const ENoFuel: u64 = 0;
const ENoCrew: u64 = 1;
assert!(fuel > 0, ENoFuel);
assert!(crew > 0, ENoCrew);  // immediately clear
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Guard a Function',
      content: `Protect a docking function with proper error handling.`,
      task: `Define three error constants and write a function:

1. \`const ENoFuel: u64 = 0;\`
2. \`const EOverweight: u64 = 1;\`
3. \`const ENoPilot: u64 = 2;\`
4. \`fun validate_landing(fuel: u64, cargo: u64, has_pilot: bool)\` — asserts:
   - \`fuel > 0\` (using \`ENoFuel\`)
   - \`cargo <= 500\` (using \`EOverweight\`)
   - \`has_pilot == true\` (using \`ENoPilot\`)`,
      hint: `\`\`\`move
const ENoFuel: u64 = 0;
const EOverweight: u64 = 1;
const ENoPilot: u64 = 2;

fun validate_landing(fuel: u64, cargo: u64, has_pilot: bool) {
    assert!(fuel > 0, ENoFuel);
    assert!(cargo <= 500, EOverweight);
    assert!(has_pilot == true, ENoPilot);
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::landing;

// Define error constants: ENoFuel (0), EOverweight (1), ENoPilot (2)


// Write validate_landing(fuel, cargo, has_pilot)
// Assert all three conditions with the right error codes


#[test]
fun test_valid_landing() {
    validate_landing(100, 200, true);  // should not abort
}

#[test]
#[expected_failure(abort_code = 0)]
fun test_no_fuel() {
    validate_landing(0, 200, true);
}

#[test]
#[expected_failure(abort_code = 1)]
fun test_overweight() {
    validate_landing(100, 600, true);
}

#[test]
#[expected_failure(abort_code = 2)]
fun test_no_pilot() {
    validate_landing(100, 200, false);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*landing\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::landing;' },
        { test: (code: string) => /const\s+ENoFuel\s*:\s*u64\s*=\s*0/.test(code), errorMsg: 'Add: const ENoFuel: u64 = 0;' },
        { test: (code: string) => /const\s+EOverweight\s*:\s*u64\s*=\s*1/.test(code), errorMsg: 'Add: const EOverweight: u64 = 1;' },
        { test: (code: string) => /const\s+ENoPilot\s*:\s*u64\s*=\s*2/.test(code), errorMsg: 'Add: const ENoPilot: u64 = 2;' },
        { test: (code: string) => /fun\s+validate_landing\s*\(/.test(code), errorMsg: 'Write a function called validate_landing.' },
        { test: (code: string) => (code.match(/assert!\s*\(/g) || []).length >= 3, errorMsg: 'Use three assert! calls — one per condition.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::landing::test_valid_landing
[ PASS ] frontier::landing::test_no_fuel
[ PASS ] frontier::landing::test_overweight
[ PASS ] frontier::landing::test_no_pilot
Test result: OK. Total tests: 4; passed: 4; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Descriptive Errors & Testing Aborts',
      content: `### The \`#[error]\` attribute (Move 2024)

Error codes are numbers — great for machines, not for humans. Move 2024 introduced the \`#[error]\` attribute, which lets you attach a descriptive message:

\`\`\`move
module frontier::auth;

#[error]
const ENotAuthorized: vector<u8> = b"Caller is not authorized to perform this action";

#[error]
const EExpiredSession: vector<u8> = b"Session has expired, please re-authenticate";

fun check_auth(authorized: bool) {
    assert!(authorized, ENotAuthorized);
}
\`\`\`

Notice the type changes from \`u64\` to \`vector<u8>\` (a byte string). When this assert fails, tools and explorers show the human-readable message instead of just a number. The compiler still generates a numeric code under the hood.

### Testing that errors fire correctly

You've seen \`#[expected_failure]\` in the test starters. Let's understand it:

\`\`\`move
#[test]
#[expected_failure(abort_code = ENotAuthorized)]
fun test_unauthorized() {
    check_auth(false);  // this SHOULD abort
    // test passes because abort was expected
}
\`\`\`

\`#[expected_failure(abort_code = ...)]\` tells the test runner: "this test should abort with this specific code. If it does, the test passes. If it doesn't abort, or aborts with a different code, the test fails."

You can use the constant name directly — no need to write the numeric value.

### Design tip: return \`bool\` for checks, assert in callers

When writing public functions that validate conditions, consider returning a boolean instead of asserting. This lets callers use their **own** error codes:

\`\`\`move
// Flexible — caller decides what to do
public fun has_enough_fuel(ship: &Ship, required: u64): bool {
    ship.fuel >= required
}

// Caller uses their own error
assert!(has_enough_fuel(&ship, 50), EInsufficientFuel);
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Descriptive Errors',
      content: `Use the \`#[error]\` attribute for human-readable error messages.`,
      task: `Write a fuel management module:

1. Define two \`#[error]\` constants:
   - \`EInsufficientFuel: vector<u8> = b"Not enough fuel for this operation"\`
   - \`EInvalidAmount: vector<u8> = b"Fuel amount must be greater than zero"\`
2. Write \`fun consume_fuel(tank: u64, amount: u64): u64\` that:
   - Asserts \`amount > 0\` using \`EInvalidAmount\`
   - Asserts \`tank >= amount\` using \`EInsufficientFuel\`
   - Returns \`tank - amount\``,
      hint: `\`\`\`move
#[error]
const EInsufficientFuel: vector<u8> = b"Not enough fuel for this operation";

#[error]
const EInvalidAmount: vector<u8> = b"Fuel amount must be greater than zero";

fun consume_fuel(tank: u64, amount: u64): u64 {
    assert!(amount > 0, EInvalidAmount);
    assert!(tank >= amount, EInsufficientFuel);
    tank - amount
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fuel_mgmt;

// Define #[error] constants:
// EInsufficientFuel: "Not enough fuel for this operation"
// EInvalidAmount: "Fuel amount must be greater than zero"


// Write consume_fuel(tank, amount) -> u64
// Assert amount > 0, assert tank >= amount, return tank - amount


#[test]
fun test_consume() {
    assert!(consume_fuel(100, 30) == 70, 0);
    assert!(consume_fuel(50, 50) == 0, 1);
}

#[test]
#[expected_failure]
fun test_insufficient() {
    consume_fuel(10, 50);  // should abort
}

#[test]
#[expected_failure]
fun test_zero_amount() {
    consume_fuel(100, 0);  // should abort
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fuel_mgmt\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fuel_mgmt;' },
        { test: (code: string) => /#\[error\]/.test(code), errorMsg: 'Use the #[error] attribute before your error constants.' },
        { test: (code: string) => /EInsufficientFuel\s*:\s*vector\s*<\s*u8\s*>/.test(code), errorMsg: 'Define: const EInsufficientFuel: vector<u8> = b"...";' },
        { test: (code: string) => /EInvalidAmount\s*:\s*vector\s*<\s*u8\s*>/.test(code), errorMsg: 'Define: const EInvalidAmount: vector<u8> = b"...";' },
        { test: (code: string) => /fun\s+consume_fuel\s*\(/.test(code), errorMsg: 'Write a function called consume_fuel.' },
        { test: (code: string) => (code.match(/assert!\s*\(/g) || []).length >= 2, errorMsg: 'Use at least two assert! calls for the validations.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::fuel_mgmt::test_consume
[ PASS ] frontier::fuel_mgmt::test_insufficient
[ PASS ] frontier::fuel_mgmt::test_zero_amount
Test result: OK. Total tests: 3; passed: 3; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 4.3 — Summary',
      content: `- \`abort code\` stops execution and **reverts all changes** — there is no catch/try
- \`assert!(condition, code)\` is shorthand for "abort if false"
- Use \`const E...: u64 = N;\` for every error — never raw numbers
- **One error constant per scenario** — unique codes make debugging easy
- **\`#[error]\` attribute** (Move 2024) adds human-readable messages: \`const EName: vector<u8> = b"message"\`
- **\`#[expected_failure(abort_code = E...)]\`** tests that a function aborts correctly
- Design tip: public check functions should return \`bool\`, letting callers choose their own error codes
- Transactions are **all-or-nothing** — any abort reverts everything`,
    },
  ],
};
export default lesson;
