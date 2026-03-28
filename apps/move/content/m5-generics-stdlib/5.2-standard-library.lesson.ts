import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '5.2',
  title: 'Imports & Standard Library',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Importing with use',
      content: `So far, all our code has lived in a single module. Real programs use types and functions from **other modules**. The \`use\` keyword imports them.

### Import a module

\`\`\`move
module frontier::navigation;

use std::string;  // import the string module

fun greeting(): string::String {
    string::utf8(b"Welcome aboard")
}
\`\`\`

After \`use std::string;\`, you can write \`string::utf8(...)\` instead of the full path \`std::string::utf8(...)\`.

### Import specific items

\`\`\`move
use std::string::String;         // import just the String type
use std::option::{Option, some, none};  // import multiple items
\`\`\`

### Import module + items with Self

\`\`\`move
use std::string::{Self, String};
// Now you can use both:
//   String        (the type)
//   string::utf8  (the function via module name)
\`\`\`

This is the most common pattern — import \`Self\` for module functions and named types together.

### What's auto-imported

In Sui Move, some modules are available without explicit \`use\`:
- \`std::vector\` — you've been using \`vector[]\` all along
- \`std::option\` — \`Option<T>\` and its functions

For everything else, add a \`use\` at the top of your module.`,
    },
    {
      type: 'TASK',
      title: 'Use Imports',
      content: `Practice importing and using the string module.

For example:

\`\`\`move
use std::string::{Self, String};

fun greeting(): String {
    string::utf8(b"Hello, pilot!")
}
\`\`\``,
      task: `The module already has \`use std::string::{Self, String};\` at the top.

Write a function \`fun ship_name(): String\` that returns the string \`"Nebula Runner"\` using \`string::utf8(b"Nebula Runner")\`.`,
      hint: `\`\`\`move
fun ship_name(): String {
    string::utf8(b"Nebula Runner")
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::registry;

use std::string::{Self, String};

// Write ship_name() -> String
// Return string::utf8(b"Nebula Runner")


#[test]
fun test_name() {
    let name = ship_name();
    assert!(name == string::utf8(b"Nebula Runner"), 0);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*registry\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::registry;' },
        { test: (code: string) => /fun\s+ship_name\s*\(\s*\)\s*:\s*String/.test(code), errorMsg: 'Write: fun ship_name(): String { ... }' },
        { test: (code: string) => /string\s*::\s*utf8/.test(code), errorMsg: 'Use string::utf8(b"...") to create a String.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::registry::test_name
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'LEARN',
      title: 'Option and String',
      content: `Two standard library types you'll use constantly:

### \`Option<T>\` — a value that might not exist

In many languages, \`null\` represents "no value." Move doesn't have null. Instead, it has \`Option<T>\` — a type that is either **some value** or **nothing**:

\`\`\`move
module frontier::scanner;

use std::option::{Self, Option};

fun find_target(id: u64): Option<u64> {
    if (id == 1) {
        option::some(42)     // found something
    } else {
        option::none()       // nothing found
    }
}
\`\`\`

Working with Options:

| Function | What it does |
|----------|-------------|
| \`option::some(value)\` | Wrap a value |
| \`option::none()\` | Empty (no value) |
| \`opt.is_some()\` | Returns \`true\` if it contains a value |
| \`opt.is_none()\` | Returns \`true\` if empty |
| \`opt.borrow()\` | Get \`&T\` — aborts if none |
| \`opt.extract()\` | Remove and return the value — aborts if none |

**Important:** \`option::none()\` needs a type annotation or inference context since the compiler can't guess the type from nothing:

\`\`\`move
let empty: Option<u64> = option::none();  // explicit type
\`\`\`

### \`String\` — UTF-8 text

\`String\` is a wrapper around \`vector<u8>\` that validates UTF-8 encoding:

\`\`\`move
use std::string::{Self, String};

let name: String = string::utf8(b"Falcon");
let also_works = b"Falcon".to_string();    // convenience method

let len = name.length();          // byte count (not characters)
let bytes: &vector<u8> = name.bytes();  // underlying bytes
\`\`\`

You can also concatenate strings:

\`\`\`move
let mut greeting = b"Hello, ".to_string();
greeting.append(b"pilot!".to_string());
// greeting is now "Hello, pilot!"
\`\`\`

**Gotcha:** \`length()\` returns **byte count**, not character count. ASCII characters are 1 byte each, but emoji or special characters can be 2-4 bytes.`,
    },
    {
      type: 'TASK',
      title: 'Optional Lookups',
      content: `Use \`Option\` to handle lookups that might fail.

For example:

\`\`\`move
use std::option::{Self, Option};

fun maybe_find(id: u64): Option<u64> {
    if (id == 42) {
        option::some(99)    // found: wrap the value
    } else {
        option::none()      // not found: empty
    }
}
\`\`\``,
      task: `Write a function \`fun find_rank(pilot_id: u64): Option<u64>\` that:
- Returns \`option::some(5)\` if \`pilot_id == 1\`
- Returns \`option::some(3)\` if \`pilot_id == 2\`
- Returns \`option::none()\` for any other ID`,
      hint: `\`\`\`move
fun find_rank(pilot_id: u64): Option<u64> {
    if (pilot_id == 1) {
        option::some(5)
    } else if (pilot_id == 2) {
        option::some(3)
    } else {
        option::none()
    }
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::crew;

use std::option::{Self, Option};

// Write find_rank(pilot_id: u64): Option<u64>
// id 1 -> some(5), id 2 -> some(3), anything else -> none


#[test]
fun test_find() {
    let r1 = find_rank(1);
    assert!(r1.is_some(), 0);
    assert!(*r1.borrow() == 5, 1);

    let r2 = find_rank(2);
    assert!(*r2.borrow() == 3, 2);

    let r3 = find_rank(99);
    assert!(r3.is_none(), 3);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*crew\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::crew;' },
        { test: (code: string) => /fun\s+find_rank\s*\(/.test(code), errorMsg: 'Write a function called find_rank.' },
        { test: (code: string) => /Option\s*<\s*u64\s*>/.test(code), errorMsg: 'Return type should be Option<u64>.' },
        { test: (code: string) => /option\s*::\s*some/.test(code), errorMsg: 'Use option::some(...) to wrap found values.' },
        { test: (code: string) => /option\s*::\s*none/.test(code), errorMsg: 'Use option::none() for the not-found case.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::crew::test_find
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 5.2 — Summary',
      content: `- \`use\` imports modules and types: \`use std::string::{Self, String};\`
- Import patterns: module (\`use std::string\`), items (\`use std::string::String\`), both (\`use std::string::{Self, String}\`)
- **\`Option<T>\`** represents a value that might not exist — safer than null
  - \`option::some(value)\` — wraps a value
  - \`option::none()\` — empty (needs type annotation)
  - \`.is_some()\`, \`.is_none()\` — check contents
  - \`.borrow()\` — get \`&T\` (aborts if none)
  - \`.extract()\` — remove and return value (aborts if none)
- **\`String\`** is UTF-8 text built on \`vector<u8>\`
  - Create with \`string::utf8(b"text")\` or \`b"text".to_string()\`
  - \`.length()\` returns **byte count**, not character count
  - \`.append(other)\` concatenates strings`,
    },
  ],
};
export default lesson;
