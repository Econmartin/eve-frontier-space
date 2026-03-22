import { useState, useEffect } from 'react';

// The 5 undocumented IGB bridge functions CCP injects into the window context.
// These only exist when the page is loaded inside the EVE Frontier in-game browser.
const IGB_FUNCTIONS = [
  'eveFrontierRpcRequest',
  '_eveFrontierRpcRequest',
  'callWallet',
  'ccpPython',
  '__pythonCall',
] as const;

// A few argument patterns to try on each function — casting wide to see what sticks.
const CALL_ATTEMPTS = [
  { label: 'no args',          args: [] },
  { label: 'empty object',     args: [{}] },
  { label: 'empty string',     args: [''] },
  { label: '"getContext"',     args: ['getContext'] },
  { label: '"getAssembly"',    args: ['getAssembly'] },
  { label: '"getCharacter"',   args: ['getCharacter'] },
  { label: '"getObjectId"',    args: ['getObjectId'] },
  { label: '{ method }',       args: [{ method: 'getContext' }] },
];

interface CallResult {
  label: string;
  args: unknown[];
  result?: unknown;
  error?: string;
  returned: boolean;
}

interface FnReport {
  name: string;
  exists: boolean;
  type: string;
  calls: CallResult[];
}

// Scan window for any keys that look EVE / CCP related beyond our known list.
function findEveGlobals(): Record<string, string> {
  const found: Record<string, string> = {};
  try {
    for (const key of Object.keys(window)) {
      if (/eve|ccp|igb|frontier|rpc|wallet|python/i.test(key)) {
        found[key] = typeof (window as Record<string, unknown>)[key];
      }
    }
  } catch {
    // window enumeration can fail in some contexts
  }
  return found;
}

function Row({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex gap-3 font-mono text-[11px]" style={{ letterSpacing: '0.04em' }}>
      <span style={{ color: 'var(--muted-foreground)', minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ color: dim ? 'var(--muted-foreground)' : '#ff610a', opacity: dim ? 0.5 : 1, wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  );
}

export function DebugPage() {
  const [reports, setReports] = useState<FnReport[]>([]);
  const [eveGlobals, setEveGlobals] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    const results: FnReport[] = [];

    for (const name of IGB_FUNCTIONS) {
      const fn = (window as Record<string, unknown>)[name];
      const exists = fn !== undefined;
      const type = typeof fn;
      const calls: CallResult[] = [];

      if (typeof fn === 'function') {
        for (const attempt of CALL_ATTEMPTS) {
          let result: unknown;
          let error: string | undefined;
          let returned = false;

          try {
            result = (fn as (...a: unknown[]) => unknown)(...attempt.args);
            returned = true;
          } catch (e) {
            error = e instanceof Error ? e.message : String(e);
          }

          calls.push({ label: attempt.label, args: attempt.args, result, error, returned });

          // If we got a non-null result, no need to try more args
          if (returned && result !== undefined && result !== null) break;
        }
      }

      results.push({ name, exists, type, calls });
    }

    setReports(results);
    setEveGlobals(findEveGlobals());
    setDone(true);
  }, []);

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
            URL: <span style={{ color: '#ff610a' }}>{window.location.href}</span>
          </div>
        </div>

        {/* IGB function probe results */}
        <section className="mb-8">
          <div className="font-mono text-[11px] mb-4" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
            // probing {IGB_FUNCTIONS.length} known igb functions {done ? '— done' : '— running...'}
          </div>

          <div className="flex flex-col gap-6">
            {reports.map(r => (
              <div key={r.name} style={{ borderLeft: `2px solid ${r.exists ? '#ff610a' : 'var(--border)'}`, paddingLeft: 16 }}>
                <div className="font-mono font-bold mb-2" style={{ color: r.exists ? '#ff610a' : 'var(--muted-foreground)', fontSize: 13 }}>
                  window.{r.name}
                  <span className="ml-3 font-normal text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                    {r.exists ? `type: ${r.type}` : 'NOT PRESENT'}
                  </span>
                </div>

                {r.calls.length === 0 && r.exists && (
                  <Row label="(not callable)" value={`type is ${r.type}`} dim />
                )}

                {r.calls.map((c, i) => (
                  <div key={i} className="mb-1">
                    {c.error ? (
                      <Row label={`call(${c.label})`} value={`ERROR: ${c.error}`} />
                    ) : (
                      <Row
                        label={`call(${c.label})`}
                        value={c.returned ? JSON.stringify(c.result) : 'no return'}
                        dim={!c.returned || c.result === undefined || c.result === null}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Any other EVE-related globals on window */}
        <section>
          <div className="font-mono text-[11px] mb-4" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.06em' }}>
            // other eve/ccp/igb globals found on window
          </div>
          {Object.keys(eveGlobals).length === 0 ? (
            <div className="font-mono text-[11px]" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>none found</div>
          ) : (
            <div className="flex flex-col gap-1">
              {Object.entries(eveGlobals).map(([k, v]) => (
                <Row key={k} label={k} value={v} />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
