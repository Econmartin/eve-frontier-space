import type { Lesson } from '../../src/lib/types';

const lesson: Lesson = {
  id: '14.2',
  title: 'Epoch, Time & Clock',
  time: '~20 min',
  pages: [
    {
      type: 'LEARN',
      title: 'Time on Sui',
      content: `Smart contracts often need to know the current time — for cooldowns, auctions, staking periods, and more. Sui gives you **two ways** to access time:

### 1. Epoch-based time (from TxContext)

An **epoch** is an operational period on Sui (~24 hours). Every transaction knows which epoch it's in:

\`\`\`move
module frontier::epoch_demo;

public fun current_epoch(ctx: &TxContext): u64 {
    ctx.epoch()  // e.g., 347
}

public fun epoch_start_time(ctx: &TxContext): u64 {
    ctx.epoch_timestamp_ms()  // ms since Unix epoch when this epoch started
}
\`\`\`

Good for: staking periods, epoch-based cooldowns, governance voting windows.

### 2. Clock-based time (precise)

The **Clock** is a system object at address \`@0x6\` that provides millisecond-precision timestamps:

\`\`\`move
module frontier::clock_demo;

use sui::clock::Clock;

public fun log_time(clock: &Clock): u64 {
    clock.timestamp_ms()  // milliseconds since Unix epoch
}
\`\`\`

- Always passed as \`&Clock\` (immutable reference — you can't modify time!)
- Updated every transaction
- Good for: precise timestamps, auction deadlines, time-locked actions`,
    },
    {
      type: 'LEARN',
      title: 'Choosing Epoch vs Clock',
      content: `When should you use which?

| Need | Use | Why |
|------|-----|-----|
| Staking periods | Epoch | Aligns with network operations |
| "Wait N epochs" cooldowns | Epoch | Simple integer comparison |
| Auction end times | Clock | Precise to the millisecond |
| Event timestamps | Clock | Exact time recording |
| Rate limiting | Clock | Precise intervals |
| Governance voting windows | Epoch | Epoch boundaries are clean |

Here's a practical pattern — **time-locked withdrawal**:

\`\`\`move
module frontier::time_lock;

use sui::clock::Clock;

public struct TimeLock has key {
    id: UID,
    unlock_time_ms: u64,
    value: u64,
}

public fun is_unlocked(lock: &TimeLock, clock: &Clock): bool {
    clock.timestamp_ms() >= lock.unlock_time_ms
}
\`\`\`

The Clock object is automatically available in transactions — callers just pass it as an argument.`,
    },
    {
      type: 'TASK',
      title: 'Cooldown System',
      content: `Build a cooldown system for ship abilities using the Clock.`,
      task: `Write a cooldown module:

1. \`start_cooldown(ship: &mut Ship, clock: &Clock)\` — sets \`ship.last_used_ms\` to \`clock.timestamp_ms()\`
2. \`is_ready(ship: &Ship, clock: &Clock, cooldown_ms: u64): bool\` — returns true if current time minus \`ship.last_used_ms\` is >= \`cooldown_ms\``,
      hint: `\`\`\`move
public fun start_cooldown(ship: &mut Ship, clock: &Clock) {
    ship.last_used_ms = clock.timestamp_ms();
}

public fun is_ready(ship: &Ship, clock: &Clock, cooldown_ms: u64): bool {
    clock.timestamp_ms() - ship.last_used_ms >= cooldown_ms
}
\`\`\``,
      bonus: null,
      starterCode: `module frontier::cooldown;

use sui::clock::Clock;

public struct Ship has key {
    id: UID,
    last_used_ms: u64,
}

// Write start_cooldown — record current time on the ship


// Write is_ready — check if enough time has passed

`,
      checks: [
        { test: (code: string) => /module\s+frontier\s*::\s*cooldown\s*;/.test(code), errorMsg: 'Keep the module declaration: module frontier::cooldown;' },
        { test: (code: string) => /fun\s+start_cooldown\s*\(/.test(code), errorMsg: 'Write a function called start_cooldown.' },
        { test: (code: string) => /fun\s+is_ready\s*\(/.test(code), errorMsg: 'Write a function called is_ready.' },
        { test: (code: string) => /timestamp_ms\s*\(\s*\)/.test(code), errorMsg: 'Use clock.timestamp_ms() to get the current time.' },
        { test: (code: string) => /last_used_ms/.test(code), errorMsg: 'Read and write the ship.last_used_ms field.' },
        { test: (code: string) => /&Clock/.test(code), errorMsg: 'Accept the Clock as &Clock (immutable reference).' },
        { test: (code: string) => /bool/.test(code), errorMsg: 'is_ready should return a bool.' },
      ],
      successOutput: `$ sui move build
   Compiling frontier v0.0.1
   Build Successful

Cooldown system online! Ships can now track ability timers.`,
    },
    {
      type: 'REVIEW',
      title: 'Lesson 14.2 — Summary',
      content: `- **Epoch**: operational period (~24h), access via \`ctx.epoch()\` and \`ctx.epoch_timestamp_ms()\`
- **Clock**: precise millisecond timestamps from system object at \`@0x6\`
- Clock is always passed as \`&Clock\` (immutable reference)
- Use **epoch** for coarse periods (staking, governance, epoch cooldowns)
- Use **Clock** for precise timing (auctions, timestamps, rate limiting)
- \`clock.timestamp_ms()\` returns milliseconds since Unix epoch
- Clock is a shared system object — no setup needed`,
    },
  ],
};
export default lesson;
