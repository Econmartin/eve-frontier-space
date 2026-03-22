import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { buildBuyTicketTx } from '../transactions';
import { useEveBalance } from '../hooks/useEveBalance';
import { useNetwork } from '../contexts/NetworkContext';
import { PACKAGE_ID, EVE_SCALE } from '../constants';

interface LotteryState {
  ticket_price:      string;
  house_edge_bps:    string;
  lottery_pool:      { value: string };
  insurance_reserve: { value: string };
}

export function LotteryDashboard() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const dAppKit = useDAppKit();
  const { network } = useNetwork();
  const { formattedBalance, largestCoinId } = useEveBalance();

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const { data: lotteryObj, isLoading: lotteryLoading } = useQuery({
    queryKey: ['getObject', network.lotterySystemId],
    queryFn: () => client.getObject({ id: network.lotterySystemId, options: { showContent: true } }),
  });

  const lotteryFields =
    lotteryObj?.data?.content?.dataType === 'moveObject'
      ? (lotteryObj.data.content.fields as unknown as LotteryState)
      : null;

  const ticketPrice = lotteryFields ? BigInt(lotteryFields.ticket_price) : 1n * EVE_SCALE;
  const houseEdgePct = lotteryFields ? Number(lotteryFields.house_edge_bps) / 100 : 20;

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
      );
      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      setStatus(`Ticket purchased for ${formatEve(ticketPrice)} EVE. Good luck, pilot.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-eve-surface border border-eve-border rounded-lg px-4 py-3">
        <span className="text-eve-muted text-sm font-mono">WALLET BALANCE</span>
        <span className="text-eve-gold font-mono font-bold text-lg">{formattedBalance} EVE</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'TICKET PRICE',       value: lotteryLoading ? '…' : `${formatEve(ticketPrice)} EVE` },
          { label: 'PRIZE POOL',         value: lotteryLoading ? '…' : `${formatEve(lotteryFields?.lottery_pool.value ?? '0')} EVE` },
          { label: 'INSURANCE RESERVE',  value: lotteryLoading ? '…' : `${formatEve(lotteryFields?.insurance_reserve.value ?? '0')} EVE` },
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
        <button
          onClick={handleBuyTicket}
          disabled={!account || !largestCoinId}
          className="w-full py-3 bg-gradient-to-r from-eve-gold to-eve-gold-dim text-eve-bg font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed tracking-widest"
        >
          {account ? `BUY TICKET — ${formatEve(ticketPrice)} EVE` : 'CONNECT WALLET'}
        </button>
      </div>

      <OwnedTickets />

      {(status || error) && (
        <div className={`rounded-lg px-4 py-3 font-mono text-sm ${error ? 'bg-eve-red/10 border border-eve-red text-eve-red' : 'bg-eve-green/10 border border-eve-green text-eve-green'}`}>
          {error ?? status}
        </div>
      )}
    </div>
  );
}

function OwnedTickets() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const LOTTERY_TICKET_TYPE = `${PACKAGE_ID}::bank::LotteryTicket`;

  const { data, isPending } = useQuery({
    queryKey: ['getOwnedObjects', account?.address, LOTTERY_TICKET_TYPE],
    queryFn: () => client.getOwnedObjects({
      owner:   account!.address,
      filter:  { StructType: LOTTERY_TICKET_TYPE },
      options: { showType: true },
    }),
    enabled: !!account?.address,
  });

  const tickets = data?.data ?? [];
  if (isPending || tickets.length === 0) return null;

  return (
    <div className="bg-eve-surface border border-eve-border rounded-lg p-5 space-y-2">
      <h3 className="text-white font-semibold tracking-wide">YOUR TICKETS ({tickets.length})</h3>
      {tickets.map((t) => (
        <p key={t.data?.objectId} className="text-eve-muted font-mono text-xs truncate">
          {t.data?.objectId}
        </p>
      ))}
    </div>
  );
}
