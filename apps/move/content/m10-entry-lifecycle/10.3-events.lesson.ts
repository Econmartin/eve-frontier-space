import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '10.3',
  title: 'Events',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Broadcasting to the Outside World',
      content: `On-chain code lives in its own world — it can't call an API, send a notification, or update a dashboard. So how does the outside world know what happened in a transaction?

**Events.** They're one-way messages emitted during transactions that off-chain services can listen for.

\`\`\`move
module frontier::combat;

use sui::event;

public struct BattleStarted has copy, drop {
    attacker: address,
    defender: address,
    sector: u64,
}

public fun start_battle(attacker: address, defender: address, sector: u64) {
    event::emit(BattleStarted { attacker, defender, sector });
}
\`\`\`

When \`start_battle\` executes, the \`BattleStarted\` event is recorded in the transaction's effects. Off-chain indexers, analytics pipelines, and frontend UIs subscribe to these events and react accordingly.

### Event struct rules

Event structs need **\`copy\` and \`drop\`** abilities:
- \`copy\` — the runtime needs to copy the data into transaction effects
- \`drop\` — events are ephemeral, not stored permanently

They do **not** have \`key\` — events are not objects. They have no \`UID\`, no ownership, no on-chain storage.

\`\`\`move
// Correct — events are copy + drop
public struct ShipDocked has copy, drop { /* ... */ }

// Wrong — events are NOT objects
public struct ShipDocked has key { id: UID, /* ... */ }
\`\`\``,
    },
    {
      type: 'LEARN',
      title: 'Event Design',
      content: `Good event design makes your protocol easy to index and build on. Here are the key principles:

### Name events in past tense

Events describe something that **already happened**:

\`\`\`move
public struct ShipDocked has copy, drop { /* ... */ }
public struct BattleEnded has copy, drop { /* ... */ }
public struct FuelPurchased has copy, drop { /* ... */ }
public struct PilotRegistered has copy, drop { /* ... */ }
\`\`\`

Not \`DockShip\` or \`Docking\` — those sound like commands or ongoing actions.

### Include enough context

Off-chain consumers need to understand what happened without querying the chain:

\`\`\`move
// Too little context — which ship? where?
public struct ShipDocked has copy, drop {
    timestamp: u64,
}

// Good — consumers can identify everything
public struct ShipDocked has copy, drop {
    ship_id: address,
    station_id: address,
    pilot: address,
    timestamp: u64,
}
\`\`\`

### Key facts about events

- **Not stored on-chain** — they exist only in transaction effects
- You **can emit multiple events** per transaction
- Event types must be **defined in the emitting module** — you can't emit another module's event
- Use \`sui::event::emit()\` to fire them
- Indexers like Sui's GraphQL API let you subscribe by event type`,
    },
    {
      type: 'TASK',
      title: 'Dock a Ship',
      content: `Write a docking module that tracks docked ships and emits an event.

For example:

\`\`\`move
public struct BayOpened has copy, drop {
    bay_id: address,
    opened_by: address,
}

public fun open_bay(station: &mut Station, opener: address) {
    station.open_count = station.open_count + 1;
    event::emit(BayOpened {
        bay_id: object::uid_to_address(&station.id),
        opened_by: opener,
    });
}
\`\`\``,
      task: `1. Define a \`ShipDocked\` event struct with \`copy, drop\` abilities and fields: \`ship_id: address\`, \`station_id: address\`, \`timestamp: u64\`
2. Complete the \`dock\` function:
   - Increment \`station.docked_count\`
   - Emit a \`ShipDocked\` event using \`event::emit\` with the station's id (\`object::uid_to_address(&station.id)\`), the ship_id, and timestamp`,
      hint: `\`\`\`move
public struct ShipDocked has copy, drop {
    ship_id: address,
    station_id: address,
    timestamp: u64,
}

public fun dock(station: &mut Station, ship_id: address, timestamp: u64) {
    station.docked_count = station.docked_count + 1;
    event::emit(ShipDocked {
        ship_id,
        station_id: object::uid_to_address(&station.id),
        timestamp,
    });
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::docking;

use sui::event;

public struct Station has key {
    id: UID,
    docked_count: u64,
}

// Define ShipDocked event: copy, drop
// Fields: ship_id (address), station_id (address), timestamp (u64)


// Increment docked_count and fire a ShipDocked event
// Use object::uid_to_address(&station.id) for the station_id field
public fun dock(station: &mut Station, ship_id: address, timestamp: u64) {
    // your code here
}
`,
      checks: [
        { test: (code: string) => /struct\s+ShipDocked\s+has\s+(copy\s*,\s*drop|drop\s*,\s*copy)/.test(code), errorMsg: 'Define ShipDocked with copy, drop abilities.' },
        { test: (code: string) => /ship_id\s*:\s*address/.test(code), errorMsg: 'ShipDocked needs a ship_id: address field.' },
        { test: (code: string) => /station_id\s*:\s*address/.test(code), errorMsg: 'ShipDocked needs a station_id: address field.' },
        { test: (code: string) => /timestamp\s*:\s*u64/.test(code), errorMsg: 'ShipDocked needs a timestamp: u64 field.' },
        { test: (code: string) => /docked_count\s*\+\s*1/.test(code) || /docked_count\s*=\s*station\.docked_count\s*\+\s*1/.test(code), errorMsg: 'Increment station.docked_count by 1.' },
        { test: (code: string) => /event\s*::\s*emit\s*\(/.test(code), errorMsg: 'Use event::emit() to emit the ShipDocked event.' },
        { test: (code: string) => /event\s*::\s*emit\s*\(\s*ShipDocked\s*\{/.test(code), errorMsg: 'Emit a ShipDocked struct inside event::emit().' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
   Build Successful

Transaction effects:
  Events: [
    { type: "frontier::docking::ShipDocked",
      ship_id: "0xSHIP...", station_id: "0xSTATION...", timestamp: 1700000000 }
  ]`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 10.3 — Summary',
      content: `- **Events** are one-way messages emitted during transactions for off-chain consumers
- Event structs need \`copy\` + \`drop\` abilities (not \`key\` — they're not objects)
- Use \`sui::event::emit()\` to fire an event
- Name events in **past tense**: \`ShipDocked\`, \`BattleEnded\`, \`FuelPurchased\`
- Include enough context for off-chain consumers to understand what happened
- Events are **not stored on-chain** — they exist only in transaction effects
- You can emit multiple events per transaction
- Event types must be defined in the emitting module`,
    },
  ],
};
export default lesson;
