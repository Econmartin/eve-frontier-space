import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useConnection, abbreviateAddress } from '@evefrontier/dapp-kit';
import { useSuiBalance } from './hooks/useSuiBalance';
import { BankDashboard } from './components/BankDashboard';
import { LoanDashboard } from './components/LoanDashboard';
import { LotteryDashboard } from './components/LotteryDashboard';
import { AdminPanel } from './components/AdminPanel';
import { useNetwork } from './contexts/NetworkContext';
import { useAdminCap } from './hooks/useAdminCap';
import { NETWORKS, type NetworkId } from './constants';

type Tab = 'bank' | 'loans' | 'lottery' | 'admin';

const USER_TABS: { id: Tab; label: string }[] = [
  { id: 'bank',    label: 'DEPOSIT / WITHDRAW' },
  { id: 'loans',   label: 'BORROW / REPAY' },
  { id: 'lottery', label: 'LOTTERY' },
];

const NETWORK_IDS = Object.keys(NETWORKS) as NetworkId[];

export default function App() {
  const account = useCurrentAccount();
  const { isConnected, handleConnect, handleDisconnect } = useConnection();
  const { isLow: gasLow, refetch: refetchGas } = useSuiBalance();
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('bank');
  const { networkId, setNetworkId } = useNetwork();
  const { capId } = useAdminCap();

  async function requestGas() {
    if (!account) return;
    setFaucetLoading(true);
    setFaucetMsg(null);
    try {
      const res = await fetch('https://faucet.testnet.sui.io/v1/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ FixedAmountRequest: { recipient: account.address } }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(`Faucet ${res.status}: ${body?.error ?? res.statusText}`);
      if (body?.error) throw new Error(body.error);
      setFaucetMsg('✓ SUI incoming — allow ~10s');
      setTimeout(() => { refetchGas(); setFaucetMsg(null); }, 10000);
    } catch (e) {
      setFaucetMsg(`⚠ ${e instanceof Error ? e.message : 'Faucet request failed'}`);
      setTimeout(() => setFaucetMsg(null), 8000);
    } finally {
      setFaucetLoading(false);
    }
  }

  const tabs = capId
    ? [...USER_TABS, { id: 'admin' as Tab, label: 'ADMIN' }]
    : USER_TABS;

  return (
    <div className="min-h-screen bg-eve-bg text-white font-mono">
      <header className="border-b border-eve-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-eve-gold font-bold text-xl tracking-widest">
            EVE FRONTIER BANK
          </span>
          <div className="flex items-center bg-eve-surface border border-eve-border rounded overflow-hidden text-xs">
            {NETWORK_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setNetworkId(id)}
                className={`px-3 py-1 font-bold tracking-wider transition-colors ${
                  networkId === id
                    ? 'bg-eve-gold text-eve-bg'
                    : 'text-eve-muted hover:text-white'
                }`}
              >
                {NETWORKS[id].label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {account && gasLow && (
            <button
              onClick={requestGas}
              disabled={faucetLoading}
              className="px-3 py-2 text-xs font-bold font-mono tracking-wider border rounded transition-colors border-eve-red text-eve-red hover:bg-eve-red hover:text-white disabled:opacity-50"
            >
              {faucetLoading ? '…' : '⛽ GAS'}
            </button>
          )}
          <button
            onClick={isConnected ? handleDisconnect : handleConnect}
            className="px-4 py-2 text-sm font-bold font-mono tracking-wider border rounded transition-colors bg-eve-surface border-eve-border text-eve-gold hover:bg-eve-gold hover:text-eve-bg"
          >
            {isConnected && account ? abbreviateAddress(account.address) : 'CONNECT WALLET'}
          </button>
        </div>
      </header>

      {faucetMsg && (
        <div className={`px-6 py-2 text-xs font-mono text-center ${faucetMsg.startsWith('⚠') ? 'bg-eve-red/10 text-eve-red' : 'bg-eve-green/10 text-eve-green'}`}>
          {faucetMsg}
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {!account && (
          <div className="text-center py-16">
            <p className="text-eve-muted text-sm">
              Connect your EVE Vault wallet to continue.
            </p>
          </div>
        )}

        {account && (
          <>
            <nav className="flex gap-1 bg-eve-surface border border-eve-border rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-3 rounded text-xs font-bold tracking-wider transition-colors ${
                    activeTab === tab.id
                      ? tab.id === 'admin'
                        ? 'bg-eve-gold/20 text-eve-gold border border-eve-gold/40'
                        : 'bg-eve-gold text-eve-bg'
                      : 'text-eve-muted hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {activeTab === 'bank'    && <BankDashboard />}
            {activeTab === 'loans'   && <LoanDashboard />}
            {activeTab === 'lottery' && <LotteryDashboard />}
            {activeTab === 'admin'   && capId && <AdminPanel capId={capId} />}
          </>
        )}
      </main>
    </div>
  );
}
