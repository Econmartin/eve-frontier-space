import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { buildBorrowTx, buildRepayTx } from '../transactions';
import { useEveBalance } from '../hooks/useEveBalance';
import { useActiveLoans } from '../hooks/useActiveLoans';
import { useNetwork } from '../contexts/NetworkContext';
import { EVE_SCALE } from '../constants';

export function LoanDashboard() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const { network } = useNetwork();

  const { formattedBalance, largestCoinId } = useEveBalance();
  const { loans, isLoading: loansLoading }  = useActiveLoans();

  const [borrowAmount, setBorrowAmount] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const overrides = { centralBankId: network.centralBankId, eveCoinType: network.eveCoinType, sender: account?.address };

  async function handleBorrow() {
    if (!account) return;
    setStatus(null); setError(null);
    try {
      const amountMist = BigInt(Math.floor(Number(borrowAmount))) * EVE_SCALE;
      await signAndExecute({ transaction: buildBorrowTx(network.loanProductId, amountMist, overrides) });
      setStatus(`Borrowed ${borrowAmount} EVE — ActiveLoan issued.`);
      setBorrowAmount('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Borrow failed');
    }
  }

  async function handleRepay(loanId: string, amountDue: string) {
    if (!account || !largestCoinId) return;
    setStatus(null); setError(null);
    try {
      await signAndExecute({ transaction: buildRepayTx(loanId, largestCoinId, BigInt(amountDue), overrides) });
      setStatus('Loan repaid — interest credited to pool.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Repayment failed');
    }
  }

  const formatEve = (mist: string) =>
    (Number(mist) / Number(EVE_SCALE)).toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-eve-surface border border-eve-border rounded-lg px-4 py-3">
        <span className="text-eve-muted text-sm font-mono">WALLET BALANCE</span>
        <span className="text-eve-gold font-mono font-bold text-lg">{formattedBalance} EVE</span>
      </div>

      <div className="bg-eve-surface border border-eve-border rounded-lg p-5 space-y-4">
        <h3 className="text-white font-semibold tracking-wide">BORROW</h3>
        <div className="flex gap-3">
          <input
            type="number" min="0"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            placeholder="Amount in EVE"
            className="flex-1 bg-eve-bg border border-eve-border rounded px-3 py-2 text-white font-mono text-sm placeholder:text-eve-muted focus:outline-none focus:border-eve-blue"
          />
          <button
            onClick={handleBorrow}
            disabled={!account || !borrowAmount}
            className="px-5 py-2 bg-eve-blue text-white font-bold rounded hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Borrow
          </button>
        </div>
        <p className="text-eve-muted text-xs font-mono">
          Loans use the default product. Interest returns to depositors as yield.
        </p>
      </div>

      <div className="bg-eve-surface border border-eve-border rounded-lg p-5 space-y-3">
        <h3 className="text-white font-semibold tracking-wide">ACTIVE LOANS</h3>
        {loansLoading && <p className="text-eve-muted text-sm font-mono">Loading loans…</p>}
        {!loansLoading && loans.length === 0 && (
          <p className="text-eve-muted text-sm font-mono">No active loans.</p>
        )}
        {loans.map((loan) => (
          <div key={loan.objectId} className="flex items-center justify-between bg-eve-bg border border-eve-border rounded px-4 py-3">
            <div>
              <p className="text-white font-mono text-sm">
                Principal <span className="text-eve-gold">{formatEve(loan.principal)} EVE</span>
              </p>
              <p className="text-eve-muted font-mono text-xs">
                Amount due: <span className="text-eve-red">{formatEve(loan.amountDue)} EVE</span>
              </p>
              <p className="text-eve-muted font-mono text-xs truncate w-64">{loan.objectId}</p>
            </div>
            <button
              onClick={() => handleRepay(loan.objectId, loan.amountDue)}
              disabled={!largestCoinId}
              className="px-4 py-1.5 border border-eve-red text-eve-red text-sm font-mono rounded hover:bg-eve-red hover:text-white transition-colors disabled:opacity-40"
            >
              Repay
            </button>
          </div>
        ))}
      </div>

      {(status || error) && (
        <div className={`rounded-lg px-4 py-3 font-mono text-sm ${error ? 'bg-eve-red/10 border border-eve-red text-eve-red' : 'bg-eve-green/10 border border-eve-green text-eve-green'}`}>
          {error ?? status}
        </div>
      )}
    </div>
  );
}
