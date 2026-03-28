import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '12.4',
  title: 'Collections',
  time: '~15 min',
  pages: [
    {
      type: 'LEARN',
      title: 'In-Memory Collections',
      content: `For smaller datasets, Sui provides vector-based collections that live in-memory (inside a struct), unlike Table/Bag which use dynamic fields:

- **\`VecSet<T>\`** — a set of unique values (no duplicates)
- **\`VecMap<K,V>\`** — a map with unique keys

\`\`\`move
use sui::vec_set::{Self, VecSet};
use sui::vec_map::{Self, VecMap};

public struct FleetConfig has key {
    id: UID,
    allowed_classes: VecSet<u8>,
    class_names: VecMap<u8, vector<u8>>,
}
\`\`\`

Key operations:
- **VecSet**: \`insert\`, \`remove\`, \`contains\`, \`size\`
- **VecMap**: \`insert\`, \`remove\`, \`get\`, \`contains\`, \`size\`

These are small and fast for <100 entries, but cost grows linearly with size. Use Table/Bag for large collections.`,
    },
    {
      type: 'TASK',
      title: 'Crew Roster',
      content: `Write a crew roster using VecSet to manage unique crew member IDs.

For example:

\`\`\`move
public fun allow(acl: &mut AccessList, user_id: u64) {
    acl.users.insert(user_id);
}

public fun revoke(acl: &mut AccessList, user_id: u64) {
    acl.users.remove(&user_id);
}

public fun has_access(acl: &AccessList, user_id: u64): bool {
    acl.users.contains(&user_id)
}
\`\`\``,
      task: `Write a crew roster using VecSet:

1. \`add_member(roster: &mut CrewRoster, member_id: u64)\` — insert into vec_set
2. \`remove_member(roster: &mut CrewRoster, member_id: u64)\` — remove from vec_set
3. \`is_member(roster: &CrewRoster, member_id: u64): bool\` — check contains`,
      hint: `\`\`\`move
public fun add_member(roster: &mut CrewRoster, member_id: u64) {
    roster.members.insert(member_id);
}

public fun remove_member(roster: &mut CrewRoster, member_id: u64) {
    roster.members.remove(&member_id);
}

public fun is_member(roster: &CrewRoster, member_id: u64): bool {
    roster.members.contains(&member_id)
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::crew;

use sui::vec_set::{Self, VecSet};

public struct CrewRoster has key {
    id: UID,
    members: VecSet<u64>,
}

public fun new(ctx: &mut TxContext): CrewRoster {
    CrewRoster {
        id: object::new(ctx),
        members: vec_set::empty(),
    }
}

// Write add_member — insert member_id into the vec_set


// Write remove_member — remove member_id from the vec_set


// Write is_member — check if member_id is in the vec_set


#[test]
fun test_crew_roster() {
    let ctx = &mut tx_context::dummy();
    let mut roster = new(ctx);

    add_member(&mut roster, 101);
    add_member(&mut roster, 202);

    assert!(is_member(&roster, 101), 0);
    assert!(is_member(&roster, 202), 1);
    assert!(!is_member(&roster, 303), 2);

    remove_member(&mut roster, 101);
    assert!(!is_member(&roster, 101), 3);
    assert!(roster.members.size() == 1, 4);

    remove_member(&mut roster, 202);

    let CrewRoster { id, members: _ } = roster;
    id.delete();
}

#[test]
fun test_empty_roster() {
    let ctx = &mut tx_context::dummy();
    let roster = new(ctx);

    assert!(!is_member(&roster, 1), 0);
    assert!(roster.members.size() == 0, 1);

    let CrewRoster { id, members: _ } = roster;
    id.delete();
}
`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*crew\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::crew;' },
        { test: (code: string) => /fun\s+add_member\s*\(/.test(code), errorMsg: 'Write a function called add_member.' },
        { test: (code: string) => /fun\s+remove_member\s*\(/.test(code), errorMsg: 'Write a function called remove_member.' },
        { test: (code: string) => /fun\s+is_member\s*\(/.test(code), errorMsg: 'Write a function called is_member.' },
        { test: (code: string) => /\.insert\s*\(/.test(code), errorMsg: 'Use .insert() to add to the VecSet.' },
        { test: (code: string) => /\.remove\s*\(/.test(code), errorMsg: 'Use .remove() to delete from the VecSet.' },
        { test: (code: string) => /\.contains\s*\(/.test(code), errorMsg: 'Use .contains() to check membership in the VecSet.' },
      ],
      successOutput: `$ sui move test
   Compiling frontier v0.0.1
   Running tests...
[ PASS ] frontier::crew::test_crew_roster
[ PASS ] frontier::crew::test_empty_roster
Test result: OK. Total tests: 2; passed: 2; failed: 0`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 12.4 — Summary',
      content: `- **VecSet<T>** — unique items, backed by a vector, good for small sets
- **VecMap<K,V>** — key-value pairs, backed by a vector, good for small maps
- Both live in-memory inside the parent struct (not separate on-chain objects)
- Performance is linear — use Table/Bag for collections over ~100 entries
- Choose wisely: VecSet/VecMap for config-like data, Table/Bag for user-generated data`,
    },
  ],
};
export default lesson;
