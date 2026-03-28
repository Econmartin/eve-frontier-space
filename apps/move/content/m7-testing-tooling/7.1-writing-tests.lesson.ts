import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '7.1',
  title: 'Writing Tests',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'The Move Test Framework',
      content: `You've been seeing \`#[test]\` functions in every task since module 2. Now let's properly understand how Move's built-in test framework works.

### The basics

A test is any function annotated with \`#[test]\`. Tests take **no parameters** and return nothing:

\`\`\`move
module frontier::math;

fun add(a: u64, b: u64): u64 {
    a + b
}

#[test]
fun test_add() {
    assert!(add(2, 3) == 5, 0);
    assert!(add(0, 0) == 0, 1);
}
\`\`\`

Run tests with: \`sui move test\`

The output looks like:

\`\`\`
[ PASS ] frontier::math::test_add
Test result: OK. Total tests: 1; passed: 1; failed: 0
\`\`\`

### What \`assert!\` does in tests

You already know \`assert!(condition, error_code)\` from lesson 2.5. In tests, it serves as the **verification** — if the condition is false, the test fails with that error code. Use different error codes to identify which assertion failed:

\`\`\`move
#[test]
fun test_calculations() {
    assert!(add(1, 1) == 2, 0);   // assertion 0
    assert!(add(5, 5) == 10, 1);  // assertion 1
    assert!(add(0, 100) == 100, 2); // assertion 2
}
\`\`\`

### Filtering tests

You can run a subset of tests by name:

\`\`\`
sui move test add        # runs only tests with "add" in the name
sui move test test_      # runs all tests starting with "test_"
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Write Your Own Tests',
      content: `Write a function and thorough tests for it.

For example:

\`\`\`move
#[test]
fun test_my_function() {
    assert!(double(3) == 6, 0);   // assertion 0
    assert!(double(0) == 0, 1);   // assertion 1
}
\`\`\``,
      task: `The \`clamp\` function is written for you — it restricts a value to a range. Write three \`#[test]\` functions:

1. \`test_clamp_within_range\` — assert that \`clamp(50, 0, 100) == 50\`
2. \`test_clamp_below_min\` — assert that \`clamp(5, 10, 100) == 10\`
3. \`test_clamp_above_max\` — assert that \`clamp(200, 0, 100) == 100\``,
      hint: `\`\`\`move
#[test]
fun test_clamp_within_range() {
    assert!(clamp(50, 0, 100) == 50, 0);
}

#[test]
fun test_clamp_below_min() {
    assert!(clamp(5, 10, 100) == 10, 0);
}

#[test]
fun test_clamp_above_max() {
    assert!(clamp(200, 0, 100) == 100, 0);
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::math;

fun clamp(value: u64, min: u64, max: u64): u64 {
    if (value < min) {
        min
    } else if (value > max) {
        max
    } else {
        value
    }
}

// Write test_clamp_within_range — clamp(50, 0, 100) should be 50


// Write test_clamp_below_min — clamp(5, 10, 100) should be 10


// Write test_clamp_above_max — clamp(200, 0, 100) should be 100

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*math\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::math;' },
        { test: (code: string) => /#\[test\]/.test(code), errorMsg: 'Add #[test] before each test function.' },
        { test: (code: string) => /fun\s+test_clamp_within_range/.test(code), errorMsg: 'Write a test called test_clamp_within_range.' },
        { test: (code: string) => /fun\s+test_clamp_below_min/.test(code), errorMsg: 'Write a test called test_clamp_below_min.' },
        { test: (code: string) => /fun\s+test_clamp_above_max/.test(code), errorMsg: 'Write a test called test_clamp_above_max.' },
        { test: (code: string) => (code.match(/assert!\s*\(/g) || []).length >= 3, errorMsg: 'Each test needs at least one assert! call.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::math::test_clamp_within_range
[ PASS ] frontier::math::test_clamp_below_min
[ PASS ] frontier::math::test_clamp_above_max
Test result: OK. Total tests: 3; passed: 3; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Testing Errors & Test-Only Code',
      content: `### Testing that functions abort correctly

Use \`#[expected_failure]\` to verify a function aborts with the right error:

\`\`\`move
module frontier::fuel;

const EEmpty: u64 = 0;

fun consume(tank: u64, amount: u64): u64 {
    assert!(tank >= amount, EEmpty);
    tank - amount
}

#[test]
#[expected_failure(abort_code = EEmpty)]
fun test_consume_empty_tank() {
    consume(10, 50);  // should abort — not enough fuel
}
\`\`\`

The test **passes** because the function aborted with the expected code. If the function doesn't abort, or aborts with a different code, the test **fails**.

You can reference error constants by name — no need to write the numeric value.

### \`#[test_only]\` — test helpers

Sometimes you need helper functions or imports that only exist during testing. Mark them with \`#[test_only]\`:

\`\`\`move
#[test_only]
fun make_test_ship(): Ship {
    Ship { fuel: 100, shields: 50 }
}

#[test]
fun test_ship_is_ready() {
    let ship = make_test_ship();
    assert!(ship.fuel > 0, 0);
}
\`\`\`

\`#[test_only]\` works on functions, \`use\` imports, constants, and even entire modules. Test-only code is stripped from the published bytecode — it never ends up on-chain.

### Test functions can call \`entry\` functions

Tests have special privileges — they can call \`entry fun\` functions directly, which is important when you start testing Sui transactions later.`,
    },
    {
      type: 'TASK',
      title: 'Test Error Paths',
      content: `Write tests that verify both success and failure cases.

For example:

\`\`\`move
#[test]
fun test_success() {
    let mut w = Wallet { balance: 50 };
    withdraw(&mut w, 10);
    assert!(w.balance == 40, 0);
}

#[test]
#[expected_failure(abort_code = EInsufficientFunds)]
fun test_abort() {
    let mut w = Wallet { balance: 5 };
    withdraw(&mut w, 100);  // should abort
}
\`\`\``,
      task: `The \`withdraw\` function is written for you. Write:

1. \`test_withdraw_success\` — withdraw 30 from a wallet with 100, assert balance is 70
2. \`test_withdraw_exact\` — withdraw exactly 100 from 100, assert balance is 0
3. \`test_withdraw_insufficient\` — mark with \`#[expected_failure(abort_code = EInsufficientFunds)]\`, try to withdraw 200 from 100`,
      hint: `\`\`\`move
#[test]
fun test_withdraw_success() {
    let mut w = Wallet { balance: 100 };
    withdraw(&mut w, 30);
    assert!(w.balance == 70, 0);
}

#[test]
fun test_withdraw_exact() {
    let mut w = Wallet { balance: 100 };
    withdraw(&mut w, 100);
    assert!(w.balance == 0, 0);
}

#[test]
#[expected_failure(abort_code = EInsufficientFunds)]
fun test_withdraw_insufficient() {
    let mut w = Wallet { balance: 100 };
    withdraw(&mut w, 200);
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::wallet;

const EInsufficientFunds: u64 = 0;

public struct Wallet has drop {
    balance: u64,
}

public fun withdraw(w: &mut Wallet, amount: u64) {
    assert!(w.balance >= amount, EInsufficientFunds);
    w.balance = w.balance - amount;
}

// Write test_withdraw_success — withdraw 30 from 100, check balance is 70


// Write test_withdraw_exact — withdraw 100 from 100, check balance is 0


// Write test_withdraw_insufficient — should abort with EInsufficientFunds

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*wallet\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::wallet;' },
        { test: (code: string) => /fun\s+test_withdraw_success/.test(code), errorMsg: 'Write a test called test_withdraw_success.' },
        { test: (code: string) => /fun\s+test_withdraw_exact/.test(code), errorMsg: 'Write a test called test_withdraw_exact.' },
        { test: (code: string) => /fun\s+test_withdraw_insufficient/.test(code), errorMsg: 'Write a test called test_withdraw_insufficient.' },
        { test: (code: string) => /expected_failure/.test(code), errorMsg: 'Use #[expected_failure(abort_code = EInsufficientFunds)] for the insufficient test.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::wallet::test_withdraw_success
[ PASS ] frontier::wallet::test_withdraw_exact
[ PASS ] frontier::wallet::test_withdraw_insufficient
Test result: OK. Total tests: 3; passed: 3; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 7.1 — Summary',
      content: `- \`#[test]\` marks a function as a test — must take zero parameters
- \`assert!(condition, code)\` verifies behavior — different codes identify which check failed
- Run tests: \`sui move test\`, filter: \`sui move test <name>\`
- \`#[expected_failure(abort_code = EName)]\` — test passes when the function aborts with that code
- \`#[test_only]\` — marks code that only exists during testing (stripped from on-chain bytecode)
- Works on: functions, \`use\` imports, constants, modules
- Test functions can call \`entry fun\` directly`,
    },
  ],
};
export default lesson;
