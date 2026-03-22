import { useState } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { buildDepositTx, buildWithdrawTx } from '../transactions';
import { useEveBalance } from '../hooks/useEveBalance';
import { useBankShares } from '../hooks/useBankShares';
import { useNetwork } from '../contexts/NetworkContext';
import { EVE_SCALE } from '../constants';

export function BankDashboard() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const { network } = useNetwork();

  const { formattedBalance, largestCoinId, isLoading: balanceLoading } = useEveBalance();
  const { shares, isLoading: sharesLoading } = useBankShares();

  const [depositAmount, setDepositAmount] = useState('');
  const [status, setStatus]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const overrides = { centralBankId: network.centralBankId, eveCoinType: network.eveCoinType, sender: account?.address };

  async function handleDeposit() {
    if (!account || !largestCoinId) return;
    setStatus(null); setError(null);
    try {
      const amountMist = BigInt(Math.floor(Number(depositAmount))) * EVE_SCALE;
      await dAppKit.signAndExecuteTransaction({ transaction: buildDepositTx(largestCoinId, amountMist, overrides) });
      setStatus(`Deposited ${depositAmount} EVE — BankShare minted.`);
      setDepositAmount('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deposit failed');
    }
  }

  async function handleWithdraw(shareId: string) {
    if (!account) return;
    setStatus(null); setError(null);
    try {
      await dAppKit.signAndExecuteTransaction({ transaction: buildWithdrawTx(shareId, overrides) });
      setStatus('Withdrawal complete — EVE returned to wallet.');
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

      <div className="bg-eve-surface border border-eve-border rounded-lg p-5 space-y-3">
        <h3 className="text-white font-semibold tracking-wide">YOUR POSITIONS</h3>
        {sharesLoading && <p className="text-eve-muted text-sm font-mono">Loading shares…</p>}
        {!sharesLoading && shares.length === 0 && (
          <p className="text-eve-muted text-sm font-mono">No active positions.</p>
        )}
        {shares.map((share) => (
          <div key={share.objectId} className="flex items-center justify-between bg-eve-bg border border-eve-border rounded px-4 py-3">
            <div>
              <p className="text-white font-mono text-sm">{Number(share.shares).toLocaleString()} shares</p>
              <p className="text-eve-muted font-mono text-xs truncate w-64">{share.objectId}</p>
            </div>
            <button
              onClick={() => handleWithdraw(share.objectId)}
              className="px-4 py-1.5 border border-eve-gold text-eve-gold text-sm font-mono rounded hover:bg-eve-gold hover:text-eve-bg transition-colors"
            >
              Withdraw
            </button>
          </div>
        ))}
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
