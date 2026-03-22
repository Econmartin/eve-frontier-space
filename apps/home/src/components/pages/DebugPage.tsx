import { useState, useEffect } from 'react';

const TIMEOUT_MS = 4000;

// JSON-RPC 2.0 method names to try on eveFrontierRpcRequest
const RPC_METHODS = [
  'getContext',
  'getCharacter',
  'getAssembly',
  'getSmartObject',
  'getObjectId',
  'getPlayer',
  'getSolarSystem',
  'getLocation',
  'getItemId',
  'getAssemblyId',
];

type Status = 'pending' | 'ok' | 'error' | 'timeout';

interface Result {
  label: string;
  status: Status;
  value: string;
}

function timeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms / 1000}s — ${label}`)), ms),
    ),
  ]);
}

async function rpcCall(method: string): Promise<Result> {
  const fn = (window as Record<string, unknown>).eveFrontierRpcRequest as ((...a: unknown[]) => unknown) | undefined;
  if (typeof fn !== 'function') return { label: method, status: 'error', value: 'not available' };

  try {
    const raw = fn({ jsonrpc: '2.0', id: 1, method, params: [] });
    const result = await timeout(
      raw instanceof Promise ? raw : Promise.resolve(raw),
      TIMEOUT_MS,
      method,
    );
    return { label: method, status: 'ok', value: JSON.stringify(result, null, 2) };
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    const isTimeout = msg.startsWith('timeout');
    return { label: method, status: isTimeout ? 'timeout' : 'error', value: msg };
  }
}

// Enumerate all keys on an object, including prototype methods
function enumerateObject(obj: unknown): string[] {
  const keys = new Set<string>();
  try {
    for (const k in (obj as object)) keys.add(k);
    Object.getOwnPropertyNames(obj as object).forEach(k => keys.add(k));
    const proto = Object.getPrototypeOf(obj as object);
    if (proto && proto !== Object.prototype) {
      Object.getOwnPropertyNames(proto).forEach(k => keys.add(k));
    }
  } catch { /* ignore */ }
  return Array.from(keys).filter(k => k !== 'constructor');
}

function statusColor(s: Status) {
  if (s === 'ok') return '#ff610a';
  if (s === 'error') return '#facc15';
  if (s === 'timeout') return '#f87171';
  return 'var(--muted-foreground)';
}

function Row({ label, value, color, mono = true }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <div className="flex gap-3 text-[11px]" style={{ letterSpacing: '0.04em', fontFamily: mono ? 'monospace' : undefined }}>
      <span style={{ color: 'var(--muted-foreground)', minWidth: 200, flexShrink: 0 }}>{label}</span>
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
  const [rpcResults, setRpcResults] = useState<Result[]>([]);
  const [rpcDone, setRpcDone] = useState(false);
  const [walletChain, setWalletChain] = useState<string>('reading...');
  const [ccpPythonKeys, setCcpPythonKeys] = useState<string[]>([]);
  const [otherGlobals, setOtherGlobals] = useState<Record<string, string>>({});

  useEffect(() => {
    const w = window as Record<string, unknown>;

    // --- Sync reads (instant) ---

    // WALLET_API_CHAIN — probably a string constant
    try {
      setWalletChain(JSON.stringify(w.WALLET_API_CHAIN) ?? 'undefined');
    } catch {
      setWalletChain('error reading');
    }

    // ccpPython — enumerate its keys/methods since it's an object
    try {
      const keys = enumerateObject(w.ccpPython);
      setCcpPythonKeys(keys);
    } catch (e) {
      setCcpPythonKeys([`error: ${(e as Error).message}`]);
    }

    // All EVE/CCP globals on window
    const globals: Record<string, string> = {};
    try {
      for (const key of Object.keys(w)) {
        if (/eve|ccp|igb|frontier|rpc|wallet|python|capture|release/i.test(key)) {
          globals[key] = typeof w[key];
        }
      }
    } catch { /* ignore */ }
    setOtherGlobals(globals);

    // --- Async: JSON-RPC method probe ---
    (async () => {
      for (const method of RPC_METHODS) {
        const result = await rpcCall(method);
        setRpcResults(prev => [...prev, result]);
        // If we get a real non-error response, stop — we found something
        if (result.status === 'ok' && !result.value.includes('"error"')) break;
      }
      setRpcDone(true);
    })();
  }, []);

  return (
    <div className="dark min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="mx-auto px-6 py-10" style={{ maxWidth: 900 }}>

        {/* Header */}
        <div className="mb-6" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
          <div className="font-mono text-[11px] mb-1" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
            // igb bridge probe — v2
          </div>
          <h1 className="font-heading text-xl font-bold text-white" style={{ letterSpacing: '0.08em' }}>
            EVE FRONTIER <span style={{ color: '#ff610a' }}>DEBUG</span>
          </h1>
          <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
            url: {window.location.href}
          </div>
        </div>

        {/* WALLET_API_CHAIN */}
        <SectionHeader text="// WALLET_API_CHAIN" />
        <Row label="value" value={walletChain} color="#ff610a" />

        {/* ccpPython object keys */}
        <SectionHeader text="// ccpPython — object keys / methods" />
        {ccpPythonKeys.length === 0
          ? <Row label="(none found)" value="" />
          : ccpPythonKeys.map(k => {
              const type = typeof (window as Record<string, unknown>).ccpPython === 'object'
                ? typeof ((window as Record<string, Record<string, unknown>>).ccpPython ?? {})[k]
                : '?';
              return <Row key={k} label={k} value={type} color={type === 'function' ? '#ff610a' : 'var(--muted-foreground)'} />;
            })
        }

        {/* eveFrontierRpcRequest — JSON-RPC method probe */}
        <SectionHeader text={`// eveFrontierRpcRequest — JSON-RPC method probe ${rpcDone ? '(done)' : '(running...)'}`} />
        {rpcResults.length === 0 && (
          <Row label="waiting..." value="" />
        )}
        {rpcResults.map((r, i) => (
          <Row key={i} label={`method: "${r.label}"`} value={`[${r.status.toUpperCase()}] ${r.value}`} color={statusColor(r.status)} />
        ))}

        {/* All EVE/CCP globals */}
        <SectionHeader text="// all eve/ccp globals on window" />
        {Object.entries(otherGlobals).map(([k, v]) => (
          <Row key={k} label={k} value={v} color={v === 'function' ? '#ff610a' : v === 'object' ? '#a78bfa' : 'var(--muted-foreground)'} />
        ))}

      </div>
    </div>
  );
}
