import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { suiRpcClient } from '../suiRpcClient';
import { buildBuyTicketTx, buildBurnExpiredTicketsTx } from '../transactions';
import { useEveBalance } from '../hooks/useEveBalance';
import { useNetwork } from '../contexts/NetworkContext';
import { PACKAGE_ID, EVE_SCALE } from '../constants';

interface LotteryState {
  ticket_price:      string;
  house_edge_bps:    string;
  lottery_pool:      string;
  insurance_reserve: string;
  current_round:     string;
}

export function LotteryDashboard() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const { network } = useNetwork();
  const { formattedBalance, largestCoinId } = useEveBalance();

  const [qty, setQty]       = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const { data: lotteryObj, isLoading: lotteryLoading } = useQuery({
    queryKey: ['getObject', network.lotterySystemId],
    queryFn: () => suiRpcClient.getObject({ id: network.lotterySystemId, options: { showContent: true } }),
  });

  const lotteryFields =
    lotteryObj?.data?.content?.dataType === 'moveObject'
      ? (lotteryObj.data.content.fields as unknown as LotteryState)
      : null;

  const ticketPrice   = lotteryFields ? BigInt(lotteryFields.ticket_price) : 1n * EVE_SCALE;
  const houseEdgePct  = lotteryFields ? Number(lotteryFields.house_edge_bps) / 100 : 20;
  const currentRound  = lotteryFields ? Number(lotteryFields.current_round) : null;

  const formatEve = (mist: string | bigint) =>
    (Number(mist) / Number(EVE_SCALE)).toLocaleString(undefined, { maximumFractionDigits: 2 });

  async function handleBuyTicket() {
    if (!account || !largestCoinId) return;
    setStatus(null); setError(null);
    try {
      const tx = buildBuyTicketTx(
        network.lotterySystemId,
        largestCoinId,
        ticketPrice,
        { eveCoinType: network.eveCoinType, sender: account.address },
        qty,
      );
      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      await queryClient.invalidateQueries();
      setStatus(`${qty} ticket${qty > 1 ? 's' : ''} purchased for ${formatEve(ticketPrice * BigInt(qty))} EVE. Good luck, pilot.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between bg-eve-surface border border-eve-border rounded-lg px-4 py-3">
          <span className="text-eve-muted text-sm font-mono">WALLET BALANCE</span>
          <span className="text-eve-gold font-mono font-bold">{formattedBalance} EVE</span>
        </div>
        <div className="flex items-center justify-between bg-eve-surface border border-eve-border rounded-lg px-4 py-3">
          <span className="text-eve-muted text-sm font-mono">ROUND</span>
          <span className="text-white font-mono font-bold">{lotteryLoading ? '…' : `#${currentRound ?? '—'}`}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'TICKET PRICE', value: lotteryLoading ? '…' : `${formatEve(ticketPrice)} EVE` },
          { label: 'PRIZE POOL',   value: lotteryLoading ? '…' : `${formatEve(lotteryFields?.lottery_pool ?? '0')} EVE` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-eve-surface border border-eve-border rounded-lg px-4 py-3">
            <p className="text-eve-muted font-mono text-xs mb-1">{label}</p>
            <p className="text-white font-mono font-bold text-sm">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-eve-surface border border-eve-border rounded-lg p-5 space-y-4">
        <h3 className="text-white font-semibold tracking-wide">BUY A TICKET</h3>
        <p className="text-eve-muted text-sm font-mono">
          {houseEdgePct}% of every draw funds the Insurance Reserve — protecting
          depositors from loan defaults. The remaining {100 - houseEdgePct}% goes
          to the lucky winner.
        </p>
        <div className="flex gap-3">
          <input
            type="number" min="1" max="20" step="1"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
            className="w-20 bg-eve-bg border border-eve-border rounded px-3 py-2 text-white font-mono text-sm text-center focus:outline-none focus:border-eve-gold"
          />
          <button
            onClick={handleBuyTicket}
            disabled={!account || !largestCoinId}
            className="flex-1 py-3 bg-gradient-to-r from-eve-gold to-eve-gold-dim text-eve-bg font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed tracking-widest"
          >
            {account ? `BUY ${qty > 1 ? `${qty}x ` : ''}TICKET${qty > 1 ? 'S' : ''} — ${formatEve(ticketPrice * BigInt(qty))} EVE` : 'CONNECT WALLET'}
          </button>
        </div>
      </div>

      {currentRound !== null && (
        <OwnedTickets
          currentRound={currentRound}
          lotteryId={network.lotterySystemId}
          eveCoinType={network.eveCoinType}
          onBurned={(msg) => { setStatus(msg); queryClient.invalidateQueries(); }}
          onError={(msg) => setError(msg)}
          dAppKit={dAppKit}
        />
      )}

      {(status || error) && (
        <div className={`rounded-lg px-4 py-3 font-mono text-sm ${error ? 'bg-eve-red/10 border border-eve-red text-eve-red' : 'bg-eve-green/10 border border-eve-green text-eve-green'}`}>
          {error ?? status}
        </div>
      )}
    </div>
  );
}

interface OwnedTicketsProps {
  currentRound: number;
  lotteryId:    string;
  eveCoinType:  string;
  dAppKit:      ReturnType<typeof import('@mysten/dapp-kit-react').useDAppKit>;
  onBurned:     (msg: string) => void;
  onError:      (msg: string) => void;
}

function OwnedTickets({ currentRound, lotteryId, eveCoinType, dAppKit, onBurned, onError }: OwnedTicketsProps) {
  const account = useCurrentAccount();
  const [burning, setBurning] = useState(false);
  const LOTTERY_TICKET_TYPE = `${PACKAGE_ID}::bank::LotteryTicket`;

  const { data, isPending } = useQuery({
    queryKey: ['getOwnedObjects', account?.address, LOTTERY_TICKET_TYPE],
    queryFn: () => suiRpcClient.getOwnedObjects({
      owner:   account!.address,
      filter:  { StructType: LOTTERY_TICKET_TYPE },
      options: { showContent: true },
    }),
    enabled: !!account?.address,
  });

  const tickets = (data?.data ?? []).map((t) => {
    const fields = t.data?.content?.dataType === 'moveObject'
      ? (t.data.content.fields as Record<string, string>)
      : {};
    return { objectId: t.data?.objectId ?? '', round: Number(fields['round'] ?? 0) };
  });

  const active  = tickets.filter((t) => t.round === currentRound);
  const expired = tickets.filter((t) => t.round < currentRound);

  if (isPending || tickets.length === 0) return null;

  async function handleBurnExpired() {
    if (expired.length === 0) return;
    setBurning(true);
    try {
      await dAppKit.signAndExecuteTransaction({
        transaction: buildBurnExpiredTicketsTx(
          lotteryId,
          expired.map((t) => t.objectId),
          { eveCoinType },
        ),
      });
      onBurned(`Burned ${expired.length} expired ticket${expired.length > 1 ? 's' : ''} — storage rebate claimed.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Burn failed');
    } finally {
      setBurning(false);
    }
  }

  return (
    <div className="bg-eve-surface border border-eve-border rounded-lg p-5 space-y-3">
      {active.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-white font-semibold tracking-wide">
            ROUND #{currentRound} TICKETS ({active.length})
          </h3>
          {active.map((t) => (
            <p key={t.objectId} className="text-eve-muted font-mono text-xs truncate">{t.objectId}</p>
          ))}
        </div>
      )}

      {expired.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-eve-muted font-semibold tracking-wide text-sm">
              EXPIRED TICKETS ({expired.length})
            </h3>
            <button
              onClick={handleBurnExpired}
              disabled={burning}
              className="px-3 py-1 border border-eve-muted/40 text-eve-muted text-xs font-mono rounded hover:border-eve-red hover:text-eve-red transition-colors disabled:opacity-40"
            >
              {burning ? '…' : 'BURN ALL'}
            </button>
          </div>
          {expired.map((t) => (
            <p key={t.objectId} className="text-eve-muted/50 font-mono text-xs truncate line-through">
              {t.objectId}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
