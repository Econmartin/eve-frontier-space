import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '7.3',
  title: 'Packages & Build Modes',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Move Packages',
      content: `Every Move project is organized as a **package** — a folder with a specific structure. You've been working inside one this whole time. Here's what a package looks like:

\`\`\`
my_frontier_game/
├── Move.toml        (required — the package manifest)
├── Move.lock        (generated — locks dependency versions)
├── sources/         (required — your Move code goes here)
├── tests/           (optional — test-only modules)
└── examples/        (optional — example code)
\`\`\`

The \`Move.toml\` file is the heart of your package. It tells the compiler your package's name, what it depends on, and what addresses to use:

\`\`\`toml
[package]
name = "frontier_game"
edition = "2024"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "...", rev = "framework/mainnet" }

[addresses]
frontier = "0x0"
\`\`\`

### Named addresses

Remember \`module frontier::ships\`? The \`frontier\` part is a **named address** — defined in Move.toml:

\`\`\`toml
[addresses]
frontier = "0x0"    # placeholder — replaced when published
admin = "0xCAFE"    # a fixed address
\`\`\`

You can use named addresses in code with \`@\`:
\`\`\`move
let my_package = @frontier;
let admin_addr = @admin;
\`\`\`

Setting an address to \`"0x0"\` means "assign the real address when publishing." Setting it to \`"_"\` means "let the importer decide."

### Dependencies

Your package can depend on other packages:
\`\`\`toml
[dependencies]
# From git
MoveStdlib = { git = "https://github.com/...", rev = "main" }

# Local path
MyLib = { local = "../my_lib" }
\`\`\`

The \`Move.lock\` file records exact versions so builds are reproducible. Don't edit it manually.`,
    },
    {
      type: 'TASK',
      title: 'Read a Manifest',
      content: `Given a Move.toml, answer questions about the package.`,
      task: `The starter code contains a module. Fill in the three functions based on what the Move.toml tells you (shown in the comments):

1. \`package_name(): vector<u8>\` — return the package name as bytes
2. \`named_address(): address\` — return the frontier address value
3. \`has_dependency(): bool\` — return true (this package has a dependency)`,
      hint: `\`\`\`move
fun package_name(): vector<u8> {
    b"frontier_game"
}

fun named_address(): address {
    @frontier
}

fun has_dependency(): bool {
    true
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::manifest_quiz;

// Imagine this is our Move.toml:
// [package]
// name = "frontier_game"
// edition = "2024"
//
// [dependencies]
// Sui = { git = "...", rev = "framework/mainnet" }
//
// [addresses]
// frontier = "0xFRONTIER"

// Return the package name as bytes
// Hint: b"frontier_game"
fun package_name(): vector<u8> {
    // your code here
    b""
}

// Return the frontier named address
fun named_address(): address {
    // your code here
    @0x0
}

// Does this package have dependencies?
fun has_dependency(): bool {
    // your code here
    false
}

#[test]
fun test_manifest() {
    assert!(package_name() == b"frontier_game", 0);
    assert!(named_address() == @frontier, 1);
    assert!(has_dependency() == true, 2);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*manifest_quiz\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::manifest_quiz;' },
        { test: (code: string) => /b"frontier_game"/.test(code), errorMsg: 'Return b"frontier_game" as the package name.' },
        { test: (code: string) => /@frontier/.test(code), errorMsg: 'Use @frontier to return the named address.' },
        { test: (code: string) => /true/.test(code), errorMsg: 'Return true for has_dependency — the package has a Sui dependency.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::manifest_quiz::test_manifest
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Build Modes',
      content: `Move has a **mode** system that controls which code gets included during compilation. You've been using it without knowing — \`#[test_only]\` is actually shorthand for \`#[mode(test)]\`.

\`\`\`move
// These are equivalent:
#[test_only]
fun helper() { /* ... */ }

#[mode(test)]
fun helper() { /* ... */ }
\`\`\`

Modes are compile-time switches:
- **Unannotated** code is always included
- **Annotated** code is only included when that mode is enabled
- Any build with a mode enabled is **not publishable** (can't go on-chain)

You can define custom modes for development tools:

\`\`\`move
#[mode(debug)]
fun log_state(msg: vector<u8>) {
    // only included when building with: sui move build --mode debug
}
\`\`\`

Build commands:
\`\`\`
sui move build              # normal build — no modes, publishable
sui move test               # enables test mode automatically
sui move build --mode debug # enables debug mode
\`\`\`

The \`[dev-dependencies]\` and \`[dev-addresses]\` sections in Move.toml only activate in dev/test mode:

\`\`\`toml
[dev-addresses]
frontier = "0xDEV"     # only used during testing
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Mode-Gated Code',
      content: `Write a \`#[test_only]\` helper function and use it in a test.`,
      task: `1. Write a \`#[test_only]\` function \`make_test_fleet(): vector<u64>\` that returns \`vector[100, 80, 60]\`
2. Write a \`#[test]\` function \`test_fleet_total\` that calls \`make_test_fleet()\`, sums the values in a loop, and asserts the sum is 240`,
      hint: `\`\`\`move
#[test_only]
fun make_test_fleet(): vector<u64> {
    vector[100, 80, 60]
}

#[test]
fun test_fleet_total() {
    let fleet = make_test_fleet();
    assert!(fleet_total(&fleet) == 240, 0);
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::fleet;

fun fleet_total(fuel_levels: &vector<u64>): u64 {
    let mut sum = 0;
    let mut i = 0;
    while (i < fuel_levels.length()) {
        sum = sum + fuel_levels[i];
        i = i + 1;
    };
    sum
}

// Write #[test_only] fun make_test_fleet() -> vector<u64>
// Returns vector[100, 80, 60]


// Write #[test] fun test_fleet_total
// Use make_test_fleet(), pass it to fleet_total, assert == 240


`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*fleet\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::fleet;' },
        { test: (code: string) => /#\[test_only\]/.test(code), errorMsg: 'Mark the helper function with #[test_only].' },
        { test: (code: string) => /fun\s+make_test_fleet/.test(code), errorMsg: 'Write a function called make_test_fleet.' },
        { test: (code: string) => /#\[test\]/.test(code), errorMsg: 'Add #[test] before the test function.' },
        { test: (code: string) => /fun\s+test_fleet_total/.test(code), errorMsg: 'Write a test called test_fleet_total.' },
        { test: (code: string) => /make_test_fleet\s*\(\s*\)/.test(code), errorMsg: 'Call make_test_fleet() in your test.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::fleet::test_fleet_total
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 7.3 — Summary',
      content: `- A Move package has \`Move.toml\` (manifest), \`sources/\`, and optional \`tests/\`
- \`Move.toml\` defines package name, dependencies, and named addresses
- Named addresses like \`frontier\` map to blockchain addresses
- \`Move.lock\` locks dependency versions for reproducible builds
- \`#[test_only]\` is shorthand for \`#[mode(test)]\`
- Custom modes: \`#[mode(debug)]\`, enabled with \`--mode debug\`
- Mode-enabled builds are not publishable
- \`[dev-dependencies]\` and \`[dev-addresses]\` are test/dev mode only`,
    },
  ],
};
export default lesson;
