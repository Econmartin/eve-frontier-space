import { useState, useEffect } from 'react';

const TIMEOUT_MS = 5000;

// JSON-RPC introspection + EVE-specific method names
const RPC_METHODS = [
  // Introspection — may list all valid methods
  'system.listMethods', 'rpc.discover', 'help', 'list', 'methods',
  // EVE Frontier guesses
  'getSmartAssembly', 'getCurrentAssembly', 'getActiveAssembly',
  'getCharacterInfo', 'getActiveCharacter',
  'getContext', 'context', 'state', 'getState',
];

// Direct ccpPython.pythonCall(objname, funcname, args) attempts
// _eveFrontierRpcRequest uses ("", "_eveFrontierRpcRequest") — what else is on ""?
// Also try named objects that might exist in the game client
const PYTHON_DIRECT: { obj: string; fn: string; args: unknown[] }[] = [
  { obj: '',            fn: 'listServices',          args: [] },
  { obj: '',            fn: 'listMethods',            args: [] },
  { obj: '',            fn: 'help',                   args: [] },
  { obj: 'igb',         fn: 'GetContext',             args: [] },
  { obj: 'igb',         fn: 'getContext',             args: [] },
  { obj: 'igb',         fn: 'GetActiveAssembly',      args: [] },
  { obj: 'sm',          fn: 'GetService',             args: ['viewState'] },
  { obj: 'assembly',    fn: 'GetCurrentAssembly',     args: [] },
  { obj: 'assembly',    fn: 'getCurrentAssembly',     args: [] },
  { obj: 'character',   fn: 'GetActiveCharacter',     args: [] },
  { obj: 'dapp',        fn: 'GetContext',             args: [] },
  { obj: 'dapp',        fn: 'getAssemblyId',          args: [] },
  { obj: 'frontier',    fn: 'GetContext',             args: [] },
  { obj: 'eve',         fn: 'GetContext',             args: [] },
];

type Status = 'ok' | 'error' | 'timeout';
interface Result { label: string; status: Status; value: string }

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timeout`)), ms)),
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
    return { label, status: msg === 'timeout' ? 'timeout' : 'error', value: msg };
  }
}

function statusColor(s: Status) {
  return s === 'ok' ? '#ff610a' : s === 'timeout' ? '#f87171' : '#facc15';
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
  const [rpcResults, setRpcResults] = useState<Result[]>([]);
  const [rpcDone, setRpcDone] = useState(false);
  const [pyResults, setPyResults] = useState<Result[]>([]);
  const [pyDone, setPyDone] = useState(false);

  useEffect(() => {
    const w = window as Record<string, unknown>;
    const ccp = w.ccpPython as Record<string, unknown> | undefined;
    const pythonCall = ccp?.pythonCall as ((...a: unknown[]) => unknown) | undefined;

    // --- eveFrontierRpcRequest JSON-RPC probe (runs in parallel with python probe) ---
    (async () => {
      const fn = w.eveFrontierRpcRequest;
      for (const method of RPC_METHODS) {
        const r = await callFn(fn, [{ jsonrpc: '2.0', id: 1, method, params: [] }], method);
        setRpcResults(prev => [...prev, r]);
        if (r.status === 'ok' && !r.value.includes('"error"')) break;
      }
      setRpcDone(true);
    })();

    // --- Direct ccpPython.pythonCall(obj, fn, args) probe ---
    (async () => {
      for (const attempt of PYTHON_DIRECT) {
        const label = `("${attempt.obj}", "${attempt.fn}", ${JSON.stringify(attempt.args)})`;
        const r = await callFn(pythonCall, [attempt.obj, attempt.fn, attempt.args], label);
        setPyResults(prev => [...prev, r]);
        // Stop if we get a real non-error result
        if (r.status === 'ok' && r.value !== 'null' && r.value !== 'undefined') break;
      }
      setPyDone(true);
    })();
  }, []);

  return (
    <div className="dark min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="mx-auto px-6 py-10" style={{ maxWidth: 960 }}>

        <div className="mb-6" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
          <div className="font-mono text-[11px] mb-1" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>// igb bridge probe — v5</div>
          <h1 className="font-heading text-xl font-bold text-white" style={{ letterSpacing: '0.08em' }}>
            EVE FRONTIER <span style={{ color: '#ff610a' }}>DEBUG</span>
          </h1>
          <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>{window.location.href}</div>
          <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>
            // both probes run in parallel — {TIMEOUT_MS / 1000}s timeout per call
          </div>
        </div>

        {/* eveFrontierRpcRequest — introspection + method names */}
        <SectionHeader text={`// eveFrontierRpcRequest — JSON-RPC ${rpcDone ? '(done)' : '(running...)'}`} />
        {rpcResults.length === 0 && <Row label="waiting..." value="" />}
        {rpcResults.map((r, i) => (
          <Row key={i} label={`method: "${r.label}"`} value={`[${r.status.toUpperCase()}] ${r.value}`} color={statusColor(r.status)} />
        ))}

        {/* ccpPython.pythonCall direct probe */}
        <SectionHeader text={`// ccpPython.pythonCall — direct python object probe ${pyDone ? '(done)' : '(running...)'}`} />
        <div className="font-mono text-[10px] mb-3" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
          format: (objname, funcname, args) — _eveFrontierRpcRequest uses ("", "_eveFrontierRpcRequest", ...)
        </div>
        {pyResults.length === 0 && <Row label="waiting..." value="" />}
        {pyResults.map((r, i) => (
          <Row key={i} label={r.label} value={`[${r.status.toUpperCase()}] ${r.value}`} color={statusColor(r.status)} />
        ))}

      </div>
    </div>
  );
}
