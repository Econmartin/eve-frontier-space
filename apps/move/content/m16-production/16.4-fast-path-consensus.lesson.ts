import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '16.4',
  title: 'Fast Path & Consensus',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Two Paths Through Sui',
      content: `Not all transactions are equal on Sui. The network has **two execution paths** based on the objects involved:

### Fast path (no consensus needed)

If a transaction only touches **owned objects** (objects with a single owner), Sui can process it immediately — no need to coordinate with other validators. This is called the **fast path**.

- Latency: ~400ms to finality
- No ordering conflicts — only the owner can use these objects
- Examples: transferring an owned NFT, updating your player profile

### Consensus path

If a transaction touches **shared objects** (objects anyone can access), Sui must run consensus to agree on ordering — because multiple transactions might try to modify the same shared object simultaneously.

- Latency: ~2-3 seconds to finality
- Required for any shared state (marketplaces, AMMs, shared registries)
- Uses Sui's DAG-based consensus (Mysticeti)

### The design implication

This distinction should shape how you architect your contracts:

| Pattern | Path | When to use |
|---------|------|-------------|
| Owned objects only | Fast | User profiles, personal inventories, 1:1 transfers |
| Shared objects | Consensus | Marketplaces, escrow, shared game state |
| Mixed (owned + shared) | Consensus | Buying from a shared shop with owned coins |

**Prefer owned objects when possible** — they're faster and don't create contention.`,
    },
    {
      type: 'LEARN',
      title: 'Designing for Performance',
      content: `### Avoid unnecessary sharing

A common mistake is making objects shared when they don't need to be:

\\\`\\\`\\\`move
// Bad: shared object just to store per-user data
public struct PlayerStats has key {
    id: UID,
    scores: Table<address, u64>,  // All players share one object
}
\\\`\\\`\\\`

\\\`\\\`\\\`move
// Good: each player owns their own stats
public struct PlayerStats has key {
    id: UID,
    score: u64,
}
\\\`\\\`\\\`

The first design forces every score update through consensus. The second lets each player update independently on the fast path.

### Splitting hot objects

If a shared object becomes a bottleneck (too many transactions competing for it), consider splitting it:

\\\`\\\`\\\`move
// Instead of one shared counter for all ships:
public struct GlobalRegistry has key {
    id: UID,
    ship_count: u64,  // Bottleneck!
}

// Split by region or category:
public struct RegionRegistry has key {
    id: UID,
    region: u8,
    ship_count: u64,  // Less contention per object
}
\\\`\\\`\\\`

### Read-only shared objects

If a shared object is only **read** (never mutated) in a transaction, Sui can sometimes skip consensus for that access. Design your shared objects so that hot-read paths don't require \\\`&mut\\\`:

\\\`\\\`\\\`move
// This only needs &self — can avoid contention
public fun get_price(registry: &PriceRegistry, item: u64): u64 {
    // read-only access to shared object
    *table::borrow(&registry.prices, item)
}
\\\`\\\`\\\``,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 16.4 — Summary',
      content: `- Sui has two execution paths: **fast path** (owned objects, ~400ms) and **consensus path** (shared objects, ~2-3s)
- Transactions touching only owned objects skip consensus entirely
- **Prefer owned objects** when possible for better performance
- Avoid making objects shared unless multiple users truly need concurrent access
- Split hot shared objects to reduce contention
- Read-only access to shared objects (\\\`&\\\` not \\\`&mut\\\`) can reduce consensus overhead
- Your object ownership design directly impacts transaction latency and throughput`,
    },
  ],
};
export default lesson;
