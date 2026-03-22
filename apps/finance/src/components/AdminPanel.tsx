import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { buildDrawLotteryTx, buildProcessDefaultTx } from '../transactions';
import { suiRpcClient } from '../suiRpcClient';
import { useNetwork } from '../contexts/NetworkContext';
import { PACKAGE_ID, EVE_SCALE } from '../constants';

interface BankFields    { deposits: string; total_shares: string; }
interface LotteryFields { lottery_pool: string; insurance_reserve: string; }

interface Props {
  capId: string;
}

export function AdminPanel({ capId }: Props) {
  const dAppKit = useDAppKit();
  const { network } = useNetwork();

  const [winnerAddress, setWinnerAddress] = useState('');
  const [defaultLoanId, setDefaultLoanId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [pickingWinner, setPickingWinner] = useState(false);

  const overrides = { eveCoinType: network.eveCoinType };
  const formatEve = (v: string) => (Number(v) / Number(EVE_SCALE)).toLocaleString(undefined, { maximumFractionDigits: 2 });

  const { data: bankObj } = useQuery({
    queryKey: ['getObject', network.centralBankId],
    queryFn: () => suiRpcClient.getObject({ id: network.centralBankId, options: { showContent: true } }),
  });
  const { data: lotteryObj } = useQuery({
    queryKey: ['getObject', network.lotterySystemId],
    queryFn: () => suiRpcClient.getObject({ id: network.lotterySystemId, options: { showContent: true } }),
  });
  const bankFields    = bankObj?.data?.content?.dataType === 'moveObject'    ? (bankObj.data.content.fields    as unknown as BankFields)    : null;
  const lotteryFields = lotteryObj?.data?.content?.dataType === 'moveObject' ? (lotteryObj.data.content.fields as unknown as LotteryFields) : null;

  async function handleDrawLottery() {
    setStatus(null); setError(null);
    try {
      await dAppKit.signAndExecuteTransaction({
        transaction: buildDrawLotteryTx(capId, network.lotterySystemId, winnerAddress, overrides),
      });
      setStatus(`Lottery drawn — winnings sent to ${winnerAddress.slice(0, 10)}…`);
      setWinnerAddress('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Draw failed');
    }
  }

  async function pickRandomWinner() {
    setPickingWinner(true);
    setError(null);
    try {
      // Collect all buy_ticket senders, paginating up to 200 txs
      let cursor: string | null | undefined = undefined;
      const senders: string[] = [];
      do {
        const page = await suiRpcClient.queryTransactionBlocks({
          filter: { MoveFunction: { package: PACKAGE_ID, module: 'bank', function: 'buy_ticket' } },
          options: { showInput: true },
          limit: 50,
          cursor,
        });
        for (const tx of page.data) {
          const sender = (tx.transaction as any)?.data?.sender;
          if (sender) senders.push(sender);
        }
        cursor = page.nextCursor ?? undefined;
        if (!page.hasNextPage) break;
      } while (senders.length < 200);

      if (senders.length === 0) {
        setError('No ticket purchases found.');
        return;
      }
      // Each tx = one ticket entry; weight is automatic
      setWinnerAddress(senders[Math.floor(Math.random() * senders.length)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch ticket holders');
    } finally {
      setPickingWinner(false);
    }
  }

  async function handleProcessDefault() {
    setStatus(null); setError(null);
    try {
      await dAppKit.signAndExecuteTransaction({
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

      {/* Fund Balances */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'DEPOSIT POOL',      value: bankFields    ? `${formatEve(bankFields.deposits)} EVE`            : '…' },
          { label: 'PRIZE POOL',        value: lotteryFields ? `${formatEve(lotteryFields.lottery_pool)} EVE`      : '…' },
          { label: 'INSURANCE RESERVE', value: lotteryFields ? `${formatEve(lotteryFields.insurance_reserve)} EVE` : '…' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-eve-surface border border-eve-border rounded-lg px-4 py-3">
            <p className="text-eve-muted font-mono text-xs mb-1">{label}</p>
            <p className="text-white font-mono font-bold text-sm">{value}</p>
          </div>
        ))}
      </div>

      {/* Draw Lottery */}
      <div className="bg-eve-surface border border-eve-border rounded-lg p-5 space-y-4">
        <h3 className="text-white font-semibold tracking-wide">DRAW LOTTERY</h3>
        <p className="text-eve-muted text-xs font-mono">
          Closes the current round, sends {100 - 20}% of the pool to the winner and
          20% to the insurance reserve. Network: <span className="text-eve-gold">{network.label}</span>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={winnerAddress}
            onChange={(e) => setWinnerAddress(e.target.value)}
            placeholder="Winner address (0x…)"
            className="flex-1 bg-eve-bg border border-eve-border rounded px-3 py-2 text-white font-mono text-sm placeholder:text-eve-muted focus:outline-none focus:border-eve-gold"
          />
          <button
            onClick={pickRandomWinner}
            disabled={pickingWinner}
            title="Query all ticket buyers and pick one at random (weighted by number of tickets)"
            className="px-3 py-2 border border-eve-gold/60 text-eve-gold text-xs font-mono rounded hover:bg-eve-gold/10 transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {pickingWinner ? '…' : '🎲 RANDOM'}
          </button>
        </div>
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
