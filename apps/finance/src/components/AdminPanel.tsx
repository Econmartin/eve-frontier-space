import { useState } from 'react';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { buildDrawLotteryTx, buildProcessDefaultTx } from '../transactions';
import { useNetwork } from '../contexts/NetworkContext';

interface Props {
  capId: string;
}

export function AdminPanel({ capId }: Props) {
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const { network } = useNetwork();

  const [winnerAddress, setWinnerAddress] = useState('');
  const [defaultLoanId, setDefaultLoanId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const overrides = { eveCoinType: network.eveCoinType };

  async function handleDrawLottery() {
    setStatus(null); setError(null);
    try {
      await signAndExecute({
        transaction: buildDrawLotteryTx(capId, network.lotterySystemId, winnerAddress, overrides),
      });
      setStatus(`Lottery drawn — winnings sent to ${winnerAddress.slice(0, 10)}…`);
      setWinnerAddress('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Draw failed');
    }
  }

  async function handleProcessDefault() {
    setStatus(null); setError(null);
    try {
      await signAndExecute({
        transaction: buildProcessDefaultTx(
          capId,
          network.centralBankId,
          network.lotterySystemId,
          defaultLoanId,
          overrides,
        ),
      });
      setStatus('Default processed — reserve applied to pool.');
      setDefaultLoanId('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Process default failed');
    }
  }

  return (
    <div className="space-y-6">
      {/* Identity strip */}
      <div className="flex items-center gap-3 bg-eve-surface border border-eve-gold/40 rounded-lg px-4 py-3">
        <span className="text-eve-gold text-xs font-bold tracking-widest">ADMIN</span>
        <span className="text-eve-muted text-xs font-mono truncate">{capId}</span>
      </div>

      {/* Draw Lottery */}
      <div className="bg-eve-surface border border-eve-border rounded-lg p-5 space-y-4">
        <h3 className="text-white font-semibold tracking-wide">DRAW LOTTERY</h3>
        <p className="text-eve-muted text-xs font-mono">
          Closes the current round, sends {100 - 20}% of the pool to the winner and
          20% to the insurance reserve. Network: <span className="text-eve-gold">{network.label}</span>
        </p>
        <input
          type="text"
          value={winnerAddress}
          onChange={(e) => setWinnerAddress(e.target.value)}
          placeholder="Winner address (0x…)"
          className="w-full bg-eve-bg border border-eve-border rounded px-3 py-2 text-white font-mono text-sm placeholder:text-eve-muted focus:outline-none focus:border-eve-gold"
        />
        <button
          onClick={handleDrawLottery}
          disabled={!winnerAddress || winnerAddress.length < 10}
          className="w-full py-2 bg-eve-gold text-eve-bg font-bold rounded hover:bg-eve-gold-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed tracking-wider"
        >
          DRAW
        </button>
      </div>

      {/* Process Default */}
      <div className="bg-eve-surface border border-eve-border rounded-lg p-5 space-y-4">
        <h3 className="text-white font-semibold tracking-wide">PROCESS DEFAULT</h3>
        <p className="text-eve-muted text-xs font-mono">
          Write off a loan that will not be repaid. The insurance reserve covers
          as much of the principal as possible; any remainder is socialised across depositors.
        </p>
        <input
          type="text"
          value={defaultLoanId}
          onChange={(e) => setDefaultLoanId(e.target.value)}
          placeholder="ActiveLoan object ID (0x…)"
          className="w-full bg-eve-bg border border-eve-border rounded px-3 py-2 text-white font-mono text-sm placeholder:text-eve-muted focus:outline-none focus:border-eve-red"
        />
        <button
          onClick={handleProcessDefault}
          disabled={!defaultLoanId || defaultLoanId.length < 10}
          className="w-full py-2 border border-eve-red text-eve-red font-bold rounded hover:bg-eve-red hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed tracking-wider"
        >
          PROCESS DEFAULT
        </button>
      </div>

      {(status || error) && (
        <div className={`rounded-lg px-4 py-3 font-mono text-sm ${error ? 'bg-eve-red/10 border border-eve-red text-eve-red' : 'bg-eve-green/10 border border-eve-green text-eve-green'}`}>
          {error ?? status}
        </div>
      )}
    </div>
  );
}
