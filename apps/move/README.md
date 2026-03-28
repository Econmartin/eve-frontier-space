# Learn Move — Interactive Move on Sui Course

An interactive course for learning the Move programming language, built for the EVE Frontier community. Served at `/move`.

## What it is

Two sequential courses taught through a browser-based IDE:

| Course | Focus |
|--------|-------|
| **01 — Learn Move** | Language fundamentals: types, structs, abilities, generics, testing, best practices |
| **02 — Learn Move on Sui** | Move on Sui: objects, entry functions, design patterns, tokens, dynamic storage, production |

Each lesson is a mix of **LEARN** (reading), **TASK** (coding exercise), and **REVIEW** (summary) pages. Every task runs against the real Sui Move compiler compiled to WASM — no simulator shortcuts.

## Features

- **Real compiler** — Sui Move compiler runs in-browser via WASM (`@zktx.io/sui-move-builder`)
- **Interactive tasks** — write real Move code, instant pass/fail feedback
- **Progress saved** — stored in `localStorage`, pick up where you left off
- **On-chain completion** — finish a course and your name is inscribed on the Stillness chain permanently
- **Onboarding tour** — Driver.js walkthrough fires automatically on first visit to a task page (clears with `localStorage.removeItem('move-tour-v1')`)

## Development

```bash
# From repo root
npm install
npm run dev:move     # http://localhost:5174/move
```

## Content

Lessons live in `content/` as TypeScript files. See [`content/README.md`](content/README.md) for the full authoring guide.

```
content/
├── curriculum.ts            # Root — imports all modules in order
├── m1-getting-started/
│   ├── index.ts
│   └── 1.1-welcome.lesson.ts
├── m2-building-blocks/
│   └── ...
└── ...
```

`COURSE_1_MODULE_COUNT` in `curriculum.ts` is the boundary between Course 01 and Course 02.

## Updating the Sui compiler

The WASM compiler bundle lives in `public/vendor/`. To pull the latest:

```bash
npm run update-compiler
```

## Assets

Shared images and fonts come from `packages/assets/` (Vite `publicDir`). Add new images there, not in `public/`.

## Architecture

| Layer | Detail |
|-------|--------|
| Routing | React Router v7, `basename: /move` |
| State | `useCourse` context + `useReducer`, persisted to `localStorage` |
| Editor | CodeMirror 6 with a custom Move language definition |
| Compiler | WASM via `@zktx.io/sui-move-builder`, falls back to syntax-only simulator |
| Wallet | `@mysten/dapp-kit-react` + `@evefrontier/dapp-kit`, scoped to completion routes only |
| Styling | Tailwind CSS v4 |
