import { useState, useEffect } from 'react';

const TIMEOUT_MS = 4000;

// JSON-RPC method names to try — expanding based on EVE Frontier naming conventions
const RPC_METHODS = [
  // EVE Frontier specific
  'getSmartAssembly', 'getCurrentAssembly', 'getActiveAssembly', 'getAssemblyInfo',
  'getCharacterInfo', 'getCharacterData', 'getActiveCharacter',
  'getSolarSystemInfo', 'getLocationInfo',
  // Generic / short names
  'context', 'assembly', 'character', 'player', 'location', 'state',
  // Wallet related
  'getWallet', 'getAddress', 'getAccount',
];

// ccpPython.pythonCall arg patterns to try
// In EVE Online's IGB the pattern was typically (serviceName, methodName, ...args)
const PYTHON_CALL_ATTEMPTS = [
  [],
  ['sm'],
  ['sm', 'GetService'],
  ['viewState', 'GetActiveView'],
  ['sceneManager', 'GetCurrentScene'],
  ['assembly', 'GetCurrentAssembly'],
  ['character', 'GetActiveCharacter'],
  ['igb', 'GetContext'],
  ['dapp', 'GetContext'],
];

type Status = 'ok' | 'error' | 'timeout';

interface Result {
  label: string;
  status: Status;
  value: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms / 1000}s`)), ms),
    ),
  ]);
}

async function callFn(fn: unknown, args: unknown[], label: string): Promise<Result> {
  if (typeof fn !== 'function') return { label, status: 'error', value: 'not a function' };
  try {
    const raw = (fn as (...a: unknown[]) => unknown)(...args);
    const result = await withTimeout(
      raw instanceof Promise ? raw : Promise.resolve(raw),
      TIMEOUT_MS,
    );
    return { label, status: 'ok', value: JSON.stringify(result, null, 2) };
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    return { label, status: msg.startsWith('timeout') ? 'timeout' : 'error', value: msg };
  }
}

function statusColor(s: Status) {
  if (s === 'ok') return '#ff610a';
  if (s === 'error') return '#facc15';
  return '#f87171';
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex gap-3 font-mono text-[11px] mb-1" style={{ letterSpacing: '0.04em' }}>
      <span style={{ color: 'var(--muted-foreground)', minWidth: 220, flexShrink: 0 }}>{label}</span>
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
  const [walletChain, setWalletChain] = useState('reading...');
  const [ccpKeys, setCcpKeys] = useState<string[]>([]);
  const [pythonResults, setPythonResults] = useState<Result[]>([]);
  const [pythonDone, setPythonDone] = useState(false);
  const [rpcResults, setRpcResults] = useState<Result[]>([]);
  const [rpcDone, setRpcDone] = useState(false);
  const [otherGlobals, setOtherGlobals] = useState<Record<string, string>>({});

  useEffect(() => {
    const w = window as Record<string, unknown>;

    // Sync reads
    try { setWalletChain(JSON.stringify(w.WALLET_API_CHAIN)); } catch { setWalletChain('error'); }

    // ccpPython keys
    try {
      const obj = w.ccpPython as Record<string, unknown>;
      const keys: string[] = [];
      for (const k in obj) keys.push(k);
      Object.getOwnPropertyNames(obj).forEach(k => { if (!keys.includes(k)) keys.push(k); });
      const proto = Object.getPrototypeOf(obj);
      if (proto && proto !== Object.prototype) {
        Object.getOwnPropertyNames(proto).filter(k => k !== 'constructor').forEach(k => {
          if (!keys.includes(k)) keys.push(k);
        });
      }
      setCcpKeys(keys);
    } catch (e) { setCcpKeys([`error: ${(e as Error).message}`]); }

    // All EVE/CCP globals
    const globals: Record<string, string> = {};
    try {
      for (const key of Object.keys(w)) {
        if (/eve|ccp|igb|frontier|rpc|wallet|python|capture|release/i.test(key)) {
          globals[key] = typeof w[key];
        }
      }
    } catch { /* ignore */ }
    setOtherGlobals(globals);

    // Async: ccpPython.pythonCall probe
    (async () => {
      const obj = (w.ccpPython as Record<string, unknown> | undefined);
      const fn = obj?.pythonCall;
      for (const args of PYTHON_CALL_ATTEMPTS) {
        const label = args.length === 0 ? 'no args' : args.map(a => JSON.stringify(a)).join(', ');
        const result = await callFn(fn, args, label);
        setPythonResults(prev => [...prev, result]);
        if (result.status === 'ok' && result.value !== 'null' && result.value !== 'undefined') break;
      }
      setPythonDone(true);
    })();

    // Async: eveFrontierRpcRequest JSON-RPC probe
    (async () => {
      const fn = w.eveFrontierRpcRequest;
      for (const method of RPC_METHODS) {
        const result = await callFn(fn, [{ jsonrpc: '2.0', id: 1, method, params: [] }], method);
        setRpcResults(prev => [...prev, result]);
        // Stop if we get a result without an error field
        if (result.status === 'ok' && !result.value.includes('"error"')) break;
      }
      setRpcDone(true);
    })();
  }, []);

  return (
    <div className="dark min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="mx-auto px-6 py-10" style={{ maxWidth: 960 }}>

        <div className="mb-6" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
          <div className="font-mono text-[11px] mb-1" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>// igb bridge probe — v3</div>
          <h1 className="font-heading text-xl font-bold text-white" style={{ letterSpacing: '0.08em' }}>
            EVE FRONTIER <span style={{ color: '#ff610a' }}>DEBUG</span>
          </h1>
          <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
            {window.location.href}
          </div>
        </div>

        {/* WALLET_API_CHAIN */}
        <SectionHeader text="// WALLET_API_CHAIN" />
        <Row label="value" value={walletChain} color="#ff610a" />

        {/* ccpPython keys */}
        <SectionHeader text="// ccpPython — methods" />
        {ccpKeys.length === 0
          ? <Row label="(not available)" value="" />
          : ccpKeys.map(k => {
              const type = typeof ((window as Record<string, Record<string, unknown>>).ccpPython ?? {})[k];
              return <Row key={k} label={k} value={type} color={type === 'function' ? '#ff610a' : 'var(--muted-foreground)'} />;
            })
        }

        {/* ccpPython.pythonCall probe */}
        <SectionHeader text={`// ccpPython.pythonCall — call probe ${pythonDone ? '(done)' : '(running...)'}`} />
        {pythonResults.length === 0 && <Row label="waiting..." value="" />}
        {pythonResults.map((r, i) => (
          <Row key={i} label={`(${r.label})`} value={`[${r.status.toUpperCase()}] ${r.value}`} color={statusColor(r.status)} />
        ))}

        {/* eveFrontierRpcRequest JSON-RPC probe */}
        <SectionHeader text={`// eveFrontierRpcRequest — JSON-RPC methods ${rpcDone ? '(done)' : '(running...)'}`} />
        {rpcResults.length === 0 && <Row label="waiting..." value="" />}
        {rpcResults.map((r, i) => (
          <Row key={i} label={`method: "${r.label}"`} value={`[${r.status.toUpperCase()}] ${r.value}`} color={statusColor(r.status)} />
        ))}

        {/* All EVE/CCP globals */}
        <SectionHeader text="// eve/ccp globals on window" />
        {Object.entries(otherGlobals).map(([k, v]) => (
          <Row key={k} label={k} value={v} color={v === 'function' ? '#ff610a' : v === 'object' ? '#a78bfa' : '#e5e7eb'} />
        ))}

      </div>
    </div>
  );
}
