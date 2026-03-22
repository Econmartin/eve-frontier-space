import { useState, useEffect } from 'react';

// Sui wallet standard methods — connect confirmed working
// https://docs.sui.io/standards/wallet-standard
const WALLET_METHODS = [
  'connect',                        // ✅ confirmed — returns suiAddress, pubkey, chains
  'disconnect',
  'getAccounts',
  'sui:connect',
  'sui:disconnect',
  'sui:getAccounts',
  'sui:signTransaction',
  'sui:signPersonalMessage',
  'sui:signAndExecuteTransaction',
  'sui:reportTransactionEffects',
  // EVE / frontier variants
  'getCharacter',
  'getAssembly',
  'getContext',
  'getItemId',
];

// eveFrontierRpcRequest — long-shot attempts, may only work from on-chain registered dapp
const RPC_METHODS = [
  'getSmartAssembly', 'getAssemblyContext', 'getDappContext',
  'getRegisteredAssembly', 'getLinkedAssembly',
  'getCurrentCharacter', 'getOwner',
  'sui:getAddress',
];

type Status = 'ok' | 'error' | 'timeout';
interface Result { label: string; status: Status; value: string }

async function jsonRpcCall(fn: unknown, method: string): Promise<Result> {
  if (typeof fn !== 'function') return { label: method, status: 'error', value: 'not available' };
  try {
    const raw = (fn as (...a: unknown[]) => unknown)({ jsonrpc: '2.0', id: 1, method, params: [] });
    const result = await Promise.race([
      raw instanceof Promise ? raw : Promise.resolve(raw),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    return { label: method, status: 'ok', value: JSON.stringify(result, null, 2) };
  } catch (e) {
    const msg = (e as Error).message;
    return { label: method, status: msg === 'timeout' ? 'timeout' : 'error', value: msg };
  }
}

function statusColor(s: Status) {
  return s === 'ok' ? '#ff610a' : s === 'timeout' ? '#f87171' : '#facc15';
}

function isSuccess(r: Result) {
  return r.status === 'ok' && !r.value.includes('"error"');
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex gap-3 font-mono text-[11px] mb-1" style={{ letterSpacing: '0.03em' }}>
      <span style={{ color: 'var(--muted-foreground)', minWidth: 260, flexShrink: 0 }}>{label}</span>
      <span style={{ color: color ?? 'var(--muted-foreground)', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{value}</span>
    </div>
  );
}

function SectionHeader({ text }: { text: string }) {
  return (
    <div className="font-mono text-[11px] mt-8 mb-3 pt-6" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em', borderTop: '1px solid var(--border)' }}>
      {text}
    </div>
  );
}

export function DebugPage() {
  const [walletResults, setWalletResults] = useState<Result[]>([]);
  const [walletDone, setWalletDone] = useState(false);
  const [rpcResults, setRpcResults] = useState<Result[]>([]);
  const [rpcDone, setRpcDone] = useState(false);

  useEffect(() => {
    const w = window as Record<string, unknown>;

    // callWallet — try all Sui wallet standard methods
    (async () => {
      const fn = w.callWallet;
      for (const method of WALLET_METHODS) {
        const r = await jsonRpcCall(fn, method);
        setWalletResults(prev => [...prev, r]);
        // Don't stop on success — we want to map all working methods
      }
      setWalletDone(true);
    })();

    // eveFrontierRpcRequest — long-shot attempts
    (async () => {
      const fn = w.eveFrontierRpcRequest;
      for (const method of RPC_METHODS) {
        const r = await jsonRpcCall(fn, method);
        setRpcResults(prev => [...prev, r]);
      }
      setRpcDone(true);
    })();
  }, []);

  // Separate out hits from misses for clarity
  const walletHits = walletResults.filter(isSuccess);
  const walletMisses = walletResults.filter(r => !isSuccess(r));

  return (
    <div className="dark min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="mx-auto px-6 py-10" style={{ maxWidth: 960 }}>

        <div className="mb-6" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
          <div className="font-mono text-[11px] mb-1" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>// igb bridge probe — v7</div>
          <h1 className="font-heading text-xl font-bold text-white" style={{ letterSpacing: '0.08em' }}>
            EVE FRONTIER <span style={{ color: '#ff610a' }}>DEBUG</span>
          </h1>
          <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>{window.location.href}</div>
        </div>

        {/* callWallet hits */}
        <SectionHeader text={`// callWallet — hits ${walletDone ? `(${walletHits.length} found)` : '(running...)'}`} />
        {walletHits.length === 0 && walletDone && <Row label="(none yet)" value="" />}
        {walletHits.map((r, i) => (
          <Row key={i} label={`✓ "${r.label}"`} value={r.value} color="#ff610a" />
        ))}

        {/* callWallet misses */}
        {walletDone && walletMisses.length > 0 && (
          <>
            <SectionHeader text="// callWallet — misses" />
            {walletMisses.map((r, i) => (
              <Row key={i} label={`"${r.label}"`} value={`[${r.status.toUpperCase()}] ${r.value}`} color={statusColor(r.status)} />
            ))}
          </>
        )}

        {/* eveFrontierRpcRequest */}
        <SectionHeader text={`// eveFrontierRpcRequest ${rpcDone ? '(done)' : '(running...)'}`} />
        {rpcResults.map((r, i) => (
          <Row key={i} label={`"${r.label}"`} value={`[${r.status.toUpperCase()}] ${r.value}`} color={isSuccess(r) ? '#ff610a' : statusColor(r.status)} />
        ))}

      </div>
    </div>
  );
}
