import { useState, useEffect } from 'react';

const IGB_FUNCTIONS = [
  'eveFrontierRpcRequest',
  '_eveFrontierRpcRequest',
  'callWallet',
  'ccpPython',
  '__pythonCall',
] as const;

const CALL_ATTEMPTS = [
  { label: 'no args',        args: [] },
  { label: 'empty object',   args: [{}] },
  { label: '"getContext"',   args: ['getContext'] },
  { label: '"getAssembly"',  args: ['getAssembly'] },
  { label: '"getCharacter"', args: ['getCharacter'] },
  { label: '{ method }',     args: [{ method: 'getContext' }] },
];

const CALL_TIMEOUT_MS = 3000;

type CallStatus = 'pending' | 'ok' | 'error' | 'timeout';

interface CallResult {
  label: string;
  status: CallStatus;
  value: string;
}

interface FnReport {
  name: string;
  exists: boolean;
  type: string;
  calls: CallResult[];
  done: boolean;
}

/** Calls fn(...args) and races against a timeout. Returns a CallResult. */
async function probeCall(
  fn: (...a: unknown[]) => unknown,
  attempt: { label: string; args: unknown[] },
): Promise<CallResult> {
  const timeout = new Promise<CallResult>(resolve =>
    setTimeout(() => resolve({ label: attempt.label, status: 'timeout', value: `no response after ${CALL_TIMEOUT_MS / 1000}s` }), CALL_TIMEOUT_MS),
  );

  const call = new Promise<CallResult>(resolve => {
    try {
      const raw = fn(...attempt.args);
      // Handle promises returned by the function
      if (raw instanceof Promise) {
        raw
          .then(v => resolve({ label: attempt.label, status: 'ok', value: JSON.stringify(v) }))
          .catch(e => resolve({ label: attempt.label, status: 'error', value: e?.message ?? String(e) }));
      } else {
        resolve({ label: attempt.label, status: 'ok', value: JSON.stringify(raw) });
      }
    } catch (e) {
      resolve({ label: attempt.label, status: 'error', value: (e as Error)?.message ?? String(e) });
    }
  });

  return Promise.race([call, timeout]);
}

function statusColor(s: CallStatus) {
  if (s === 'ok') return '#ff610a';
  if (s === 'error') return '#facc15';
  if (s === 'timeout') return '#f87171';
  return 'var(--muted-foreground)';
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex gap-3 font-mono text-[11px]" style={{ letterSpacing: '0.04em' }}>
      <span style={{ color: 'var(--muted-foreground)', minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ color: color ?? 'var(--muted-foreground)', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

function FnCard({ report }: { report: FnReport }) {
  const borderColor = !report.exists
    ? 'var(--border)'
    : report.calls.some(c => c.status === 'ok' && c.value !== 'null' && c.value !== 'undefined')
      ? '#ff610a'
      : report.calls.some(c => c.status === 'timeout')
        ? '#f87171'
        : 'var(--border)';

  return (
    <div style={{ borderLeft: `2px solid ${borderColor}`, paddingLeft: 16 }}>
      <div className="font-mono font-bold mb-2 flex items-center gap-3" style={{ fontSize: 13 }}>
        <span style={{ color: report.exists ? '#ff610a' : 'var(--muted-foreground)' }}>
          window.{report.name}
        </span>
        <span className="font-normal text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
          {!report.exists ? 'NOT PRESENT' : `type: ${report.type}`}
          {!report.done && report.exists && ' — probing...'}
        </span>
      </div>

      {report.calls.map((c, i) => (
        <Row
          key={i}
          label={`call(${c.label})`}
          value={`[${c.status.toUpperCase()}] ${c.value}`}
          color={statusColor(c.status)}
        />
      ))}
    </div>
  );
}

export function DebugPage() {
  const [reports, setReports] = useState<FnReport[]>(() =>
    IGB_FUNCTIONS.map(name => ({ name, exists: false, type: 'unknown', calls: [], done: false })),
  );
  const [eveGlobals, setEveGlobals] = useState<Record<string, string>>({});

  // Probe each function sequentially so a hang in one doesn't block the render of others.
  useEffect(() => {
    // Scan window for other EVE/CCP globals immediately (sync)
    const globals: Record<string, string> = {};
    try {
      for (const key of Object.keys(window)) {
        if (/eve|ccp|igb|frontier|rpc|wallet|python/i.test(key)) {
          globals[key] = typeof (window as Record<string, unknown>)[key];
        }
      }
    } catch { /* ignore */ }
    setEveGlobals(globals);

    // Probe functions one at a time
    (async () => {
      for (const name of IGB_FUNCTIONS) {
        const fn = (window as Record<string, unknown>)[name];
        const exists = fn !== undefined;
        const type = typeof fn;

        // Update card to show it's being probed
        setReports(prev => prev.map(r => r.name === name ? { ...r, exists, type } : r));

        const calls: CallResult[] = [];

        if (typeof fn === 'function') {
          for (const attempt of CALL_ATTEMPTS) {
            const result = await probeCall(fn as (...a: unknown[]) => unknown, attempt);
            calls.push(result);

            // Update card incrementally after each call
            setReports(prev => prev.map(r => r.name === name ? { ...r, calls: [...calls] } : r));

            // If we got a real value back, stop trying more arg patterns
            if (result.status === 'ok' && result.value !== 'null' && result.value !== 'undefined') break;
          }
        }

        // Mark this function as fully done
        setReports(prev => prev.map(r => r.name === name ? { ...r, calls, done: true } : r));
      }
    })();
  }, []);

  const allDone = reports.every(r => r.done || !r.exists);

  return (
    <div className="dark min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="mx-auto px-6 py-10" style={{ maxWidth: 860 }}>

        <div className="mb-8" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
          <div className="font-mono text-[11px] mb-1" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
            // igb bridge function probe
          </div>
          <h1 className="font-heading text-xl font-bold text-white" style={{ letterSpacing: '0.08em' }}>
            EVE FRONTIER <span style={{ color: '#ff610a' }}>DEBUG</span>
          </h1>
          <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.04em' }}>
            url: <span style={{ color: '#ff610a' }}>{window.location.href}</span>
          </div>
          <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.04em', opacity: 0.5 }}>
            {allDone ? '// probe complete' : `// probing — each call times out after ${CALL_TIMEOUT_MS / 1000}s`}
          </div>
        </div>

        {/* IGB function probe — one card per function, updates live */}
        <section className="mb-8 flex flex-col gap-6">
          {reports.map(r => <FnCard key={r.name} report={r} />)}
        </section>

        {/* Other EVE-related globals */}
        <section>
          <div className="font-mono text-[11px] mb-3" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
            // other eve/ccp/igb globals on window
          </div>
          {Object.keys(eveGlobals).length === 0 ? (
            <div className="font-mono text-[11px]" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>none found</div>
          ) : (
            <div className="flex flex-col gap-1">
              {Object.entries(eveGlobals).map(([k, v]) => (
                <Row key={k} label={k} value={v} color="#ff610a" />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
