import { useState, useEffect } from 'react';

const TIMEOUT_MS = 4000;

const ALL_FUNCTIONS = [
  'eveFrontierRpcRequest',
  '_eveFrontierRpcRequest',
  'callWallet',
  '__pythonCall',
  'captureEvents',
  'releaseEvents',
] as const;

const CCP_PYTHON_METHODS = ['pythonCall', 'pythonReply'] as const;

// JSON-RPC methods to try
const RPC_METHODS = [
  'getSmartAssembly', 'getCurrentAssembly', 'getActiveAssembly', 'getAssemblyInfo',
  'getCharacterInfo', 'getCharacterData', 'getActiveCharacter',
  'getSolarSystemInfo', 'getLocationInfo',
  'context', 'assembly', 'character', 'player', 'location', 'state',
  'getWallet', 'getAddress', 'getAccount',
];

// ccpPython.pythonCall arg attempts — including a callback as last arg
// (it may be callback-based rather than promise-based)
const PYTHON_ATTEMPTS: { label: string; args: unknown[] }[] = [
  { label: 'callback only',                  args: [() => 'cb'] },
  { label: 'sm + callback',                  args: ['sm', () => 'cb'] },
  { label: 'assembly + GetCurrent + cb',     args: ['assembly', 'GetCurrentAssembly', () => 'cb'] },
  { label: 'character + GetActive + cb',     args: ['character', 'GetActiveCharacter', () => 'cb'] },
  { label: 'igb + GetContext + cb',          args: ['igb', 'GetContext', () => 'cb'] },
  { label: 'dapp + GetContext + cb',         args: ['dapp', 'GetContext', () => 'cb'] },
  { label: 'viewState + GetActiveView + cb', args: ['viewState', 'GetActiveView', () => 'cb'] },
];

type Status = 'ok' | 'error' | 'timeout';

interface Result { label: string; status: Status; value: string }

interface FnInfo {
  name: string;
  exists: boolean;
  type: string;
  length?: number;          // number of declared params
  source: string;           // fn.toString() — may be native or real source
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms / 1000}s`)), ms)),
  ]);
}

async function callFn(fn: unknown, args: unknown[], label: string): Promise<Result> {
  if (typeof fn !== 'function') return { label, status: 'error', value: 'not a function' };
  try {
    const raw = (fn as (...a: unknown[]) => unknown)(...args);
    const result = await withTimeout(raw instanceof Promise ? raw : Promise.resolve(raw), TIMEOUT_MS);
    return { label, status: 'ok', value: JSON.stringify(result, null, 2) };
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    return { label, status: msg.startsWith('timeout') ? 'timeout' : 'error', value: msg };
  }
}

function inspectFn(name: string, fn: unknown): FnInfo {
  if (typeof fn !== 'function') {
    return { name, exists: fn !== undefined, type: typeof fn, source: String(fn) };
  }
  let source = '';
  try { source = fn.toString(); } catch { source = '(could not read source)'; }
  return {
    name,
    exists: true,
    type: 'function',
    length: (fn as { length?: number }).length,
    source,
  };
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex gap-3 font-mono text-[11px] mb-1" style={{ letterSpacing: '0.04em' }}>
      <span style={{ color: 'var(--muted-foreground)', minWidth: 230, flexShrink: 0 }}>{label}</span>
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

function statusColor(s: Status) {
  return s === 'ok' ? '#ff610a' : s === 'timeout' ? '#f87171' : '#facc15';
}

export function DebugPage() {
  const [fnInfos, setFnInfos] = useState<FnInfo[]>([]);
  const [ccpInfos, setCcpInfos] = useState<FnInfo[]>([]);
  const [ccpStr, setCcpStr] = useState('');
  const [pythonResults, setPythonResults] = useState<Result[]>([]);
  const [pythonDone, setPythonDone] = useState(false);
  const [pythonReplyCalled, setPythonReplyCalled] = useState(false);
  const [rpcResults, setRpcResults] = useState<Result[]>([]);
  const [rpcDone, setRpcDone] = useState(false);
  const [walletChain, setWalletChain] = useState('');
  const [otherGlobals, setOtherGlobals] = useState<Record<string, string>>({});

  useEffect(() => {
    const w = window as Record<string, unknown>;

    // --- Sync: inspect all top-level bridge functions ---
    setFnInfos(ALL_FUNCTIONS.map(name => inspectFn(name, w[name])));

    // --- Sync: inspect ccpPython and its methods ---
    try {
      setCcpStr(JSON.stringify(w.ccpPython) ?? String(w.ccpPython));
    } catch { setCcpStr('(not serialisable)'); }

    const ccp = w.ccpPython as Record<string, unknown> | undefined;
    setCcpInfos(CCP_PYTHON_METHODS.map(m => inspectFn(m, ccp?.[m])));

    // --- Sync: WALLET_API_CHAIN + other globals ---
    try { setWalletChain(JSON.stringify(w.WALLET_API_CHAIN)); } catch { setWalletChain('error'); }
    const globals: Record<string, string> = {};
    try {
      for (const key of Object.keys(w)) {
        if (/eve|ccp|igb|frontier|rpc|wallet|python|capture|release/i.test(key)) {
          globals[key] = typeof w[key];
        }
      }
    } catch { /* ignore */ }
    setOtherGlobals(globals);

    // --- Async: hook pythonReply BEFORE calling pythonCall ---
    // If it's a callback system, pythonReply may fire with the response
    try {
      const ccp2 = w.ccpPython as Record<string, unknown> | undefined;
      if (typeof ccp2?.pythonReply === 'function') {
        (ccp2.pythonReply as (...a: unknown[]) => unknown)((...args: unknown[]) => {
          setPythonReplyCalled(true);
          setPythonResults(prev => [...prev, {
            label: 'pythonReply callback fired',
            status: 'ok',
            value: JSON.stringify(args, null, 2),
          }]);
        });
      }
    } catch { /* ignore */ }

    // --- Async: ccpPython.pythonCall probe ---
    (async () => {
      const fn = (w.ccpPython as Record<string, unknown> | undefined)?.pythonCall;
      for (const attempt of PYTHON_ATTEMPTS) {
        const result = await callFn(fn, attempt.args, attempt.label);
        setPythonResults(prev => [...prev, result]);
        if (result.status === 'ok' && result.value !== 'null' && result.value !== 'undefined') break;
      }
      setPythonDone(true);
    })();

    // --- Async: eveFrontierRpcRequest JSON-RPC probe ---
    (async () => {
      const fn = w.eveFrontierRpcRequest;
      for (const method of RPC_METHODS) {
        const result = await callFn(fn, [{ jsonrpc: '2.0', id: 1, method, params: [] }], method);
        setRpcResults(prev => [...prev, result]);
        if (result.status === 'ok' && !result.value.includes('"error"')) break;
      }
      setRpcDone(true);
    })();
  }, []);

  return (
    <div className="dark min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="mx-auto px-6 py-10" style={{ maxWidth: 960 }}>

        <div className="mb-6" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
          <div className="font-mono text-[11px] mb-1" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>// igb bridge probe — v4</div>
          <h1 className="font-heading text-xl font-bold text-white" style={{ letterSpacing: '0.08em' }}>
            EVE FRONTIER <span style={{ color: '#ff610a' }}>DEBUG</span>
          </h1>
          <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>{window.location.href}</div>
        </div>

        {/* WALLET_API_CHAIN */}
        <SectionHeader text="// WALLET_API_CHAIN" />
        <Row label="value" value={walletChain} color="#ff610a" />

        {/* Function source inspection */}
        <SectionHeader text="// bridge function inspection (toString, length)" />
        {fnInfos.map(info => (
          <div key={info.name} className="mb-4">
            <Row label={`window.${info.name}`} value={info.exists ? `type: ${info.type}${info.length !== undefined ? `, expects ${info.length} arg(s)` : ''}` : 'NOT PRESENT'} color={info.exists ? '#ff610a' : 'var(--muted-foreground)'} />
            {info.exists && <Row label="  .toString()" value={info.source} color="#a78bfa" />}
          </div>
        ))}

        {/* ccpPython inspection */}
        <SectionHeader text="// ccpPython object" />
        <Row label="JSON.stringify" value={ccpStr} color="#a78bfa" />
        {ccpInfos.map(info => (
          <div key={info.name} className="mb-4 mt-2">
            <Row label={`ccpPython.${info.name}`} value={info.exists ? `type: ${info.type}${info.length !== undefined ? `, expects ${info.length} arg(s)` : ''}` : 'NOT PRESENT'} color={info.exists ? '#ff610a' : 'var(--muted-foreground)'} />
            {info.exists && <Row label="  .toString()" value={info.source} color="#a78bfa" />}
          </div>
        ))}

        {/* ccpPython.pythonCall probe */}
        <SectionHeader text={`// ccpPython.pythonCall — probe ${pythonDone ? '(done)' : '(running...)'} | pythonReply fired: ${pythonReplyCalled}`} />
        {pythonResults.length === 0 && <Row label="waiting..." value="" />}
        {pythonResults.map((r, i) => (
          <Row key={i} label={`(${r.label})`} value={`[${r.status.toUpperCase()}] ${r.value}`} color={statusColor(r.status)} />
        ))}

        {/* eveFrontierRpcRequest probe */}
        <SectionHeader text={`// eveFrontierRpcRequest — JSON-RPC ${rpcDone ? '(done)' : '(running...)'}`} />
        {rpcResults.length === 0 && <Row label="waiting..." value="" />}
        {rpcResults.map((r, i) => (
          <Row key={i} label={`"${r.label}"`} value={`[${r.status.toUpperCase()}] ${r.value}`} color={statusColor(r.status)} />
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
