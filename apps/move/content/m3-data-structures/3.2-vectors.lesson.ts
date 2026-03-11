import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '3.2',
  title: 'Vectors',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Dynamic Lists with vector',
      content: `\`vector<T>\` is Move's built-in dynamic array type. It can hold any number of elements of type \`T\`.

### Creating Vectors

\`\`\`move
// Literal syntax (Move 2024)
let nums = vector[1u64, 2, 3];

// Empty vector
let mut v: vector<u64> = vector[];
\`\`\`

### Common Operations (method syntax)

\`\`\`move
v.push_back(4);          // append element
let len = v.length();    // number of elements
let first = v[0];        // index (read)
let last = v.pop_back(); // remove last
v.is_empty();            // bool
\`\`\`

### Byte strings

The type \`vector<u8>\` is used for byte strings. You can write them as \`b"hello"\`:

\`\`\`move
let name: vector<u8> = b"Falcon";
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Return a Vector',
      content: `Practice creating a vector literal and returning it from a function.`,
      task: `In module \`lists::demo\`, write a \`public fun\` named \`make_crew\` that returns \`vector<u64>\` containing the values \`1\`, \`2\`, and \`3\`.`,
      hint: `\`public fun make_crew(): vector<u64> { vector[1, 2, 3] }\``,
      bonus: null,
      starterCode: `module lists::demo;

// Write: public fun make_crew(): vector<u64>
// Return a vector containing 1, 2, 3

`,
      checks: [
        { test: code => /public\s+fun\s+make_crew\s*\(\s*\)\s*:\s*vector\s*<\s*u64\s*>/.test(code), errorMsg: 'Write: public fun make_crew(): vector<u64> { ... }' },
        { test: code => /vector\s*\[|vector::/.test(code), errorMsg: 'Create a vector — try: vector[1, 2, 3]' },
      ],
      successOutput: `$ sui move build
   Compiling lists v0.0.1
Build Successful
✓ lists::demo::make_crew compiled
  Returns: vector[1u64, 2u64, 3u64]`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 3.2 — Summary',
      content: `- \`vector<T>\` is Move's resizable array type
- Create with literal syntax: \`vector[1, 2, 3]\`
- Add elements: \`v.push_back(item)\`
- Read length: \`v.length()\`
- Index access: \`v[i]\`
- Byte strings are \`vector<u8>\`, written as \`b"text"\``,
    },
  ],
};
export default lesson;
