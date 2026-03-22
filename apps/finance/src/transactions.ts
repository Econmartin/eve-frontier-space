/**
 * Pure PTB (Programmable Transaction Block) builder functions.
 *
 * Each function returns a Transaction that can be:
 *   1. Dry-run in tests via client.dryRunTransactionBlock()
 *   2. Signed and executed in the UI via useSignAndExecuteTransaction()
 *
 * No React dependencies — fully unit-testable.
 */
import { Transaction } from '@mysten/sui/transactions';
import {
  LATEST_PACKAGE_ID,
  NETWORKS,
  DEFAULT_NETWORK,
} from './constants';

const _defaultNet = NETWORKS[DEFAULT_NETWORK];

// ─── Override interface (used by tests to inject valid addresses) ─────────────
export interface TxOverrides {
  packageId?:      string;
  centralBankId?:  string;
  eveCoinType?:    string;
  /** Sender address — required for builders that return non-droppable objects */
  sender?:         string;
}

const GAS_BUDGET = 20_000_000; // 0.02 SUI — well above actual cost (~2-5M MIST)

// ─── Phase 1: Pool ───────────────────────────────────────────────────────────

export function buildDepositTx(
  eveCoinId:  string,
  amountMist: bigint,
  overrides:  TxOverrides = {},
): Transaction {
  const pkg      = overrides.packageId    ?? LATEST_PACKAGE_ID;
  const bank     = overrides.centralBankId ?? _defaultNet.centralBankId;
  const coinType = overrides.eveCoinType   ?? _defaultNet.eveCoinType;
  const tx = new Transaction();
  const [split] = tx.splitCoins(tx.object(eveCoinId), [tx.pure.u64(amountMist)]);
  tx.moveCall({
    target:        `${pkg}::bank::deposit`,
    typeArguments: [coinType],
    arguments:     [tx.object(bank), split],
  });
  tx.setGasBudget(GAS_BUDGET);
  return tx;
}

export function buildWithdrawTx(
  shareCoinId: string,
  overrides:   TxOverrides = {},
): Transaction {
  const pkg      = overrides.packageId    ?? LATEST_PACKAGE_ID;
  const bank     = overrides.centralBankId ?? _defaultNet.centralBankId;
  const coinType = overrides.eveCoinType   ?? _defaultNet.eveCoinType;
  const tx = new Transaction();
  const coin = tx.moveCall({
    target:        `${pkg}::bank::withdraw`,
    typeArguments: [coinType],
    arguments:     [tx.object(bank), tx.object(shareCoinId)],
  });
  if (overrides.sender) tx.transferObjects([coin], tx.pure.address(overrides.sender));
  tx.setGasBudget(GAS_BUDGET);
  return tx;
}

// ─── Phase 3: Loans ──────────────────────────────────────────────────────────

export function buildBorrowTx(
  loanProductId: string,
  amountMist:    bigint,
  overrides:     TxOverrides = {},
): Transaction {
  const pkg      = overrides.packageId    ?? LATEST_PACKAGE_ID;
  const bank     = overrides.centralBankId ?? _defaultNet.centralBankId;
  const coinType = overrides.eveCoinType   ?? _defaultNet.eveCoinType;
  const tx = new Transaction();
  const coin = tx.moveCall({
    target:        `${pkg}::bank::borrow`,
    typeArguments: [coinType],
    arguments:     [tx.object(bank), tx.object(loanProductId), tx.pure.u64(amountMist)],
  });
  if (overrides.sender) tx.transferObjects([coin], tx.pure.address(overrides.sender));
  tx.setGasBudget(GAS_BUDGET);
  return tx;
}

export function buildRepayTx(
  loanId:     string,
  eveCoinId:  string,
  amountMist: bigint,
  overrides:  TxOverrides = {},
): Transaction {
  const pkg      = overrides.packageId    ?? LATEST_PACKAGE_ID;
  const bank     = overrides.centralBankId ?? _defaultNet.centralBankId;
  const coinType = overrides.eveCoinType   ?? _defaultNet.eveCoinType;
  const tx = new Transaction();
  const [split] = tx.splitCoins(tx.object(eveCoinId), [tx.pure.u64(amountMist)]);
  tx.moveCall({
    target:        `${pkg}::bank::repay_loan`,
    typeArguments: [coinType],
    arguments:     [tx.object(bank), tx.object(loanId), split],
  });
  tx.setGasBudget(GAS_BUDGET);
  return tx;
}

// ─── Phase 4: Lottery ────────────────────────────────────────────────────────
// Admin-only: draw the lottery and pay out the winner.
export function buildDrawLotteryTx(
  adminCapId:    string,
  lotteryId:     string,
  winnerAddress: string,
  overrides:     TxOverrides = {},
): Transaction {
  const pkg      = overrides.packageId  ?? LATEST_PACKAGE_ID;
  const coinType = overrides.eveCoinType ?? _defaultNet.eveCoinType;
  const tx = new Transaction();
  tx.moveCall({
    target:        `${pkg}::bank::draw_lottery`,
    typeArguments: [coinType],
    arguments:     [tx.object(adminCapId), tx.object(lotteryId), tx.pure.address(winnerAddress)],
  });
  tx.setGasBudget(GAS_BUDGET);
  return tx;
}

// Admin-only: write off a defaulted loan against the insurance reserve.
export function buildProcessDefaultTx(
  adminCapId: string,
  bankId:     string,
  lotteryId:  string,
  loanId:     string,
  overrides:  TxOverrides = {},
): Transaction {
  const pkg      = overrides.packageId  ?? LATEST_PACKAGE_ID;
  const coinType = overrides.eveCoinType ?? _defaultNet.eveCoinType;
  const tx = new Transaction();
  tx.moveCall({
    target:        `${pkg}::bank::process_default`,
    typeArguments: [coinType],
    arguments:     [tx.object(adminCapId), tx.object(bankId), tx.object(lotteryId), tx.object(loanId)],
  });
  tx.setGasBudget(GAS_BUDGET);
  return tx;
}



export function buildBuyTicketTx(
  lotteryId:        string,
  eveCoinId:        string,
  ticketPriceMist:  bigint,
  overrides:        TxOverrides = {},
  count:            number = 1,
): Transaction {
  const pkg      = overrides.packageId  ?? LATEST_PACKAGE_ID;
  const coinType = overrides.eveCoinType ?? _defaultNet.eveCoinType;
  const tx = new Transaction();
  const amounts = Array.from({ length: count }, () => tx.pure.u64(ticketPriceMist));
  const splits  = tx.splitCoins(tx.object(eveCoinId), amounts);
  const tickets = Array.from({ length: count }, (_, i) =>
    tx.moveCall({
      target:        `${pkg}::bank::buy_ticket`,
      typeArguments: [coinType],
      arguments:     [tx.object(lotteryId), splits[i]],
    }),
  );
  if (overrides.sender) tx.transferObjects(tickets, tx.pure.address(overrides.sender));
  tx.setGasBudget(GAS_BUDGET);
  return tx;
}
