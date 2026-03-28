module course_registry::course_registry_tests;

use course_registry::course_registry::{Self, Registry};
use sui::test_scenario;


// ── helpers ──────────────────────────────────────────────────────────────────

const ALICE: address = @0xA11CE;
const BOB:   address = @0xB0B;

// ── tests ────────────────────────────────────────────────────────────────────

#[test]
fun test_register_course1() {
    let mut scenario = test_scenario::begin(ALICE);

    // Init creates the shared Registry
    {
        course_registry::init_for_testing(scenario.ctx());
    };

    scenario.next_tx(ALICE);
    {
        let mut registry = scenario.take_shared<Registry>();
        assert!(!registry.is_registered_course1(ALICE), 0);

        registry.register_course1(b"Alice Starfield", scenario.ctx());
        assert!(registry.is_registered_course1(ALICE), 1);

        let record = registry.get_record_course1(ALICE);
        assert!(record.record_name() == std::string::utf8(b"Alice Starfield"), 2);

        test_scenario::return_shared(registry);
    };

    scenario.end();
}

#[test]
fun test_register_course2() {
    let mut scenario = test_scenario::begin(BOB);

    {
        course_registry::init_for_testing(scenario.ctx());
    };

    scenario.next_tx(BOB);
    {
        let mut registry = scenario.take_shared<Registry>();
        registry.register_course2(b"Bob Nebula", scenario.ctx());
        assert!(registry.is_registered_course2(BOB), 0);
        assert!(!registry.is_registered_course1(BOB), 1);
        test_scenario::return_shared(registry);
    };

    scenario.end();
}

#[test]
fun test_idempotent_registration() {
    let mut scenario = test_scenario::begin(ALICE);

    {
        course_registry::init_for_testing(scenario.ctx());
    };

    scenario.next_tx(ALICE);
    {
        let mut registry = scenario.take_shared<Registry>();
        registry.register_course1(b"Alice", scenario.ctx());
        // Second call should not abort
        registry.register_course1(b"Alice Again", scenario.ctx());
        // Name should still be the first one
        let record = registry.get_record_course1(ALICE);
        assert!(record.record_name() == std::string::utf8(b"Alice"), 0);
        test_scenario::return_shared(registry);
    };

    scenario.end();
}

#[test]
#[expected_failure]
fun test_name_too_long() {
    let mut scenario = test_scenario::begin(ALICE);

    {
        course_registry::init_for_testing(scenario.ctx());
    };

    scenario.next_tx(ALICE);
    {
        let mut registry = scenario.take_shared<Registry>();
        // 65 bytes — should abort
        registry.register_course1(
            b"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            scenario.ctx(),
        );
        test_scenario::return_shared(registry);
    };

    scenario.end();
}
