import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { buildDepositTx, buildWithdrawAmountTx } from '../transactions';
import { useEveBalance } from '../hooks/useEveBalance';
import { useBankShares } from '../hooks/useBankShares';
import { useNetwork } from '../contexts/NetworkContext';
import { suiRpcClient } from '../suiRpcClient';
import { EVE_SCALE } from '../constants';

interface BankFields { deposits: string; total_shares: string; }

export function BankDashboard() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const { network } = useNetwork();

  const { formattedBalance, largestCoinId, isLoading: balanceLoading } = useEveBalance();
  const { shares, isLoading: sharesLoading } = useBankShares();

  const [depositAmount,  setDepositAmount]  = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error,  setError]  = useState<string | null>(null);

  const overrides = { centralBankId: network.centralBankId, eveCoinType: network.eveCoinType, sender: account?.address };

  // Fetch pool state so we can convert EVE ↔ shares
  const { data: bankObj } = useQuery({
    queryKey: ['getObject', network.centralBankId],
    queryFn:  () => suiRpcClient.getObject({ id: network.centralBankId, options: { showContent: true } }),
  });
  const bankFields = bankObj?.data?.content?.dataType === 'moveObject'
    ? (bankObj.data.content.fields as unknown as BankFields)
    : null;

  const bankDeposits    = BigInt(bankFields?.deposits    ?? '0');
  const bankTotalShares = BigInt(bankFields?.total_shares ?? '0');

  // Compute combined position value in MIST
  const totalOwnedShares = shares.reduce((s, sh) => s + BigInt(sh.shares), 0n);
  const positionMist = bankTotalShares > 0n
    ? totalOwnedShares * bankDeposits / bankTotalShares
    : 0n;
  const positionEve = (Number(positionMist) / Number(EVE_SCALE)).toLocaleString(undefined, { maximumFractionDigits: 4 });

  async function handleDeposit() {
    if (!account || !largestCoinId) return;
    setStatus(null); setError(null);
    try {
      const amountMist = BigInt(Math.floor(Number(depositAmount))) * EVE_SCALE;
      await dAppKit.signAndExecuteTransaction({ transaction: buildDepositTx(largestCoinId, amountMist, overrides) });
      await queryClient.invalidateQueries();
      setStatus(`Deposited ${depositAmount} EVE — BankShare minted.`);
      setDepositAmount('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deposit failed');
    }
  }

  async function handleWithdraw() {
    if (!account || shares.length === 0) return;
    setStatus(null); setError(null);
    try {
      const requestedMist = BigInt(Math.floor(Number(withdrawAmount) * Number(EVE_SCALE)));
      const capMist = positionMist < requestedMist ? positionMist : requestedMist;
      await dAppKit.signAndExecuteTransaction({
        transaction: buildWithdrawAmountTx(shares, capMist, bankDeposits, bankTotalShares, overrides),
      });
      await queryClient.invalidateQueries();
      setStatus('Withdrawal complete — EVE returned to wallet.');
      setWithdrawAmount('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-eve-surface border border-eve-border rounded-lg px-4 py-3">
        <span className="text-eve-muted text-sm font-mono">WALLET BALANCE</span>
        <span className="text-eve-gold font-mono font-bold text-lg">
          {balanceLoading ? '…' : `${formattedBalance} EVE`}
        </span>
      </div>

      <div className="bg-eve-surface border border-eve-border rounded-lg p-5 space-y-4">
        <h3 className="text-white font-semibold tracking-wide">DEPOSIT</h3>
        <div className="flex gap-3">
          <input
            type="number" min="0" step="0.000000001"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Amount in EVE"
            className="flex-1 bg-eve-bg border border-eve-border rounded px-3 py-2 text-white font-mono text-sm placeholder:text-eve-muted focus:outline-none focus:border-eve-gold"
          />
          <button
            onClick={handleDeposit}
            disabled={!account || !depositAmount || !largestCoinId}
            className="px-5 py-2 bg-eve-gold text-eve-bg font-bold rounded hover:bg-eve-gold-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Deposit
          </button>
        </div>
        <p className="text-eve-muted text-xs font-mono">
          Earn yield as borrowers repay loans. Your share grows automatically.
        </p>
      </div>

      <div className="bg-eve-surface border border-eve-border rounded-lg p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-white font-semibold tracking-wide">YOUR POSITION</h3>
          {!sharesLoading && shares.length > 0 && (
            <span className="text-eve-gold font-mono font-bold text-lg">{positionEve} EVE</span>
          )}
        </div>

        {sharesLoading && <p className="text-eve-muted text-sm font-mono">Loading…</p>}
        {!sharesLoading && shares.length === 0 && (
          <p className="text-eve-muted text-sm font-mono">No active position.</p>
        )}
        {!sharesLoading && shares.length > 0 && (
          <div className="flex gap-3">
            <input
              type="number" min="0" step="0.0001"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Amount to withdraw in EVE"
              className="flex-1 bg-eve-bg border border-eve-border rounded px-3 py-2 text-white font-mono text-sm placeholder:text-eve-muted focus:outline-none focus:border-eve-gold"
            />
            <button
              onClick={() => setWithdrawAmount((Number(positionMist) / Number(EVE_SCALE)).toFixed(4))}
              className="px-3 py-2 border border-eve-gold/60 text-eve-gold text-xs font-mono rounded hover:bg-eve-gold/10 transition-colors whitespace-nowrap"
            >
              MAX
            </button>
            <button
              onClick={handleWithdraw}
              disabled={!withdrawAmount || Number(withdrawAmount) <= 0}
              className="px-5 py-2 border border-eve-gold text-eve-gold font-bold rounded hover:bg-eve-gold hover:text-eve-bg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Withdraw
            </button>
          </div>
        )}
      </div>

      <StatusBar status={status} error={error} />
    </div>
  );
}

function StatusBar({ status, error }: { status: string | null; error: string | null }) {
  if (!status && !error) return null;
  return (
    <div className={`rounded-lg px-4 py-3 font-mono text-sm ${error ? 'bg-eve-red/10 border border-eve-red text-eve-red' : 'bg-eve-green/10 border border-eve-green text-eve-green'}`}>
      {error ?? status}
    </div>
  );
}
