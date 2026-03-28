import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '12.3',
  title: 'Dynamic Collections',
  time: '~25 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Built-in Collection Types',
      content: `Sui provides higher-level collections built on dynamic fields:

| Collection | Description | Key type | Value type |
|-----------|------------|----------|-----------|
| \`Table<K,V>\` | Typed map | Fixed K | Fixed V |
| \`Bag\` | Heterogeneous map | Any | Any |
| \`LinkedTable<K,V>\` | Ordered typed map | Fixed K | Fixed V |
| \`ObjectTable<K,V>\` | Table for objects | Fixed K | Objects |
| \`ObjectBag\` | Bag for objects | Any | Objects |

\`\`\`move
use sui::table::{Self, Table};

public struct Registry has key {
    id: UID,
    ships: Table<address, vector<u8>>,  // owner -> ship name
}

fun init(ctx: &mut TxContext) {
    let registry = Registry {
        id: object::new(ctx),
        ships: table::new(ctx),
    };
    transfer::share_object(registry);
}

public fun register(reg: &mut Registry, owner: address, name: vector<u8>) {
    reg.ships.add(owner, name);
}
\`\`\`

All collections track size with \`.length()\` and \`.is_empty()\`.

- Use **Table** when keys and values are the same type throughout
- Use **Bag** when you need different value types per entry`,
    },
    {
      type: 'TASK',
      title: 'Leaderboard',
      content: `Write a leaderboard using Table to track pilot scores.

For example:

\`\`\`move
public fun set_entry(reg: &mut Registry, key: address, value: u64) {
    reg.entries.add(key, value);
}

public fun get_entry(reg: &Registry, key: address): &u64 {
    reg.entries.borrow(key)
}

public fun clear_entry(reg: &mut Registry, key: address): u64 {
    reg.entries.remove(key)
}
\`\`\``,
      task: `Write a leaderboard using Table:

1. \`add_score(board: &mut Leaderboard, pilot: address, score: u64)\` — adds to table
2. \`get_score(board: &Leaderboard, pilot: address): &u64\` — reads score
3. \`remove_pilot(board: &mut Leaderboard, pilot: address): u64\` — removes and returns`,
      hint: `\`\`\`move
public fun add_score(board: &mut Leaderboard, pilot: address, score: u64) {
    board.scores.add(pilot, score);
}

public fun get_score(board: &Leaderboard, pilot: address): &u64 {
    board.scores.borrow(pilot)
}

public fun remove_pilot(board: &mut Leaderboard, pilot: address): u64 {
    board.scores.remove(pilot)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::leaderboard;

use sui::table::{Self, Table};

public struct Leaderboard has key {
    id: UID,
    scores: Table<address, u64>,
}

public fun new(ctx: &mut TxContext): Leaderboard {
    Leaderboard {
        id: object::new(ctx),
        scores: table::new(ctx),
    }
}

// Write add_score — add pilot -> score to the table


// Write get_score — borrow the score for a pilot


// Write remove_pilot — remove and return the pilot's score


#[test]
fun test_leaderboard() {
    let ctx = &mut tx_context::dummy();
    let mut board = new(ctx);
    let pilot = @0xA;

    add_score(&mut board, pilot, 1000);
    assert!(*get_score(&board, pilot) == 1000, 0);

    let removed = remove_pilot(&mut board, pilot);
    assert!(removed == 1000, 1);
    assert!(board.scores.is_empty(), 2);

    let Leaderboard { id, scores } = board;
    scores.destroy_empty();
    id.delete();
}

#[test]
fun test_multiple_pilots() {
    let ctx = &mut tx_context::dummy();
    let mut board = new(ctx);

    add_score(&mut board, @0xA, 500);
    add_score(&mut board, @0xB, 750);

    assert!(*get_score(&board, @0xA) == 500, 0);
    assert!(*get_score(&board, @0xB) == 750, 1);
    assert!(board.scores.length() == 2, 2);

    let _ = remove_pilot(&mut board, @0xA);
    let _ = remove_pilot(&mut board, @0xB);

    let Leaderboard { id, scores } = board;
    scores.destroy_empty();
    id.delete();
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*leaderboard\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::leaderboard;' },
        { test: (code: string) => /fun\s+add_score\s*\(/.test(code), errorMsg: 'Write a function called add_score.' },
        { test: (code: string) => /fun\s+get_score\s*\(/.test(code), errorMsg: 'Write a function called get_score.' },
        { test: (code: string) => /fun\s+remove_pilot\s*\(/.test(code), errorMsg: 'Write a function called remove_pilot.' },
        { test: (code: string) => /\.add\s*\(/.test(code), errorMsg: 'Use .add() to insert into the table.' },
        { test: (code: string) => /\.borrow\s*\(/.test(code), errorMsg: 'Use .borrow() to read from the table.' },
        { test: (code: string) => /\.remove\s*\(/.test(code), errorMsg: 'Use .remove() to delete from the table.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::leaderboard::test_leaderboard
[ PASS ] frontier::leaderboard::test_multiple_pilots
Test result: OK. Total tests: 2; passed: 2; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 12.3 — Summary',
      content: `- **Table<K,V>** — typed map for uniform key-value pairs, built on dynamic fields
- **Bag** — heterogeneous map when you need different value types
- **LinkedTable<K,V>** — ordered typed map that tracks insertion order
- **ObjectTable / ObjectBag** — same but values stay discoverable (like \`ofield\`)
- All collections support \`.length()\` and \`.is_empty()\`
- Collections must be explicitly destroyed when empty`,
    },
  ],
};
export default lesson;
