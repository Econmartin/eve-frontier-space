import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '6.2',
  title: 'Testing Patterns',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Testing Structs & Modules',
      content: `Real-world testing means testing **whole modules** — constructors, getters, mutators, and their interactions. Here's a pattern you'll use constantly:

\`\`\`move
module frontier::reactor;

const EOverheat: u64 = 0;
const MAX_TEMP: u64 = 1000;

public struct Reactor has drop {
    power: u64,
    temperature: u64,
}

public fun new(power: u64): Reactor {
    Reactor { power, temperature: power * 2 }
}

public fun boost(r: &mut Reactor, amount: u64) {
    r.power = r.power + amount;
    r.temperature = r.temperature + amount * 3;
    assert!(r.temperature <= MAX_TEMP, EOverheat);
}

public fun power(r: &Reactor): u64 { r.power }
public fun temp(r: &Reactor): u64 { r.temperature }
\`\`\`

### Test the constructor

\`\`\`move
#[test]
fun test_new_reactor() {
    let r = new(50);
    assert!(r.power() == 50, 0);
    assert!(r.temp() == 100, 1);  // 50 * 2
}
\`\`\`

### Test mutations

\`\`\`move
#[test]
fun test_boost_increases_power() {
    let mut r = new(50);
    r.boost(20);
    assert!(r.power() == 70, 0);
}
\`\`\`

### Test error paths

\`\`\`move
#[test]
#[expected_failure(abort_code = EOverheat)]
fun test_boost_overheat() {
    let mut r = new(200);   // temp starts at 400
    r.boost(300);           // temp += 900 → 1300 > 1000
}
\`\`\`

Notice the pattern: **one concept per test**, with a descriptive name that says exactly what's being checked.`,
    },
    {
      type: 'TASK',
      title: 'Test a Module',
      content: `Write comprehensive tests for a cargo module.`,
      task: `The \`CargoHold\` module is written for you. Write four tests:

1. \`test_new_hold\` — a new hold with capacity 100 should have \`weight() == 0\` and \`space_left() == 100\`
2. \`test_load_cargo\` — load 40 into a hold with capacity 100, check \`weight() == 40\` and \`space_left() == 60\`
3. \`test_load_multiple\` — load 30 then 20, check \`weight() == 50\`
4. \`test_load_too_heavy\` — mark with \`#[expected_failure(abort_code = EOverweight)]\`, try to load 150 into a hold with capacity 100`,
      hint: `\`\`\`move
#[test]
fun test_new_hold() {
    let hold = new(100);
    assert!(hold.weight() == 0, 0);
    assert!(hold.space_left() == 100, 1);
}

#[test]
fun test_load_cargo() {
    let mut hold = new(100);
    hold.load(40);
    assert!(hold.weight() == 40, 0);
    assert!(hold.space_left() == 60, 1);
}

#[test]
fun test_load_multiple() {
    let mut hold = new(100);
    hold.load(30);
    hold.load(20);
    assert!(hold.weight() == 50, 0);
}

#[test]
#[expected_failure(abort_code = EOverweight)]
fun test_load_too_heavy() {
    let mut hold = new(100);
    hold.load(150);
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::cargo;

const EOverweight: u64 = 0;

public struct CargoHold has drop {
    capacity: u64,
    current_weight: u64,
}

public fun new(capacity: u64): CargoHold {
    CargoHold { capacity, current_weight: 0 }
}

public fun load(hold: &mut CargoHold, weight: u64) {
    assert!(hold.current_weight + weight <= hold.capacity, EOverweight);
    hold.current_weight = hold.current_weight + weight;
}

public fun weight(hold: &CargoHold): u64 { hold.current_weight }
public fun space_left(hold: &CargoHold): u64 { hold.capacity - hold.current_weight }

// Write test_new_hold — capacity 100, weight 0, space_left 100


// Write test_load_cargo — load 40, check weight and space_left


// Write test_load_multiple — load 30 then 20, check weight is 50


// Write test_load_too_heavy — #[expected_failure], load 150 into capacity 100

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*cargo\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::cargo;' },
        { test: (code: string) => /fun\s+test_new_hold/.test(code), errorMsg: 'Write a test called test_new_hold.' },
        { test: (code: string) => /fun\s+test_load_cargo/.test(code), errorMsg: 'Write a test called test_load_cargo.' },
        { test: (code: string) => /fun\s+test_load_multiple/.test(code), errorMsg: 'Write a test called test_load_multiple.' },
        { test: (code: string) => /fun\s+test_load_too_heavy/.test(code), errorMsg: 'Write a test called test_load_too_heavy.' },
        { test: (code: string) => /expected_failure/.test(code), errorMsg: 'Use #[expected_failure(abort_code = EOverweight)] for the overweight test.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::cargo::test_new_hold
[ PASS ] frontier::cargo::test_load_cargo
[ PASS ] frontier::cargo::test_load_multiple
[ PASS ] frontier::cargo::test_load_too_heavy
Test result: OK. Total tests: 4; passed: 4; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Edge Cases & Good Practices',
      content: `### Where bugs hide: edge cases

Most bugs don't appear with normal inputs. They show up at **boundaries**. Always ask: *"What's the weirdest input someone could pass?"*

| Edge case | Example |
|-----------|---------|
| Zero values | Withdraw 0 from a wallet — should it be allowed? |
| Maximum values | Fuel at max capacity — what happens if you refuel more? |
| Empty collections | Call \`highest_rank\` on an empty vector |
| Exact boundaries | Shields at exactly 0 — is the ship destroyed or alive? |
| Overflow | Absorb more damage than the shield has — does it underflow? |

### Name tests descriptively

Bad: \`test1\`, \`test2\`, \`test_it\`
Good: \`test_withdraw_reduces_balance\`, \`test_empty_tank_aborts\`, \`test_new_ship_has_full_shields\`

When a test fails, the name should tell you **what broke** without reading the code.

### Test categories

Cover these for every module:

| Category | What to test | Example |
|----------|-------------|---------|
| **Happy path** | Normal expected behavior | \`test_deposit_increases_balance\` |
| **Error cases** | Functions abort when they should | \`test_withdraw_from_empty_aborts\` |
| **Edge cases** | Zero values, max values, boundaries | \`test_withdraw_exact_balance\` |
| **Interactions** | Multiple operations in sequence | \`test_deposit_then_withdraw\` |

### One concept per test

Each test should check **one thing**. If it fails, you immediately know what's wrong:

\`\`\`move
// GOOD: focused
#[test]
fun test_deposit_increases_balance() {
    let mut w = new_wallet(100);
    deposit(&mut w, 50);
    assert!(w.balance == 150, 0);
}

// BAD: tests everything at once
#[test]
fun test_wallet() {
    let mut w = new_wallet(100);
    deposit(&mut w, 50);
    assert!(w.balance == 150, 0);
    withdraw(&mut w, 30);
    assert!(w.balance == 120, 1);
    // if this fails at assertion 1, was it deposit or withdraw?
}
\`\`\`

### Use \`#[test_only]\` helpers for setup

When multiple tests need the same setup, extract a factory function:

\`\`\`move
#[test_only]
fun test_wallet(): Wallet {
    let mut w = new_wallet(100);
    deposit(&mut w, 50);
    w  // wallet with balance 150
}
\`\`\`

\`#[test_only]\` works on functions, imports, and constants. All test-only code is **stripped** from the published bytecode — it never ends up on-chain.`,
    },
    {
      type: 'TASK',
      title: 'Comprehensive Testing',
      content: `Apply good testing practices to a shield module.`,
      task: `Write four tests using the \`test_shield\` helper:

1. \`test_new_shield_is_active\` — a new shield should be active and have full strength
2. \`test_hit_reduces_strength\` — hit for 30, strength should be 70
3. \`test_hit_deactivates_at_zero\` — hit for 100 (or more), shield should be inactive with 0 strength
4. \`test_repair_restores\` — hit for 50, then repair 30, strength should be 80`,
      hint: `\`\`\`move
#[test]
fun test_new_shield_is_active() {
    let s = test_shield();
    assert!(s.is_active() == true, 0);
    assert!(s.strength() == 100, 1);
}

#[test]
fun test_hit_reduces_strength() {
    let mut s = test_shield();
    s.hit(30);
    assert!(s.strength() == 70, 0);
}

#[test]
fun test_hit_deactivates_at_zero() {
    let mut s = test_shield();
    s.hit(100);
    assert!(s.is_active() == false, 0);
    assert!(s.strength() == 0, 1);
}

#[test]
fun test_repair_restores() {
    let mut s = test_shield();
    s.hit(50);
    s.repair(30);
    assert!(s.strength() == 80, 0);
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::shields;

public struct Shield has drop {
    strength: u64,
    active: bool,
}

public fun new(strength: u64): Shield {
    Shield { strength, active: true }
}

public fun hit(s: &mut Shield, damage: u64) {
    if (damage >= s.strength) {
        s.strength = 0;
        s.active = false;
    } else {
        s.strength = s.strength - damage;
    };
}

public fun repair(s: &mut Shield, amount: u64) {
    s.strength = s.strength + amount;
    if (s.strength > 0) { s.active = true; };
}

public fun strength(s: &Shield): u64 { s.strength }
public fun is_active(s: &Shield): bool { s.active }

#[test_only]
fun test_shield(): Shield {
    new(100)
}

// Write test_new_shield_is_active — active, strength 100


// Write test_hit_reduces_strength — hit 30, strength 70


// Write test_hit_deactivates_at_zero — hit 100, inactive, strength 0


// Write test_repair_restores — hit 50, repair 30, strength 80

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*shields\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::shields;' },
        { test: (code: string) => /fun\s+test_new_shield_is_active/.test(code), errorMsg: 'Write a test called test_new_shield_is_active.' },
        { test: (code: string) => /fun\s+test_hit_reduces_strength/.test(code), errorMsg: 'Write a test called test_hit_reduces_strength.' },
        { test: (code: string) => /fun\s+test_hit_deactivates_at_zero/.test(code), errorMsg: 'Write a test called test_hit_deactivates_at_zero.' },
        { test: (code: string) => /fun\s+test_repair_restores/.test(code), errorMsg: 'Write a test called test_repair_restores.' },
        { test: (code: string) => /test_shield\s*\(\s*\)/.test(code), errorMsg: 'Use the test_shield() helper to create shields in your tests.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::shields::test_new_shield_is_active
[ PASS ] frontier::shields::test_hit_reduces_strength
[ PASS ] frontier::shields::test_hit_deactivates_at_zero
[ PASS ] frontier::shields::test_repair_restores
Test result: OK. Total tests: 4; passed: 4; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 6.2 — Summary',
      content: `- Test **whole modules**: constructors, getters, mutators, and their interactions
- Cover four categories: **happy path**, **error cases**, **edge cases**, **interactions**
- **One concept per test** — when it fails, the name tells you what broke
- Name tests descriptively: \`test_withdraw_reduces_balance\` not \`test1\`
- Use \`#[test_only]\` helpers for shared test setup
- Test-only code is stripped from published bytecode — zero on-chain cost`,
    },
  ],
};
export default lesson;
