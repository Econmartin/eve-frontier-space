import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '6.2',
  title: 'Type Reflection',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Runtime Type Inspection',
      content: `Move is strongly typed — the compiler knows every type at compile time. But sometimes you need to inspect types at **runtime**. The \`std::type_name\` module provides **type reflection** — a way to get the name of a type as a string.

\`\`\`move
module frontier::registry;

use std::type_name;
use std::ascii::String;

public struct Ship has drop {}
public struct Station has drop {}

fun get_name<T>(): String {
    type_name::get<T>().into_string()
}
\`\`\`

\`type_name::get<T>()\` returns a \`TypeName\` struct. You can convert it to a string to see the full qualified name like \`"0x1::registry::Ship"\`.

### When is this useful?

- **Logging and debugging** — print what type you're working with
- **Registry patterns** — store type info as keys in collections
- **Generic factories** — make decisions based on type at runtime

### Available functions

| Function | Returns |
|----------|---------|
| \`type_name::get<T>()\` | \`TypeName\` for the type |
| \`.into_string()\` | ASCII string of the full type name |
| \`.get_address()\` | The package address as ASCII string |
| \`.get_module()\` | The module name as ASCII string |

### Comparing types

You can compare \`TypeName\` values directly with \`==\`:

\`\`\`move
fun same_type<T, U>(): bool {
    type_name::get<T>() == type_name::get<U>()
}
\`\`\`

This is a runtime check — the compiler doesn't resolve it at compile time.`,
    },
    {
      type: 'TASK',
      title: 'Type Logger',
      content: `Use type reflection to compare types at runtime.`,
      task: `Write a function \`is_same_type<T, U>(): bool\` that returns \`true\` if types \`T\` and \`U\` have the same type name.

Use \`type_name::get<T>()\` and compare the results with \`==\`.`,
      hint: `\`\`\`move
fun is_same_type<T, U>(): bool {
    type_name::get<T>() == type_name::get<U>()
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::type_check;

use std::type_name;

public struct Pilot has drop {}
public struct Copilot has drop {}

// Write is_same_type<T, U>() -> bool
// Compare the type names of T and U


#[test]
fun test_same_type() {
    assert!(is_same_type<Pilot, Pilot>() == true, 0);
}

#[test]
fun test_different_type() {
    assert!(is_same_type<Pilot, Copilot>() == false, 0);
}

#[test]
fun test_primitive_types() {
    assert!(is_same_type<u64, u64>() == true, 0);
    assert!(is_same_type<u64, u8>() == false, 1);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*type_check\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::type_check;' },
        { test: (code: string) => /fun\s+is_same_type\s*</.test(code), errorMsg: 'Write a generic function: fun is_same_type<T, U>(): bool' },
        { test: (code: string) => /type_name\s*::\s*get/.test(code), errorMsg: 'Use type_name::get<T>() to get the type name.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::type_check::test_same_type
[ PASS ] frontier::type_check::test_different_type
[ PASS ] frontier::type_check::test_primitive_types
Test result: OK. Total tests: 3; passed: 3; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 6.2 — Summary',
      content: `- **Type reflection** lets you inspect types at runtime using \`std::type_name\`
- \`type_name::get<T>()\` returns a \`TypeName\` struct
- Convert to string with \`.into_string()\` to see names like \`"0x1::module::Type"\`
- Extract parts with \`.get_address()\` and \`.get_module()\`
- Compare types with \`==\` on \`TypeName\` values
- Useful for logging, registries, and generic type inspection
- This is **runtime** inspection only — you can't branch on types at compile time`,
    },
  ],
};
export default lesson;
