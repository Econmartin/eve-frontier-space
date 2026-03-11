import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '4.1',
  title: 'Abilities',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Understanding Abilities',
      content: `**Abilities** are Move's system for controlling what operations are allowed on a type. Every struct type can declare which abilities it has using the \`has\` keyword.

\`\`\`move
public struct Config has copy, drop {
    max_speed: u64,
    difficulty: u8,
}
\`\`\`

### The Four Abilities

- \`copy\` — values of this type can be **duplicated**
- \`drop\` — values can be **discarded** at end of scope
- \`store\` — values can be **stored** inside other structs or global storage
- \`key\` — values can be **Sui objects** stored in global storage (requires \`id: UID\` as first field)

### Why this matters

Without \`drop\`, a value *must* be explicitly consumed — you can't just let it go out of scope. This is how Move prevents assets (like coins) from being accidentally destroyed.

Without \`copy\`, a value can only be in one place at a time — like a physical object.`,
    },
    {
      type: 'TASK',
      title: 'Declare Abilities',
      content: `Give a configuration struct the right abilities so it can be freely used in functions without worrying about explicit cleanup.`,
      task: `In module \`abilities::demo\`, define a \`public struct\` named \`Config\` with fields \`max_speed: u64\` and \`difficulty: u8\`, and give it the \`copy\` and \`drop\` abilities.`,
      hint: `\`public struct Config has copy, drop { max_speed: u64, difficulty: u8 }\``,
      bonus: null,
      starterCode: `module abilities::demo;\n\n// Define struct Config with copy and drop abilities\n// Fields: max_speed: u64, difficulty: u8\n\n`,
      checks: [
        { test: code => /public\s+struct\s+Config/.test(code), errorMsg: 'Write: public struct Config has copy, drop { ... }' },
        { test: code => /has\s+(?:copy\s*,\s*drop|drop\s*,\s*copy)/.test(code), errorMsg: 'Add abilities: has copy, drop' },
        { test: code => /max_speed\s*:\s*u64/.test(code), errorMsg: 'Add field: max_speed: u64' },
        { test: code => /difficulty\s*:\s*u8/.test(code), errorMsg: 'Add field: difficulty: u8' },
      ],
      successOutput: `$ sui move build\n   Compiling abilities v0.0.1\nBuild Successful\n✓ abilities::demo::Config compiled\n  Abilities: copy, drop\n  Config can be duplicated and freely discarded.`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 4.1 — Summary',
      content: `- Abilities control what operations are allowed on a type
- \`copy\` — the value can be duplicated
- \`drop\` — the value can be discarded at end of scope
- \`store\` — the value can be stored inside other structs
- \`key\` — the value is a Sui object (needs \`id: UID\` first field)
- Without abilities, values must be explicitly consumed — preventing accidental asset loss`,
    },
  ],
};
export default lesson;
