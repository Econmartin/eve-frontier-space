/// EVE Frontier Bank — generic DeFi primitive.
///
/// The protocol is fully generic over the coin type T, meaning a single
/// deployed package can power a bank for any Sui coin.  On the EVE Frontier
/// testnet the admin calls:
///
///   bank::create_bank<0x2a66...::EVE::EVE>(&admin_cap, ctx)
///   bank::create_lottery<0x2a66...::EVE::EVE>(&admin_cap, 100_000_000, 2000, ctx)
///
/// Unit tests use the local `MockEVE` phantom type so no external
/// coin package dependency is needed for `sui move test`.
#[allow(lint(self_transfer))]
module eve_bank::bank;

use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};

// ═══════════════════════════════════════════════════════════
// Error codes
// ═══════════════════════════════════════════════════════════

const EZeroAmount:            u64 = 0;
const EInvalidLoanParameters: u64 = 1;
const ELoanAmountOutOfBounds: u64 = 2;
const EInsufficientPoolFunds: u64 = 3;
const EUnderpayment:          u64 = 4;
/// Ticket is still valid for the current round and cannot be burned yet.
const ETicketNotExpired:      u64 = 5;
/// Split amount must be > 0 and strictly less than the share's total.
const EInvalidSplitAmount:    u64 = 6;
/// Payment does not meet the ticket price.
const EInsufficientPayment:   u64 = 7;

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

/// Phantom marker used only in unit tests.
/// On deployment call `create_bank<assets::EVE::EVE>(...)` instead.
#[test_only]
public struct MockEVE has drop {}

/// The shared liquidity pool for token T.
/// Yield accrues silently: interest repayments increase `deposits`
/// without changing `total_shares`, so each share is worth more over time.
public struct CentralBank<phantom T> has key {
    id: UID,
    deposits:     Balance<T>,
    total_shares: u64,
}

/// Owned by the depositor. Burns on withdrawal.
public struct BankShare has key, store {
    id:     UID,
    shares: u64,
}

/// Capability required for privileged operations.
public struct AdminCap has key, store { id: UID }

/// Terms for a class of loans.
public struct LoanProduct has key, store {
    id:                UID,
    interest_rate_bps: u64,
    min_loan:          u64,
    max_loan:          u64,
}

/// Per-borrower loan receipt.
public struct ActiveLoan has key, store {
    id:         UID,
    principal:  u64,
    amount_due: u64,
    borrower:   address,
}

/// Shared lottery + insurance engine for token T.
public struct LotterySystem<phantom T> has key {
    id:               UID,
    ticket_price:     u64,
    lottery_pool:     Balance<T>,
    insurance_reserve: Balance<T>,
    house_edge_bps:   u64,
    current_round:    u64,
}

/// Proof of lottery entry — tied to the round it was purchased in.
public struct LotteryTicket has key, store { id: UID, round: u64 }

// ═══════════════════════════════════════════════════════════
// Initialisation — creates only the AdminCap
// ═══════════════════════════════════════════════════════════

fun init(ctx: &mut TxContext) {
    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
}

// ═══════════════════════════════════════════════════════════
// Admin setup — called post-deploy
// ═══════════════════════════════════════════════════════════

/// Create and share a CentralBank for coin type T.
/// Call once per token after publishing:
///   bank::create_bank<0x2a66...::EVE::EVE>(&admin_cap, ctx)
public fun create_bank<T>(_: &AdminCap, ctx: &mut TxContext) {
    transfer::share_object(CentralBank<T> {
        id:           object::new(ctx),
        deposits:     balance::zero(),
        total_shares: 0,
    });
}

// ═══════════════════════════════════════════════════════════
// Phase 1 — Pool Mechanics
// ═══════════════════════════════════════════════════════════

/// Deposit `coin` and receive a proportional `BankShare`.
/// First depositor: shares = amount (1:1 bootstrap).
/// Subsequent: shares = amount * total_shares / pool_balance.
public fun deposit<T>(bank: &mut CentralBank<T>, coin: Coin<T>, ctx: &mut TxContext) {
    let deposit_amount = coin.value();
    assert!(deposit_amount > 0, EZeroAmount);

    let pool_balance = bank.deposits.value();
    let shares_to_mint = if (bank.total_shares == 0 || pool_balance == 0) {
        deposit_amount
    } else {
        ((deposit_amount as u128) * (bank.total_shares as u128) / (pool_balance as u128)) as u64
    };

    bank.deposits.join(coin.into_balance());
    bank.total_shares = bank.total_shares + shares_to_mint;

    transfer::public_transfer(
        BankShare { id: object::new(ctx), shares: shares_to_mint },
        ctx.sender(),
    );
}

/// Burn a `BankShare` and withdraw the proportional pool value.
/// eve_out = share.shares * pool_balance / total_shares
public fun withdraw<T>(bank: &mut CentralBank<T>, share: BankShare, ctx: &mut TxContext): Coin<T> {
    let BankShare { id, shares } = share;
    id.delete();

    let pool_balance  = bank.deposits.value();
    let eve_amount    = ((shares as u128) * (pool_balance as u128) / (bank.total_shares as u128)) as u64;
    bank.total_shares = bank.total_shares - shares;

    coin::from_balance(bank.deposits.split(eve_amount), ctx)
}

// ═══════════════════════════════════════════════════════════
// Phase 2 — Admin & Loan Products
// ═══════════════════════════════════════════════════════════

/// Create and share a LoanProduct. Requires AdminCap.
public fun create_loan_product(
    _:                 &AdminCap,
    interest_rate_bps: u64,
    min_loan:          u64,
    max_loan:          u64,
    ctx:               &mut TxContext,
) {
    assert!(interest_rate_bps > 0, EInvalidLoanParameters);
    assert!(min_loan < max_loan,   EInvalidLoanParameters);

    transfer::share_object(LoanProduct {
        id: object::new(ctx),
        interest_rate_bps,
        min_loan,
        max_loan,
    });
}

// ═══════════════════════════════════════════════════════════
// Phase 3 — Borrowing & Repayment
// ═══════════════════════════════════════════════════════════

/// Borrow `amount` of T from the pool.
/// Issues an ActiveLoan to the caller and transfers the coin.
public fun borrow<T>(
    bank:    &mut CentralBank<T>,
    product: &LoanProduct,
    amount:  u64,
    ctx:     &mut TxContext,
): Coin<T> {
    assert!(amount >= product.min_loan, ELoanAmountOutOfBounds);
    assert!(amount <= product.max_loan, ELoanAmountOutOfBounds);
    assert!(bank.deposits.value() >= amount, EInsufficientPoolFunds);

    let interest   = (amount * product.interest_rate_bps) / 10_000;
    let amount_due = amount + interest;

    transfer::transfer(
        ActiveLoan {
            id: object::new(ctx),
            principal: amount,
            amount_due,
            borrower: ctx.sender(),
        },
        ctx.sender(),
    );

    coin::from_balance(bank.deposits.split(amount), ctx)
}

/// Repay a loan in full. Payment >= amount_due is required.
/// Full payment flows back into the pool, distributing yield to all shares.
public fun repay_loan<T>(bank: &mut CentralBank<T>, loan: ActiveLoan, payment: Coin<T>) {
    let ActiveLoan { id, principal: _, amount_due, borrower: _ } = loan;
    id.delete();
    assert!(payment.value() >= amount_due, EUnderpayment);
    bank.deposits.join(payment.into_balance());
}

// ═══════════════════════════════════════════════════════════
// Phase 4 — Lottery System
// ═══════════════════════════════════════════════════════════

/// Create and share a LotterySystem for coin type T. Requires AdminCap.
public fun initialize_lottery<T>(
    _:              &AdminCap,
    ticket_price:   u64,
    house_edge_bps: u64,
    ctx:            &mut TxContext,
) {
    transfer::share_object(LotterySystem<T> {
        id:               object::new(ctx),
        ticket_price,
        lottery_pool:     balance::zero(),
        insurance_reserve: balance::zero(),
        house_edge_bps,
        current_round:    1,
    });
}

/// Purchase a lottery ticket. Full `payment` enters the lottery_pool.
public fun buy_ticket<T>(
    lottery: &mut LotterySystem<T>,
    payment: Coin<T>,
    ctx:     &mut TxContext,
): LotteryTicket {
    assert!(payment.value() >= lottery.ticket_price, EInsufficientPayment);
    lottery.lottery_pool.join(payment.into_balance());
    LotteryTicket { id: object::new(ctx), round: lottery.current_round }
}

/// Draw the lottery. Splits pool: house_edge_bps% → reserve, rest → winner.
/// Requires AdminCap so only the protocol admin can trigger a draw.
public fun draw_lottery<T>(
    _:       &AdminCap,
    lottery: &mut LotterySystem<T>,
    winner:  address,
    ctx:     &mut TxContext,
) {
    let total       = lottery.lottery_pool.value();
    let reserve_cut = (total * lottery.house_edge_bps) / 10_000;
    let winner_cut  = total - reserve_cut;

    lottery.insurance_reserve.join(lottery.lottery_pool.split(reserve_cut));
    transfer::public_transfer(
        coin::from_balance(lottery.lottery_pool.split(winner_cut), ctx),
        winner,
    );
    lottery.current_round = lottery.current_round + 1;
}

// ═══════════════════════════════════════════════════════════
// Phase 5 — Safety Net
// ═══════════════════════════════════════════════════════════

/// Handle a defaulted loan.
///
/// Scenario A (reserve >= principal): full coverage, pool made whole.
/// Scenario B (reserve < principal):  reserve drained, remaining deficit is
///   a "haircut" socialised across all depositors via the lower pool balance.
/// Requires AdminCap so only the protocol admin can write off a loan.
public fun process_default<T>(
    _:       &AdminCap,
    bank:    &mut CentralBank<T>,
    lottery: &mut LotterySystem<T>,
    loan:    ActiveLoan,
) {
    let ActiveLoan { id, principal, amount_due: _, borrower: _ } = loan;
    id.delete();

    let reserve = lottery.insurance_reserve.value();
    if (reserve >= principal) {
        bank.deposits.join(lottery.insurance_reserve.split(principal));
    } else {
        bank.deposits.join(lottery.insurance_reserve.split(reserve));
    }
}

// ═══════════════════════════════════════════════════════════
// Phase 1 additions — share management
// ═══════════════════════════════════════════════════════════

/// Merge share2 into share1, burning share2.
/// Use this before a partial withdrawal to consolidate positions.
public fun merge_shares(share1: &mut BankShare, share2: BankShare) {
    let BankShare { id, shares } = share2;
    id.delete();
    share1.shares = share1.shares + shares;
}

/// Split `amount` shares off into a new BankShare, reducing share in place.
/// Used by the frontend to carve out the exact portion to withdraw.
public fun split_share(share: &mut BankShare, amount: u64, ctx: &mut TxContext): BankShare {
    assert!(amount > 0 && amount < share.shares, EInvalidSplitAmount);
    share.shares = share.shares - amount;
    BankShare { id: object::new(ctx), shares: amount }
}

// ═══════════════════════════════════════════════════════════
// Phase 4 additions — lottery cleanup
// ═══════════════════════════════════════════════════════════

/// Burn a ticket from a previous round, reclaiming the storage rebate.
/// Anyone can call this on their own expired tickets.
public fun burn_expired_ticket<T>(lottery: &LotterySystem<T>, ticket: LotteryTicket) {
    assert!(ticket.round < lottery.current_round, ETicketNotExpired);
    let LotteryTicket { id, round: _ } = ticket;
    id.delete();
}

// ═══════════════════════════════════════════════════════════
// Read-only accessors
// ═══════════════════════════════════════════════════════════

public fun share_value(s: &BankShare): u64                        { s.shares }
public fun product_interest_bps(p: &LoanProduct): u64             { p.interest_rate_bps }
public fun product_min_loan(p: &LoanProduct): u64                 { p.min_loan }
public fun product_max_loan(p: &LoanProduct): u64                 { p.max_loan }
public fun loan_amount_due(l: &ActiveLoan): u64                   { l.amount_due }
public fun lottery_reserve_balance<T>(ls: &LotterySystem<T>): u64 { ls.insurance_reserve.value() }
public fun bank_pool_balance<T>(b: &CentralBank<T>): u64          { b.deposits.value() }
public fun bank_total_shares<T>(b: &CentralBank<T>): u64          { b.total_shares }

// ═══════════════════════════════════════════════════════════
// Test-only helpers
// ═══════════════════════════════════════════════════════════

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

#[test_only]
public fun inject_yield_for_testing<T>(bank: &mut CentralBank<T>, coin: Coin<T>) {
    bank.deposits.join(coin.into_balance());
}
