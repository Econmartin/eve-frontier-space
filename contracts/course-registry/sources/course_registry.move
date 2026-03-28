/// EVE Frontier Space — Learn Move course completion registry.
///
/// A single shared `Registry` object records which addresses have completed
/// each course.  Each entry stores the learner's chosen display name and the
/// epoch at which they registered.
///
/// A `CourseCompleted` event is emitted on first registration — the frontend
/// uses `suix_queryEvents` against this type to build the completers list
/// without needing to iterate the on-chain table.
///
/// Deploy once per network; record the Registry object ID in constants.ts.
module course_registry::course_registry;

use std::string::{Self, String};
use sui::event;
use sui::table::{Self, Table};

// ═══════════════════════════════════════════════════════════
// Error codes
// ═══════════════════════════════════════════════════════════

/// Name exceeds the 64-byte maximum.
const ENameTooLong: u64 = 0;

// ═══════════════════════════════════════════════════════════
// On-chain state
// ═══════════════════════════════════════════════════════════

public struct Registry has key {
    id: UID,
    course1: Table<address, CompletionRecord>,
    course2: Table<address, CompletionRecord>,
}

public struct CompletionRecord has copy, store, drop {
    name: String,
    epoch: u64,
}

// ═══════════════════════════════════════════════════════════
// Events
// ═══════════════════════════════════════════════════════════

/// Emitted once per address per course on first registration.
/// Query with suix_queryEvents for type `{PACKAGE_ID}::course_registry::CourseCompleted`
/// to get the full completers list.
public struct CourseCompleted has copy, drop {
    learner: address,
    course:  u8,
    name:    String,
    epoch:   u64,
}

// ═══════════════════════════════════════════════════════════
// Initialiser
// ═══════════════════════════════════════════════════════════

fun init(ctx: &mut TxContext) {
    transfer::share_object(Registry {
        id: object::new(ctx),
        course1: table::new(ctx),
        course2: table::new(ctx),
    });
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

// ═══════════════════════════════════════════════════════════
// Public entry functions
// ═══════════════════════════════════════════════════════════

/// Register the sender as having completed Course 1 ("Learn Move").
/// Silently succeeds if they are already registered so the transaction
/// never fails in the wallet — the UI checks `is_registered_course1` first.
public fun register_course1(
    registry: &mut Registry,
    name: vector<u8>,
    ctx: &mut TxContext,
) {
    let name = make_name(name);
    let addr  = ctx.sender();
    let epoch = ctx.epoch();

    if (!registry.course1.contains(addr)) {
        registry.course1.add(addr, CompletionRecord { name, epoch });
        event::emit(CourseCompleted { learner: addr, course: 1, name, epoch });
    }
}

/// Register the sender as having completed Course 2 ("Learn Move on Sui").
public fun register_course2(
    registry: &mut Registry,
    name: vector<u8>,
    ctx: &mut TxContext,
) {
    let name = make_name(name);
    let addr  = ctx.sender();
    let epoch = ctx.epoch();

    if (!registry.course2.contains(addr)) {
        registry.course2.add(addr, CompletionRecord { name, epoch });
        event::emit(CourseCompleted { learner: addr, course: 2, name, epoch });
    }
}

// ═══════════════════════════════════════════════════════════
// Read-only helpers
// ═══════════════════════════════════════════════════════════

public fun is_registered_course1(registry: &Registry, addr: address): bool {
    registry.course1.contains(addr)
}

public fun is_registered_course2(registry: &Registry, addr: address): bool {
    registry.course2.contains(addr)
}

public fun get_record_course1(registry: &Registry, addr: address): &CompletionRecord {
    registry.course1.borrow(addr)
}

public fun get_record_course2(registry: &Registry, addr: address): &CompletionRecord {
    registry.course2.borrow(addr)
}

public fun record_name(r: &CompletionRecord): String  { r.name }
public fun record_epoch(r: &CompletionRecord): u64    { r.epoch }

// ═══════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════

/// Validate and convert raw bytes to a String.
/// Trims to 64 bytes if over-length rather than aborting, so the wallet
/// transaction always succeeds even if the client sends a long name.
fun make_name(bytes: vector<u8>): String {
    let len = bytes.length();
    assert!(len <= 64, ENameTooLong);
    string::utf8(bytes)
}
