import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '15.3',
  title: 'Building Against Limits',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Network Limits',
      content: `Sui has hard limits that affect how you design your contracts. Hitting these mid-production is painful, so plan around them from the start:

| Limit | Value | Impact |
|-------|-------|--------|
| Transaction size | 128 KB | Limits how much data per tx |
| Object size | 256 KB | Use dynamic fields for large data |
| Pure argument size | 16 KB | Limits single function arg size |
| Objects created per tx | 2,048 | Batch creates need multiple txs |
| Dynamic fields accessed per tx | 1,000 | Pagination for large collections |
| Events per tx | 1,024 | Batch events or aggregate |

These limits exist for network health — they prevent any single transaction from consuming too many resources. Your job is to design data structures that work well within them.`,
    },
    {
      type: 'LEARN',
      title: 'Design Strategies',
      content: `### Large Data: Use Dynamic Fields

\`\`\`move
module frontier::shipyard;

// BAD: vector grows unbounded inside object
public struct BadRegistry has key {
    id: UID,
    entries: vector<Entry>,  // will hit 256KB limit
}

// GOOD: use Table for unbounded collections
public struct GoodRegistry has key {
    id: UID,
    entries: Table<u64, Entry>,  // each entry is a separate dynamic field
    count: u64,
}
\`\`\`

### Why Table Wins
- Each entry is stored as a **separate dynamic field** — the parent object stays small
- You only load the entries you actually access (not the entire collection)
- No 256 KB ceiling on total collection size

### Batch Operations
When you need to create or process many items, split work across multiple transactions. A single tx can create at most 2,048 objects — plan pagination accordingly.

### Gas Optimization
- **Owned objects skip consensus** — transactions touching only owned objects are cheaper and faster
- **Shared objects serialize** — if many transactions touch the same shared object, they queue up
- **Strategy**: shard data across multiple objects when possible to reduce contention

\`\`\`move
// BAD: single shared counter — every tx contends
public struct GlobalCounter has key {
    id: UID,
    count: u64,
}

// BETTER: per-user counters — no contention
public struct UserCounter has key {
    id: UID,
    count: u64,
}
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Refactor to Table',
      content: `Refactor a shipyard from a bounded vector to a scalable Table.

For example:

\`\`\`move
public fun add_entry(store: &mut DataStore, key: u64, value: vector<u8>) {
    table::add(&mut store.data, key, value);
    store.count = store.count + 1;
}

public fun get_entry(store: &DataStore, key: u64): &vector<u8> {
    table::borrow(&store.data, key)
}

public fun entry_count(store: &DataStore): u64 {
    store.count
}
\`\`\``,
      task: `Given a Shipyard using Table, implement three functions:

1. \`add_ship(yard: &mut Shipyard, ship_id: u64, name: vector<u8>)\` — adds the name to the table at ship_id and increments count
2. \`get_ship(yard: &Shipyard, ship_id: u64): &vector<u8>\` — returns a reference to the name from the table
3. \`ship_count(yard: &Shipyard): u64\` — returns the count field`,
      hint: `\`\`\`move
public fun add_ship(yard: &mut Shipyard, ship_id: u64, name: vector<u8>) {
    table::add(&mut yard.ships, ship_id, name);
    yard.count = yard.count + 1;
}

public fun get_ship(yard: &Shipyard, ship_id: u64): &vector<u8> {
    table::borrow(&yard.ships, ship_id)
}

public fun ship_count(yard: &Shipyard): u64 {
    yard.count
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::scalable_yard;

use sui::object::{Self, UID};
use sui::table::{Self, Table};
use sui::tx_context::TxContext;

public struct Shipyard has key {
    id: UID,
    ships: Table<u64, vector<u8>>,
    count: u64,
}

// Write add_ship — add name to table at ship_id, increment count


// Write get_ship — borrow the name from the table


// Write ship_count — return yard.count


#[test]
fun test_shipyard() {
    let ctx = &mut tx_context::dummy();
    let mut yard = Shipyard {
        id: object::new(ctx),
        ships: table::new(ctx),
        count: 0,
    };

    add_ship(&mut yard, 1, b"Vanguard");
    add_ship(&mut yard, 2, b"Sentinel");
    assert!(ship_count(&yard) == 2, 0);
    assert!(*get_ship(&yard, 1) == b"Vanguard", 1);
    assert!(*get_ship(&yard, 2) == b"Sentinel", 2);

    // cleanup
    table::remove(&mut yard.ships, 1);
    table::remove(&mut yard.ships, 2);
    table::destroy_empty(yard.ships);
    let Shipyard { id, ships: _, count: _ } = yard;
    object::delete(id);
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*scalable_yard\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::scalable_yard;' },
        { test: (code: string) => /fun\s+add_ship\s*\(/.test(code), errorMsg: 'Write a function called add_ship.' },
        { test: (code: string) => /fun\s+get_ship\s*\(/.test(code), errorMsg: 'Write a function called get_ship.' },
        { test: (code: string) => /fun\s+ship_count\s*\(/.test(code), errorMsg: 'Write a function called ship_count.' },
        { test: (code: string) => /table\s*::\s*add/.test(code), errorMsg: 'Use table::add to insert into the table.' },
        { test: (code: string) => /table\s*::\s*borrow/.test(code), errorMsg: 'Use table::borrow to read from the table.' },
        { test: (code: string) => /count/.test(code), errorMsg: 'Track the count field when adding ships.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::scalable_yard::test_shipyard
Test result: OK. Total tests: 1; passed: 1; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 15.3 — Summary',
      content: `- **Know the limits**: 128 KB tx size, 256 KB object size, 2,048 objects per tx, 1,000 dynamic fields per tx
- **Dynamic fields for large data** — use Table/Bag instead of vectors in objects
- **Table for unbounded collections** — each entry is a separate dynamic field, parent stays small
- **Batch across transactions** when creating or processing many items
- **Minimize shared object contention** — shard data, prefer owned objects
- **Owned objects are faster** — they skip consensus entirely`,
    },
  ],
};
export default lesson;
