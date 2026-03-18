import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '9.1',
  title: 'What Makes Sui Different',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Object-Centric Design',
      content: `Up until now, everything you've written has been pure Move — structs, abilities, generics, tests. That foundation carries forward. Now we layer on Sui's runtime, starting with its most fundamental idea: **objects**.

### Account-based vs object-centric

Traditional blockchains (like Ethereum) store data in account-based key-value stores. A "token balance" is just a number in a mapping under your address. There's no independent entity representing your assets.

Sui is different. Every piece of on-chain data is an **object** — an independent entity with its own identity and owner.

Think of it like EVE Frontier: your ship isn't a row in a database — it's a thing that *exists*. It has a hull, fuel, cargo. You can hand it to another pilot. You can dock it at a station. The ship is real.

### Six properties of every object

Every Sui object has:

| Property | What it is |
|----------|-----------|
| **Type** | The Move struct (e.g. \`Ship\`, \`FuelTank\`) |
| **Unique ID** | A globally unique \`UID\` — no two objects share one |
| **Owner** | An address, "shared", or "frozen" |
| **Data** | The struct's fields (fuel, shields, name…) |
| **Version** | Incremented on every mutation |
| **Digest** | A hash of the object's contents |

The ID never changes. The version and digest update automatically whenever the object is modified in a transaction.`,
    },
    {
      type: 'LEARN',
      title: 'Ownership & Performance',
      content: `### Three ownership types

Every object has exactly one ownership mode (we'll cover these in depth in lesson 9.3):

| Type | Think of it as… | Example |
|------|----------------|---------|
| **Owned** | Your personal ship — only you fly it | A pilot's fighter, a wallet |
| **Shared** | A space station — anyone can dock | A marketplace, a fleet registry |
| **Frozen** | A historical record — permanently read-only | Published rules, archived logs |

### Why ownership affects performance

Here's something unique to Sui: ownership isn't just about access control — it determines **how fast your transaction executes**.

**Fast Path** (owned & frozen objects):
- Sui knows exactly who owns the object
- No need to coordinate with other validators about ordering
- Transaction finality in ~400ms

**Consensus Path** (shared objects):
- Multiple users might touch the object simultaneously
- Validators must agree on ordering
- Still fast (~2s), but not instant

This means the way you design your objects — what's owned vs shared — directly impacts your app's performance. A ship that only one pilot uses? Make it owned. A space station everyone docks at? That needs to be shared.

### The mental model

\`\`\`
Owned object  →  fast path   →  near-instant
Shared object →  consensus   →  slightly slower
Frozen object →  fast path   →  near-instant (read-only)
\`\`\`

As you build on Sui, you'll constantly make this design decision: does this object need to be shared, or can it stay owned?`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 9.1 — Summary',
      content: `- Sui is **object-centric**: every piece of on-chain data is an object with a unique ID, owner, and version
- Traditional blockchains use account-based key-value stores — Sui treats data as independent entities
- Six properties: Type, Unique ID, Owner, Data (fields), Version, Digest
- Three ownership types: **owned** (one address), **shared** (anyone), **frozen** (read-only)
- **Fast path**: transactions on owned/frozen objects skip consensus — near-instant finality
- **Consensus path**: transactions on shared objects need ordering — slightly slower
- Ownership is a design decision that affects both access control and performance`,
    },
  ],
};
export default lesson;
