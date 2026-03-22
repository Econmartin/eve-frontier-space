#[test_only]
#[allow(deprecated_usage, untyped_literal)]
module eve_bank::bank_tests;

use sui::test_scenario::{Self as ts};
use sui::coin;
use sui::test_utils::assert_eq;
use eve_bank::bank::{
    Self,
    CentralBank,
    BankShare,
    AdminCap,
    LoanProduct,
    ActiveLoan,
    LotterySystem,
    LotteryTicket,
    MockEVE,
};

// ═══════════════════════════════════════════════════════════
// PHASE 1: Pool Mechanics — Deposits & Withdrawals
// ═══════════════════════════════════════════════════════════

#[test]
fun test_deposit_first_depositor_gets_1_to_1_shares() {
    let admin = @0xAD;
    let user  = @0xA1;
    let mut scenario = ts::begin(admin);

    ts::next_tx(&mut scenario, admin);
    { bank::init_for_testing(ts::ctx(&mut scenario)); };

    // Admin creates the bank for MockEVE (mirrors create_bank<EVE::EVE> on deploy)
    ts::next_tx(&mut scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(&scenario);
        bank::create_bank<MockEVE>(&cap, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, user);
    {
        let mut bank = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let coin = coin::mint_for_testing<MockEVE>(100, ts::ctx(&mut scenario));
        bank::deposit(&mut bank, coin, ts::ctx(&mut scenario));
        ts::return_shared(bank);
    };

    ts::next_tx(&mut scenario, user);
    {
        let share = ts::take_from_sender<BankShare>(&scenario);
        assert_eq(bank::share_value(&share), 100);
        ts::return_to_sender(&scenario, share);
    };

    ts::end(scenario);
}

#[test]
fun test_deposit_proportional_shares_with_yield() {
    let admin = @0xAD;
    let user1 = @0xA1;
    let user2 = @0xA2;
    let mut scenario = ts::begin(admin);

    ts::next_tx(&mut scenario, admin);
    { bank::init_for_testing(ts::ctx(&mut scenario)); };

    ts::next_tx(&mut scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(&scenario);
        bank::create_bank<MockEVE>(&cap, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, user1);
    {
        let mut bank = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let coin = coin::mint_for_testing<MockEVE>(100, ts::ctx(&mut scenario));
        bank::deposit(&mut bank, coin, ts::ctx(&mut scenario));
        ts::return_shared(bank);
    };

    // Inject 100 EVE yield → pool = 200, shares = 100
    ts::next_tx(&mut scenario, admin);
    {
        let mut bank = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let yield_coin = coin::mint_for_testing<MockEVE>(100, ts::ctx(&mut scenario));
        bank::inject_yield_for_testing(&mut bank, yield_coin);
        ts::return_shared(bank);
    };

    // user2 deposits 100 → should get 100 * 100 / 200 = 50 shares
    ts::next_tx(&mut scenario, user2);
    {
        let mut bank = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let coin = coin::mint_for_testing<MockEVE>(100, ts::ctx(&mut scenario));
        bank::deposit(&mut bank, coin, ts::ctx(&mut scenario));
        ts::return_shared(bank);
    };

    ts::next_tx(&mut scenario, user2);
    {
        let share = ts::take_from_sender<BankShare>(&scenario);
        assert_eq(bank::share_value(&share), 50);
        ts::return_to_sender(&scenario, share);
    };

    ts::end(scenario);
}

#[test, expected_failure(abort_code = bank::EZeroAmount)]
fun test_deposit_zero_aborts() {
    let admin = @0xAD;
    let user  = @0xA1;
    let mut scenario = ts::begin(admin);

    ts::next_tx(&mut scenario, admin);
    { bank::init_for_testing(ts::ctx(&mut scenario)); };

    ts::next_tx(&mut scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(&scenario);
        bank::create_bank<MockEVE>(&cap, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, user);
    {
        let mut bank = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let coin = coin::mint_for_testing<MockEVE>(0, ts::ctx(&mut scenario));
        bank::deposit(&mut bank, coin, ts::ctx(&mut scenario));
        ts::return_shared(bank);
    };

    ts::end(scenario);
}

#[test]
fun test_withdraw_returns_proportional_eve() {
    let admin = @0xAD;
    let user  = @0xA1;
    let mut scenario = ts::begin(admin);

    ts::next_tx(&mut scenario, admin);
    { bank::init_for_testing(ts::ctx(&mut scenario)); };

    ts::next_tx(&mut scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(&scenario);
        bank::create_bank<MockEVE>(&cap, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, user);
    {
        let mut bank = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let coin = coin::mint_for_testing<MockEVE>(100, ts::ctx(&mut scenario));
        bank::deposit(&mut bank, coin, ts::ctx(&mut scenario));
        ts::return_shared(bank);
    };

    ts::next_tx(&mut scenario, user);
    {
        let mut bank  = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let share = ts::take_from_sender<BankShare>(&scenario);
        let out   = bank::withdraw(&mut bank, share, ts::ctx(&mut scenario));
        assert_eq(coin::value(&out), 100);
        coin::burn_for_testing(out);
        ts::return_shared(bank);
    };

    ts::end(scenario);
}

#[test]
fun test_withdraw_captures_yield() {
    let admin = @0xAD;
    let user  = @0xA1;
    let mut scenario = ts::begin(admin);

    ts::next_tx(&mut scenario, admin);
    { bank::init_for_testing(ts::ctx(&mut scenario)); };

    ts::next_tx(&mut scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(&scenario);
        bank::create_bank<MockEVE>(&cap, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, user);
    {
        let mut bank = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let coin = coin::mint_for_testing<MockEVE>(100, ts::ctx(&mut scenario));
        bank::deposit(&mut bank, coin, ts::ctx(&mut scenario));
        ts::return_shared(bank);
    };

    ts::next_tx(&mut scenario, admin);
    {
        let mut bank = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let yield_coin = coin::mint_for_testing<MockEVE>(50, ts::ctx(&mut scenario));
        bank::inject_yield_for_testing(&mut bank, yield_coin);
        ts::return_shared(bank);
    };

    // 100 shares on 150 pool → should get back 150
    ts::next_tx(&mut scenario, user);
    {
        let mut bank  = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let share = ts::take_from_sender<BankShare>(&scenario);
        let out   = bank::withdraw(&mut bank, share, ts::ctx(&mut scenario));
        assert_eq(coin::value(&out), 150);
        coin::burn_for_testing(out);
        ts::return_shared(bank);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════════════════
// PHASE 2: Admin & Loan Products
// ═══════════════════════════════════════════════════════════

#[test]
fun test_admin_can_create_loan_product() {
    let admin = @0xAD;
    let mut scenario = ts::begin(admin);

    ts::next_tx(&mut scenario, admin);
    { bank::init_for_testing(ts::ctx(&mut scenario)); };

    ts::next_tx(&mut scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(&scenario);
        bank::create_loan_product(&cap, 500, 100, 10_000, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, admin);
    {
        let product = ts::take_shared<LoanProduct>(&scenario);
        assert_eq(bank::product_interest_bps(&product), 500);
        assert_eq(bank::product_min_loan(&product), 100);
        assert_eq(bank::product_max_loan(&product), 10_000);
        ts::return_shared(product);
    };

    ts::end(scenario);
}

#[test, expected_failure(abort_code = bank::EInvalidLoanParameters)]
fun test_invalid_loan_params_min_gt_max_aborts() {
    let admin = @0xAD;
    let mut scenario = ts::begin(admin);

    ts::next_tx(&mut scenario, admin);
    { bank::init_for_testing(ts::ctx(&mut scenario)); };

    ts::next_tx(&mut scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(&scenario);
        bank::create_loan_product(&cap, 500, 500, 100, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    ts::end(scenario);
}

#[test, expected_failure(abort_code = bank::EInvalidLoanParameters)]
fun test_invalid_loan_params_zero_rate_aborts() {
    let admin = @0xAD;
    let mut scenario = ts::begin(admin);

    ts::next_tx(&mut scenario, admin);
    { bank::init_for_testing(ts::ctx(&mut scenario)); };

    ts::next_tx(&mut scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(&scenario);
        bank::create_loan_product(&cap, 0, 100, 10_000, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════════════════
// PHASE 3: Borrowing & Repayment
// ═══════════════════════════════════════════════════════════

fun setup_bank_with_product(scenario: &mut ts::Scenario, admin: address, depositor: address) {
    ts::next_tx(scenario, admin);
    { bank::init_for_testing(ts::ctx(scenario)); };

    ts::next_tx(scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(scenario);
        bank::create_bank<MockEVE>(&cap, ts::ctx(scenario));
        ts::return_to_sender(scenario, cap);
    };

    ts::next_tx(scenario, depositor);
    {
        let mut b = ts::take_shared<CentralBank<MockEVE>>(scenario);
        let coin = coin::mint_for_testing<MockEVE>(1_000, ts::ctx(scenario));
        bank::deposit(&mut b, coin, ts::ctx(scenario));
        ts::return_shared(b);
    };

    ts::next_tx(scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(scenario);
        // 10% interest (1000 bps), 100–800 range
        bank::create_loan_product(&cap, 1_000, 100, 800, ts::ctx(scenario));
        ts::return_to_sender(scenario, cap);
    };
}

#[test]
fun test_borrow_success() {
    let admin    = @0xAD;
    let depositor = @0xD0;
    let borrower = @0xB0;
    let mut scenario = ts::begin(admin);

    setup_bank_with_product(&mut scenario, admin, depositor);

    ts::next_tx(&mut scenario, borrower);
    {
        let mut bank    = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let product = ts::take_shared<LoanProduct>(&scenario);
        let coin    = bank::borrow(&mut bank, &product, 500, ts::ctx(&mut scenario));
        assert_eq(coin::value(&coin), 500);
        coin::burn_for_testing(coin);
        ts::return_shared(bank);
        ts::return_shared(product);
    };

    // amount_due = 500 + 10% = 550
    ts::next_tx(&mut scenario, borrower);
    {
        let loan = ts::take_from_sender<ActiveLoan>(&scenario);
        assert_eq(bank::loan_amount_due(&loan), 550);
        ts::return_to_sender(&scenario, loan);
    };

    ts::end(scenario);
}

#[test, expected_failure(abort_code = bank::ELoanAmountOutOfBounds)]
fun test_borrow_above_max_aborts() {
    let admin    = @0xAD;
    let depositor = @0xD0;
    let borrower = @0xB0;
    let mut scenario = ts::begin(admin);

    setup_bank_with_product(&mut scenario, admin, depositor);

    ts::next_tx(&mut scenario, borrower);
    {
        let mut bank    = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let product = ts::take_shared<LoanProduct>(&scenario);
        let coin = bank::borrow(&mut bank, &product, 999, ts::ctx(&mut scenario));
        coin::burn_for_testing(coin);
        ts::return_shared(bank);
        ts::return_shared(product);
    };

    ts::end(scenario);
}

#[test, expected_failure(abort_code = bank::ELoanAmountOutOfBounds)]
fun test_borrow_below_min_aborts() {
    let admin    = @0xAD;
    let depositor = @0xD0;
    let borrower = @0xB0;
    let mut scenario = ts::begin(admin);

    setup_bank_with_product(&mut scenario, admin, depositor);

    ts::next_tx(&mut scenario, borrower);
    {
        let mut bank    = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let product = ts::take_shared<LoanProduct>(&scenario);
        let coin = bank::borrow(&mut bank, &product, 50, ts::ctx(&mut scenario));
        coin::burn_for_testing(coin);
        ts::return_shared(bank);
        ts::return_shared(product);
    };

    ts::end(scenario);
}

#[test]
fun test_repay_loan_increases_pool_balance() {
    let admin    = @0xAD;
    let depositor = @0xD0;
    let borrower  = @0xB0;
    let mut scenario = ts::begin(admin);

    setup_bank_with_product(&mut scenario, admin, depositor);

    ts::next_tx(&mut scenario, borrower);
    {
        let mut bank    = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let product = ts::take_shared<LoanProduct>(&scenario);
        let coin    = bank::borrow(&mut bank, &product, 500, ts::ctx(&mut scenario));
        coin::burn_for_testing(coin);
        ts::return_shared(bank);
        ts::return_shared(product);
    };

    // Borrower repays 550 (500 principal + 50 interest)
    ts::next_tx(&mut scenario, borrower);
    {
        let mut bank    = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let loan    = ts::take_from_sender<ActiveLoan>(&scenario);
        let payment = coin::mint_for_testing<MockEVE>(550, ts::ctx(&mut scenario));
        bank::repay_loan(&mut bank, loan, payment);
        ts::return_shared(bank);
    };

    // Pool: 500 (remaining after borrow) + 550 (repayment) = 1050
    // Depositor's 1000 shares → 1050 EVE
    ts::next_tx(&mut scenario, depositor);
    {
        let mut bank  = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let share = ts::take_from_sender<BankShare>(&scenario);
        let out   = bank::withdraw(&mut bank, share, ts::ctx(&mut scenario));
        assert_eq(coin::value(&out), 1_050);
        coin::burn_for_testing(out);
        ts::return_shared(bank);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════════════════
// PHASE 4: Lottery Mechanics
// ═══════════════════════════════════════════════════════════

#[test]
fun test_buy_lottery_ticket_funds_pool() {
    let admin  = @0xAD;
    let player = @0xC0;
    let mut scenario = ts::begin(admin);

    ts::next_tx(&mut scenario, admin);
    { bank::init_for_testing(ts::ctx(&mut scenario)); };

    ts::next_tx(&mut scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(&scenario);
        bank::initialize_lottery<MockEVE>(&cap, 100, 2_000, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, player);
    {
        let mut lottery = ts::take_shared<LotterySystem<MockEVE>>(&scenario);
        let payment = coin::mint_for_testing<MockEVE>(100, ts::ctx(&mut scenario));
        let ticket  = bank::buy_ticket(&mut lottery, payment, ts::ctx(&mut scenario));
        sui::transfer::public_transfer(ticket, player);
        ts::return_shared(lottery);
    };

    ts::next_tx(&mut scenario, player);
    {
        let ticket = ts::take_from_sender<LotteryTicket>(&scenario);
        ts::return_to_sender(&scenario, ticket);
    };

    ts::end(scenario);
}

#[test]
fun test_lottery_draw_splits_correctly() {
    let admin  = @0xAD;
    let player = @0xC0;
    let winner = @0xE0;
    let mut scenario = ts::begin(admin);

    ts::next_tx(&mut scenario, admin);
    { bank::init_for_testing(ts::ctx(&mut scenario)); };

    ts::next_tx(&mut scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(&scenario);
        bank::initialize_lottery<MockEVE>(&cap, 100, 2_000, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    // 5 players buy tickets → pool = 500 EVE
    let mut i = 0u64;
    while (i < 5) {
        ts::next_tx(&mut scenario, player);
        {
            let mut lottery = ts::take_shared<LotterySystem<MockEVE>>(&scenario);
            let payment = coin::mint_for_testing<MockEVE>(100, ts::ctx(&mut scenario));
            let ticket  = bank::buy_ticket(&mut lottery, payment, ts::ctx(&mut scenario));
            sui::transfer::public_transfer(ticket, player);
            ts::return_shared(lottery);
        };
        i = i + 1;
    };

    // Draw: 500 EVE → 100 to reserve (20%), 400 to winner (80%)
    ts::next_tx(&mut scenario, admin);
    {
        let cap     = ts::take_from_sender<AdminCap>(&scenario);
        let mut lottery = ts::take_shared<LotterySystem<MockEVE>>(&scenario);
        bank::draw_lottery(&cap, &mut lottery, winner, ts::ctx(&mut scenario));
        assert_eq(bank::lottery_reserve_balance(&lottery), 100);
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(lottery);
    };

    ts::next_tx(&mut scenario, winner);
    {
        let winnings = ts::take_from_sender<sui::coin::Coin<MockEVE>>(&scenario);
        assert_eq(coin::value(&winnings), 400);
        coin::burn_for_testing(winnings);
    };

    ts::end(scenario);
}

// ═══════════════════════════════════════════════════════════
// PHASE 5: The Safety Net — Default & Liquidation
// ═══════════════════════════════════════════════════════════

fun setup_funded_lottery(scenario: &mut ts::Scenario, admin: address, reserve_amount: u64) {
    ts::next_tx(scenario, admin);
    {
        let cap = ts::take_from_sender<AdminCap>(scenario);
        // 100% house edge: all ticket sales go to reserve
        bank::initialize_lottery<MockEVE>(&cap, reserve_amount, 10_000, ts::ctx(scenario));
        ts::return_to_sender(scenario, cap);
    };

    ts::next_tx(scenario, @0xC0);
    {
        let mut lottery = ts::take_shared<LotterySystem<MockEVE>>(scenario);
        let payment = coin::mint_for_testing<MockEVE>(reserve_amount, ts::ctx(scenario));
        let ticket  = bank::buy_ticket(&mut lottery, payment, ts::ctx(scenario));
        sui::transfer::public_transfer(ticket, @0xC0);
        ts::return_shared(lottery);
    };

    ts::next_tx(scenario, admin);
    {
        let cap     = ts::take_from_sender<AdminCap>(scenario);
        let mut lottery = ts::take_shared<LotterySystem<MockEVE>>(scenario);
        // Draw to @0xFACE; all 100% flows to reserve
        bank::draw_lottery(&cap, &mut lottery, @0xFACE, ts::ctx(scenario));
        ts::return_to_sender(scenario, cap);
        ts::return_shared(lottery);
    };
}

#[test]
fun test_loan_default_fully_covered_by_reserve() {
    let admin     = @0xAD;
    let depositor = @0xD0;
    let borrower  = @0xB0;
    let mut scenario = ts::begin(admin);

    setup_bank_with_product(&mut scenario, admin, depositor);
    // Seed reserve with 200 EVE (enough to cover 200 principal)
    setup_funded_lottery(&mut scenario, admin, 200);

    ts::next_tx(&mut scenario, borrower);
    {
        let mut bank    = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let product = ts::take_shared<LoanProduct>(&scenario);
        let coin    = bank::borrow(&mut bank, &product, 200, ts::ctx(&mut scenario));
        coin::burn_for_testing(coin);
        ts::return_shared(bank);
        ts::return_shared(product);
    };

    ts::next_tx(&mut scenario, admin);
    {
        let cap     = ts::take_from_sender<AdminCap>(&scenario);
        let mut bank    = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let mut lottery = ts::take_shared<LotterySystem<MockEVE>>(&scenario);
        let loan    = ts::take_from_address<ActiveLoan>(&scenario, borrower);
        bank::process_default(&cap, &mut bank, &mut lottery, loan);
        assert_eq(bank::lottery_reserve_balance(&lottery), 0);
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(bank);
        ts::return_shared(lottery);
    };

    // Pool = 800 (remaining) + 200 (reserve coverage) = 1000 → no haircut
    ts::next_tx(&mut scenario, depositor);
    {
        let mut bank  = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let share = ts::take_from_sender<BankShare>(&scenario);
        let out   = bank::withdraw(&mut bank, share, ts::ctx(&mut scenario));
        assert_eq(coin::value(&out), 1_000);
        coin::burn_for_testing(out);
        ts::return_shared(bank);
    };

    ts::end(scenario);
}

#[test]
fun test_loan_default_partial_reserve_causes_haircut() {
    let admin     = @0xAD;
    let depositor = @0xD0;
    let borrower  = @0xB0;
    let mut scenario = ts::begin(admin);

    setup_bank_with_product(&mut scenario, admin, depositor);
    // Seed reserve with only 50 EVE (not enough for 500 default)
    setup_funded_lottery(&mut scenario, admin, 50);

    ts::next_tx(&mut scenario, borrower);
    {
        let mut bank    = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let product = ts::take_shared<LoanProduct>(&scenario);
        let coin    = bank::borrow(&mut bank, &product, 500, ts::ctx(&mut scenario));
        coin::burn_for_testing(coin);
        ts::return_shared(bank);
        ts::return_shared(product);
    };

    ts::next_tx(&mut scenario, admin);
    {
        let cap     = ts::take_from_sender<AdminCap>(&scenario);
        let mut bank    = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let mut lottery = ts::take_shared<LotterySystem<MockEVE>>(&scenario);
        let loan    = ts::take_from_address<ActiveLoan>(&scenario, borrower);
        bank::process_default(&cap, &mut bank, &mut lottery, loan);
        assert_eq(bank::lottery_reserve_balance(&lottery), 0);
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(bank);
        ts::return_shared(lottery);
    };

    // Pool = 500 (remaining) + 50 (reserve) = 550 → 450 haircut socialised
    ts::next_tx(&mut scenario, depositor);
    {
        let mut bank  = ts::take_shared<CentralBank<MockEVE>>(&scenario);
        let share = ts::take_from_sender<BankShare>(&scenario);
        let out   = bank::withdraw(&mut bank, share, ts::ctx(&mut scenario));
        assert_eq(coin::value(&out), 550);
        coin::burn_for_testing(out);
        ts::return_shared(bank);
    };

    ts::end(scenario);
}
