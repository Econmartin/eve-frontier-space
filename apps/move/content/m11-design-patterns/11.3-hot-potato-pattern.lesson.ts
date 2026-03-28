import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '11.3',
  title: 'Hot Potato Pattern',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Structs With No Abilities',
      content: `A struct with **no abilities** can't be copied, dropped, or stored. It MUST be unpacked (destructured) by the module that created it.

This forces the caller to complete a sequence of operations — hence the name "hot potato." You have to pass it along; you can't just hold it.

\`\`\`move
module frontier::docking;

// No abilities — the "hot potato"
public struct DockingPermit {
    bay_id: u64,
}

public fun request_dock(bay_id: u64): DockingPermit {
    DockingPermit { bay_id }
}

public fun complete_dock(permit: DockingPermit) {
    let DockingPermit { bay_id: _ } = permit;
    // docking is now complete
}
\`\`\`

If the caller doesn't call \`complete_dock\`, the transaction **FAILS** — because the permit can't be dropped, copied, or stored. The only way to get rid of it is to destructure it in the module that defined it.

**Use cases:**
- **Flash loans** — borrow assets, must return them in the same transaction
- **Forced multi-step workflows** — start something, must finish it
- **Borrowing patterns** — take a reference, must give it back`,
    },
    {
      type: 'TASK',
      title: 'Refueling with Hot Potato',
      content: `Build a refueling system that uses the hot potato pattern to guarantee the refueling process is completed.

For example:

\`\`\`move
// No abilities — must be destructured to dispose of
public struct ActionTicket {
    action_id: u64,
}

public fun begin(tracker: &mut Tracker): ActionTicket {
    let id = tracker.next_id;
    tracker.next_id = tracker.next_id + 1;
    ActionTicket { action_id: id }
}

public fun finish(tracker: &mut Tracker, ticket: ActionTicket) {
    let ActionTicket { action_id: _ } = ticket;
    tracker.completed = tracker.completed + 1;
}
\`\`\``,
      task: `Write a refueling system with a hot potato:

1. Define \`Ship\` with \`key\` ability, fields: \`id: UID\`, \`fuel: u64\`
2. Define \`RefuelTicket\` with **no abilities**, field: \`old_fuel: u64\`
3. \`start_refuel(ship: &mut Ship): RefuelTicket\` — saves current fuel in ticket, sets ship fuel to 0, returns the ticket
4. \`complete_refuel(ship: &mut Ship, ticket: RefuelTicket, new_fuel: u64)\` — destructures the ticket, sets ship fuel to new_fuel`,
      hint: `\`\`\`move
public struct Ship has key {
    id: UID,
    fuel: u64,
}

public struct RefuelTicket {
    old_fuel: u64,
}

public fun start_refuel(ship: &mut Ship): RefuelTicket {
    let old_fuel = ship.fuel;
    ship.fuel = 0;
    RefuelTicket { old_fuel }
}

public fun complete_refuel(ship: &mut Ship, ticket: RefuelTicket, new_fuel: u64) {
    let RefuelTicket { old_fuel: _ } = ticket;
    ship.fuel = new_fuel;
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::refuel;

// Define Ship — key, has UID and fuel: u64


// Define RefuelTicket — NO abilities, has old_fuel: u64


// start_refuel: saves fuel in ticket, sets ship fuel to 0, returns ticket


// complete_refuel: destructures ticket, sets ship fuel to new_fuel

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*refuel\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::refuel;' },
        { test: (code: string) => /struct\s+Ship\s+has\s+key/.test(code), errorMsg: 'Define Ship with key ability.' },
        { test: (code: string) => /struct\s+RefuelTicket\s*\{/.test(code), errorMsg: 'Define RefuelTicket with no abilities.' },
        { test: (code: string) => !/struct\s+RefuelTicket\s+has/.test(code), errorMsg: 'RefuelTicket should have NO abilities — that is the hot potato.' },
        { test: (code: string) => /fun\s+start_refuel\s*\(/.test(code), errorMsg: 'Write a function called start_refuel.' },
        { test: (code: string) => /fun\s+complete_refuel\s*\(/.test(code), errorMsg: 'Write a function called complete_refuel.' },
        { test: (code: string) => /let\s+RefuelTicket\s*\{/.test(code), errorMsg: 'Destructure the RefuelTicket in complete_refuel to unpack the hot potato.' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
Build Successful`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 11.3 — Summary',
      content: `- A struct with **no abilities** is a "hot potato" — it can't be copied, dropped, or stored
- It MUST be destructured by the module that created it
- If the caller doesn't complete the workflow, the transaction fails
- Use cases: flash loans, forced multi-step workflows, borrowing patterns
- The pattern guarantees that certain operations always come in pairs (start/finish)`,
    },
  ],
};
export default lesson;
