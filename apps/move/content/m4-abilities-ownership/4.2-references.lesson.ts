import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '4.2',
  title: 'References',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'References & Borrowing',
      content: `When you pass a value to a function in Move, **ownership transfers** to that function — the original binding can no longer be used. To share access without transferring ownership, use **references**.

\`\`\`move
&T      // immutable reference — read-only access
&mut T  // mutable reference — read and write access
\`\`\`

### Using References

\`\`\`move
public fun get_fuel(ship: &Ship): u64 {
    ship.fuel  // read via reference
}

public fun refuel(ship: &mut Ship, amount: u64) {
    ship.fuel = ship.fuel + amount;  // write via mutable ref
}
\`\`\`

### Why References?

References let you share data efficiently without copying or transferring ownership. Move's compiler guarantees *no dangling references* — you can't hold a reference to something that's been moved or dropped.

### Dereferencing

\`\`\`move
let value = *&some_value; // copy via dereference
\`\`\``,
    },
    {
      type: 'TASK',
      title: 'Read with References',
      content: `Practice using immutable references to read struct fields without taking ownership.`,
      task: `In module \`refs::demo\`: (1) define \`public struct Ship has copy, drop { fuel: u64 }\`, then (2) write \`public fun get_fuel(ship: &Ship): u64\` that returns \`ship.fuel\`.`,
      hint: `\`public fun get_fuel(ship: &Ship): u64 { ship.fuel }\``,
      bonus: null,
      starterCode: `module refs::demo;\n\n// Define: public struct Ship has copy, drop { fuel: u64 }\n// Write: public fun get_fuel(ship: &Ship): u64\n// Return ship.fuel\n\n`,
      checks: [
        { test: code => /public\s+struct\s+Ship/.test(code), errorMsg: 'Define: public struct Ship has copy, drop { fuel: u64 }' },
        { test: code => /fuel\s*:\s*u64/.test(code), errorMsg: 'Ship needs a fuel: u64 field' },
        { test: code => /public\s+fun\s+get_fuel\s*\(\s*\w+\s*:\s*&Ship\s*\)\s*:\s*u64/.test(code), errorMsg: 'Write: public fun get_fuel(ship: &Ship): u64 { ... }' },
        { test: code => /ship\.fuel|ship\s*\.\s*fuel/.test(code), errorMsg: 'Return ship.fuel' },
      ],
      successOutput: `$ sui move build\n   Compiling refs v0.0.1\nBuild Successful\n✓ refs::demo::get_fuel compiled\n  Takes: &Ship (immutable borrow)\n  Returns: ship.fuel as u64`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 4.2 — Summary',
      content: `- Passing a value to a function transfers **ownership** — the original binding is consumed
- \`&T\` is an immutable reference — read-only access without ownership transfer
- \`&mut T\` is a mutable reference — read and write access without ownership transfer
- Move guarantees no dangling references at compile time
- Use \`*&value\` to dereference (copy the underlying value)`,
    },
  ],
};
export default lesson;
