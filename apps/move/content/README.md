# Course content (chapters & lessons)

Lessons are organized by **chapter folders**. Each chapter is one module in the sidebar (e.g. "Getting Started", "The Building Blocks").

## Folder structure

```
content/
├── curriculum.ts          # Lists all chapters (edit to add/remove/reorder chapters)
├── m1-getting-started/
│   ├── index.ts           # Chapter meta + list of lessons (order = display order)
│   └── 1.1-welcome.lesson.ts
├── m2-building-blocks/
│   ├── index.ts
│   ├── 2.1-functions.lesson.ts
│   ├── 2.2-data-types.lesson.ts
│   └── ...
└── ...
```

## Content format

Lesson content is written in **Markdown** (not HTML). The `content`, `task`, `hint`, and `bonus` fields all use Markdown strings rendered by `react-markdown`.

```typescript
import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '2.1',
  title: 'Functions',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Defining Functions',
      content: `Functions are the core building block...

### Visibility Modifiers

- \`fun\` — private to the module
- \`public fun\` — callable from any other module

\`\`\`move
public fun add(a: u64, b: u64): u64 {
    a + b
}
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Write a Function',
      content: `Write a function that takes two \`u64\` values...`,
      task: `In module \`math::ops\`, write a \`public fun\` named \`add\`...`,
      hint: `\`public fun add(a: u64, b: u64): u64 { a + b }\``,
      bonus: null,
      starterCode: `module math::ops;\n\n// Your code here\n`,
      checks: [
        { test: code => /public\\s+fun\\s+add/.test(code), errorMsg: '...' },
      ],
      successOutput: `$ sui move build\nBuild Successful`,
    },
  ],
};
export default lesson;
```

## Page types

- **LEARN** — instructional content (Markdown only)
- **TASK** — coding exercise with editor, checks, and terminal output
- **REVIEW** — summary page (Markdown only)

## Adding a new lesson

1. Create `X.Y-slug.lesson.ts` in the chapter folder
2. Import `type { Lesson }` from `../../src/lib/types`
3. Export a default `Lesson` object with pages
4. Add the import to the chapter's `index.ts` lessons array

## Adding a new chapter

1. Create a new folder `mN-chapter-name/`
2. Add `index.ts` with `Module` type and lesson imports
3. Add the import to `curriculum.ts`
