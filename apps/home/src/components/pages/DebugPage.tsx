import { useState, useEffect } from 'react';

// ---------------------------------------------------------
// RPC method names to try — camelCase and snake_case variants
// Python backends typically use snake_case
// ---------------------------------------------------------
const RPC_METHODS = [
  // snake_case (Python style)
  'get_assembly', 'get_current_assembly', 'get_active_assembly', 'get_assembly_id',
  'get_character', 'get_active_character', 'get_character_id',
  'get_context', 'get_state', 'get_location', 'get_solar_system',
  'get_item_id', 'get_object_id', 'get_wallet_address',
  // prefixed variants
  'eve_getAssembly', 'eve_getContext', 'eve_getCharacter',
  'frontier_getContext', 'frontier_getAssembly',
  // short/simple
  'ping', 'version', 'info',
];

// callWallet — try wallet-specific method names
const WALLET_METHODS = [
  'get_address', 'getAddress', 'get_account', 'getAccount',
  'get_wallet', 'sign', 'connect', 'wallet_getAddress',
  'sui_getAddress', 'get_public_key', 'getPublicKey',
];

type Status = 'ok' | 'error' | 'timeout' | 'pending';

interface Result { label: string; status: Status; value: string }

// Manual poll of _eveFrontierRpcRequest(requestId, request)
// Returns up to maxPolls intermediate responses so we can see the shape
async function pollRaw(request: unknown, maxPolls = 3, intervalMs = 500): Promise<Result[]> {
  const fn = (window as Record<string, unknown>)._eveFrontierRpcRequest as ((...a: unknown[]) => Promise<unknown>) | undefined;
  if (typeof fn !== 'function') return [{ label: 'raw poll', status: 'error', value: '_eveFrontierRpcRequest not available' }];

  const results: Result[] = [];
  let requestId: unknown = null;

  for (let i = 0; i < maxPolls; i++) {
    try {
      const response = await Promise.race([
        fn(requestId, request),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]) as { id?: unknown; status?: string; response?: unknown };

      results.push({
        label: `poll #${i + 1} (id=${JSON.stringify(requestId)})`,
        status: response?.status === 'done' ? 'ok' : response?.status === 'failed' ? 'error' : 'pending',
        value: JSON.stringify(response, null, 2),
      });

      if (requestId === null && response?.id !== undefined) requestId = response.id;
      if (response?.status === 'done' || response?.status === 'failed') break;

      await new Promise(r => setTimeout(r, intervalMs));
    } catch (e) {
      results.push({ label: `poll #${i + 1}`, status: 'error', value: (e as Error).message });
      break;
    }
  }
  return results;
}

async function rpcCall(fn: unknown, method: string, params: unknown[] = []): Promise<Result> {
  if (typeof fn !== 'function') return { label: method, status: 'error', value: 'not available' };
  try {
    const raw = (fn as (...a: unknown[]) => unknown)({ jsonrpc: '2.0', id: 1, method, params });
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
  if (s === 'ok') return '#ff610a';
  if (s === 'pending') return '#a78bfa';
  if (s === 'timeout') return '#f87171';
  return '#facc15';
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
  const [rawPolls, setRawPolls] = useState<Result[]>([]);
  const [rpcResults, setRpcResults] = useState<Result[]>([]);
  const [rpcDone, setRpcDone] = useState(false);
  const [walletResults, setWalletResults] = useState<Result[]>([]);
  const [walletDone, setWalletDone] = useState(false);

  useEffect(() => {
    const w = window as Record<string, unknown>;

    // --- Raw poll: call _eveFrontierRpcRequest directly to see response shape ---
    (async () => {
      const polls = await pollRaw({ jsonrpc: '2.0', id: 1, method: 'get_context', params: [] });
      setRawPolls(polls);
    })();

    // --- eveFrontierRpcRequest: snake_case + prefixed method names ---
    (async () => {
      const fn = w.eveFrontierRpcRequest;
      for (const method of RPC_METHODS) {
        const r = await rpcCall(fn, method);
        setRpcResults(prev => [...prev, r]);
        if (r.status === 'ok' && !r.value.includes('"error"')) break;
      }
      setRpcDone(true);
    })();

    // --- callWallet: wallet method names ---
    (async () => {
      const fn = w.callWallet;
      for (const method of WALLET_METHODS) {
        const r = await rpcCall(fn, method);
        setWalletResults(prev => [...prev, r]);
        if (r.status === 'ok' && !r.value.includes('"error"')) break;
      }
      setWalletDone(true);
    })();
  }, []);

  return (
    <div className="dark min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="mx-auto px-6 py-10" style={{ maxWidth: 960 }}>

        <div className="mb-6" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
          <div className="font-mono text-[11px] mb-1" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>// igb bridge probe — v6</div>
          <h1 className="font-heading text-xl font-bold text-white" style={{ letterSpacing: '0.08em' }}>
            EVE FRONTIER <span style={{ color: '#ff610a' }}>DEBUG</span>
          </h1>
          <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>{window.location.href}</div>
        </div>

        {/* Raw _eveFrontierRpcRequest poll — see the full response shape */}
        <SectionHeader text="// _eveFrontierRpcRequest — raw poll (see response shape)" />
        <div className="font-mono text-[10px] mb-2" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
          calling directly with get_context — captures id + status even while pending
        </div>
        {rawPolls.length === 0 ? <Row label="polling..." value="" /> : rawPolls.map((r, i) => (
          <Row key={i} label={r.label} value={`[${r.status.toUpperCase()}] ${r.value}`} color={statusColor(r.status)} />
        ))}

        {/* eveFrontierRpcRequest — snake_case + prefixed methods */}
        <SectionHeader text={`// eveFrontierRpcRequest — snake_case + prefixed methods ${rpcDone ? '(done)' : '(running...)'}`} />
        {rpcResults.map((r, i) => (
          <Row key={i} label={`"${r.label}"`} value={`[${r.status.toUpperCase()}] ${r.value}`} color={statusColor(r.status)} />
        ))}

        {/* callWallet */}
        <SectionHeader text={`// callWallet — wallet methods ${walletDone ? '(done)' : '(running...)'}`} />
        {walletResults.map((r, i) => (
          <Row key={i} label={`"${r.label}"`} value={`[${r.status.toUpperCase()}] ${r.value}`} color={statusColor(r.status)} />
        ))}

      </div>
    </div>
  );
}
