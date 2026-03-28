import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '16.1',
  title: 'Package Manifest & Dependencies',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Move.toml for Sui',
      content: `Sui packages use the same Move.toml format but with Sui-specific conventions:

\`\`\`toml
[package]
name = "frontier_game"
edition = "2024"
published-at = "0x123..."  # set after first publish

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/mainnet" }

[addresses]
frontier = "0x0"
\`\`\`

Key fields:
- **\`published-at\`**: the address where your package lives on-chain. You set this after your first publish so that upgrade tooling knows which on-chain package to target.
- **\`edition\`**: \`"2024"\` enables the latest Move language features (method syntax, positional fields, etc.).
- **\`addresses\`**: \`frontier = "0x0"\` is a placeholder — the Sui CLI replaces it with the real address at publish time.

Starting with **Sui 1.45**, framework dependencies are implicit. You no longer need to declare the \`Sui\` dependency manually — the CLI injects it automatically. Older projects still include it for compatibility.`,
    },
    {
      type: 'LEARN',
      title: 'Move Registry (MVR)',
      content: `**MVR** is a decentralized package registry for Move — think of it like npm for Move packages.

### What MVR provides:
- **Named packages**: publish your package under a human-readable name instead of just an address
- **Discoverability**: other developers can find and depend on your package by name
- **Version management**: track which on-chain address corresponds to which version
- **Cleaner dependencies**: instead of long git URLs, depend on a named package

### How it works:
1. You publish your package to Sui (getting an on-chain address)
2. You register that address under a name in MVR
3. Others add your package as a dependency by name

This makes the Move ecosystem more collaborative — frontier pilots can share reusable modules (token standards, game utilities, math libraries) without passing around raw addresses.`,
    },
    {
      type: 'TASK',
      title: 'Package Info Module',
      content: `Write functions that return information about your package manifest — a pattern useful for on-chain introspection.

For example:

\`\`\`move
public fun project_name(): vector<u8> {
    b"my_project"
}

public fun major_version(): u64 {
    1
}

public fun is_active(): bool {
    true
}
\`\`\``,
      task: `Complete the module so each function returns the correct value:

1. \`package_name(): vector<u8>\` — returns \`b"frontier_game"\`
2. \`package_edition(): u64\` — returns \`2024\`
3. \`is_published(): bool\` — returns \`true\` (the package is deployed)`,
      hint: `\`\`\`move
fun package_name(): vector<u8> {
    b"frontier_game"
}

fun package_edition(): u64 {
    2024
}

fun is_published(): bool {
    true
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::package_info;

// Return the package name as bytes
public fun package_name(): vector<u8> {
    // Return b"frontier_game"
}

// Return the edition year
public fun package_edition(): u64 {
    // Return 2024
}

// Return whether the package has been published
public fun is_published(): bool {
    // Return true
}

#[test]
fun test_package_name() {
    assert!(package_name() == b"frontier_game", 0);
}

#[test]
fun test_package_edition() {
    assert!(package_edition() == 2024, 0);
}

#[test]
fun test_is_published() {
    assert!(is_published() == true, 0);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*package_info\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::package_info;' },
        { test: (code: string) => /fun\s+package_name\s*\(/.test(code), errorMsg: 'Write a function called package_name.' },
        { test: (code: string) => /fun\s+package_edition\s*\(/.test(code), errorMsg: 'Write a function called package_edition.' },
        { test: (code: string) => /fun\s+is_published\s*\(/.test(code), errorMsg: 'Write a function called is_published.' },
        { test: (code: string) => /b"frontier_game"/.test(code), errorMsg: 'package_name should return b"frontier_game".' },
        { test: (code: string) => /2024/.test(code), errorMsg: 'package_edition should return 2024.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::package_info::test_package_name
[ PASS ] frontier::package_info::test_package_edition
[ PASS ] frontier::package_info::test_is_published
Test result: OK. Total tests: 3; passed: 3; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 16.1 — Summary',
      content: `- **Move.toml** is the package manifest — defines name, edition, dependencies, and addresses
- **\`published-at\`**: set after first publish to link the manifest to an on-chain address
- **Implicit framework deps**: Sui 1.45+ auto-injects the Sui framework dependency
- **MVR (Move Registry)**: a decentralized registry for sharing named Move packages — like npm for Move
- **\`addresses\`**: use \`"0x0"\` as a placeholder; the CLI substitutes the real address at publish time`,
    },
  ],
};
export default lesson;
