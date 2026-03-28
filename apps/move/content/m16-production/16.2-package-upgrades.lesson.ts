import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '16.2',
  title: 'Package Upgrades',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Upgrading Published Packages',
      content: `Unlike many blockchains where deployed code is immutable forever, Sui supports **package upgrades**. This is critical for real-world development — you need to fix bugs and add features.

### How upgrades work:
- An upgrade creates a **new package version** at a **new address**
- The original package version remains on-chain (old code is never deleted)
- Upgrades are controlled by an **\`UpgradeCap\`** — a special object created when you first publish

### Compatibility rules — you CANNOT change:
- Public function signatures (parameters, return types)
- Public struct layouts (field names, types, order)
- Module names

### You CAN change:
- Function **implementations** (fix bugs!)
- Add **new** functions, structs, and modules
- Change **private/internal** code freely

This means your public API is a contract with users — design it carefully from the start.`,
    },
    {
      type: 'LEARN',
      title: 'Versioning Pattern',
      content: `When you upgrade a package, the old version's code still exists. Shared objects created by the old version could be called through either the old or new package. The **versioning pattern** prevents stale calls:

\`\`\`move
module frontier::game;

const VERSION: u64 = 1;
const EWrongVersion: u64 = 0;

public struct GameState has key {
    id: UID,
    version: u64,
    // ... fields
}

public fun do_action(state: &mut GameState) {
    assert!(state.version == VERSION, EWrongVersion);
    // safe to proceed
}

// Called after upgrade to bump version
public fun migrate(state: &mut GameState, _cap: &AdminCap) {
    state.version = VERSION;  // now points to new package version
}
\`\`\`

### The upgrade flow:
1. Publish v2 of your package (VERSION = 2)
2. Call \`migrate()\` to update the shared object's version field
3. Now only v2's functions pass the version check
4. Old v1 functions fail with \`EWrongVersion\`

This protects users from accidentally calling outdated logic on shared state.`,
    },
    {
      type: 'TASK',
      title: 'Versioned Game Module',
      content: `Build a versioned module that protects shared state after an upgrade.

For example:

\`\`\`move
const VERSION: u64 = 2;
const EOutdated: u64 = 0;

fun update(config: &mut Config) {
    assert!(config.version == VERSION, EOutdated);
    config.value = config.value + 1;
}

fun upgrade(config: &mut Config, _cap: &AdminCap) {
    config.version = VERSION;
}
\`\`\``,
      task: `Complete the module for package version 2:

1. Set \`VERSION\` to \`2\`
2. \`play(state: &mut GameState)\` — asserts \`state.version == VERSION\` using EWrongVersion, then increments \`state.score\` by 1
3. \`migrate(state: &mut GameState, _cap: &AdminCap)\` — sets \`state.version\` to \`VERSION\``,
      hint: `\`\`\`move
const VERSION: u64 = 2;

fun play(state: &mut GameState) {
    assert!(state.version == VERSION, EWrongVersion);
    state.score = state.score + 1;
}

fun migrate(state: &mut GameState, _cap: &AdminCap) {
    state.version = VERSION;
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::versioned_game;

const EWrongVersion: u64 = 0;

// Set VERSION to 2 (we just upgraded from v1!)
const VERSION: u64 = 0; // fix this

public struct AdminCap has key {
    id: UID,
}

public struct GameState has key {
    id: UID,
    version: u64,
    score: u64,
}

// play: assert version matches, then increment score
public fun play(state: &mut GameState) {
    // assert version == VERSION using EWrongVersion
    // increment state.score by 1
}

// migrate: set state.version to VERSION (called after upgrade)
public fun migrate(state: &mut GameState, _cap: &AdminCap) {
    // set state.version = VERSION
}

#[test]
fun test_play_correct_version() {
    let mut state = GameState { id: object::new(&mut tx_context::dummy()), version: 2, score: 0 };
    play(&mut state);
    assert!(state.score == 1, 0);
    let GameState { id, version: _, score: _ } = state;
    id.delete();
}

#[test]
#[expected_failure(abort_code = 0)]
fun test_play_wrong_version() {
    let mut state = GameState { id: object::new(&mut tx_context::dummy()), version: 1, score: 0 };
    play(&mut state);  // should abort — version mismatch
    let GameState { id, version: _, score: _ } = state;
    id.delete();
}

#[test]
fun test_migrate() {
    let cap = AdminCap { id: object::new(&mut tx_context::dummy()) };
    let mut state = GameState { id: object::new(&mut tx_context::dummy()), version: 1, score: 5 };
    migrate(&mut state, &cap);
    assert!(state.version == 2, 0);
    assert!(state.score == 5, 1);  // score unchanged
    let GameState { id, version: _, score: _ } = state;
    id.delete();
    let AdminCap { id } = cap;
    id.delete();
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*versioned_game\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::versioned_game;' },
        { test: (code: string) => /const\s+VERSION\s*:\s*u64\s*=\s*2\s*;/.test(code), errorMsg: 'Set VERSION to 2.' },
        { test: (code: string) => /fun\s+play\s*\(/.test(code), errorMsg: 'Write a function called play.' },
        { test: (code: string) => /fun\s+migrate\s*\(/.test(code), errorMsg: 'Write a function called migrate.' },
        { test: (code: string) => /assert!\s*\(\s*state\.version\s*==\s*VERSION/.test(code), errorMsg: 'Assert that state.version == VERSION in play.' },
        { test: (code: string) => /state\.version\s*=\s*VERSION/.test(code), errorMsg: 'Set state.version = VERSION in migrate.' },
        { test: (code: string) => /state\.score\s*=\s*state\.score\s*\+\s*1/.test(code), errorMsg: 'Increment state.score by 1 in play.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::versioned_game::test_play_correct_version
[ PASS ] frontier::versioned_game::test_play_wrong_version
[ PASS ] frontier::versioned_game::test_migrate
Test result: OK. Total tests: 3; passed: 3; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 16.2 — Summary',
      content: `- **Sui supports package upgrades** — new version at a new address, controlled by \`UpgradeCap\`
- **Cannot change**: public function signatures, public struct layouts, module names
- **Can change**: implementations, add new functions/structs/modules, private code
- **Versioning pattern**: store a \`version\` field in shared objects, check it in every function
- **Migrate after upgrade**: call a \`migrate()\` function to bump the version, locking out old package code
- Design your public API carefully — it becomes a permanent contract`,
    },
  ],
};
export default lesson;
