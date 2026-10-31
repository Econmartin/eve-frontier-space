import { changeEntries as entries, type ChangeBrief as Brief } from '@/lib/industry';
import { Badge } from '@/components/ui/badge';
import { Empty, Panel, Section } from '../parts';


const Recipe = ({ b }: { b: Brief }) => (
  <div className="text-sm"><span className="font-semibold">{b.product}</span> <span className="text-muted-foreground">({b.facilities.join(', ') || 'no facility'}, {b.time}s)</span><div className="text-xs text-muted-foreground">{b.inputs.join(', ')} → {b.outputs.join(', ')}</div></div>
);

export function ChangesPage() {
  return (
    <div className="flex flex-col gap-6">
      {entries.map((e, i) => (
        <Section key={e.version + e.date} title={<span className="normal-case tracking-normal text-foreground text-base font-heading">{e.version}</span>} aside={<span className="text-xs text-muted-foreground">{e.date}</span>}>
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(e.counts).map(([k, v]) => <Badge key={k} variant="outline">{v} {k}</Badge>)}
            {i === 0 && entries.length === 1 && <Badge className="bg-[var(--color-martian-500)] text-black">baseline</Badge>}
            {e.added.length > 0 && <Badge variant="secondary">+{e.added.length} added</Badge>}
            {e.removed.length > 0 && <Badge variant="secondary">−{e.removed.length} removed</Badge>}
            {e.changed.length > 0 && <Badge variant="secondary">~{e.changed.length} changed</Badge>}
          </div>
          {e.note && <p className="text-sm text-muted-foreground font-sans mb-3 max-w-2xl">{e.note}</p>}
          {e.added.length + e.removed.length + e.changed.length === 0 ? (
            i === 0 && entries.length === 1 ? <Empty>This is the first snapshot, so there is nothing to diff yet. After the next patch, rerun the extractor and the diff script; every added, removed, or changed recipe will be listed here.</Empty> : null
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {(['added', 'removed'] as const).map((k) => e[k].length > 0 && (
                <Panel key={k} className="p-4"><div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">{k}</div><ul className="flex flex-col gap-2">{e[k].map((b) => <li key={b.id}><Recipe b={b} /></li>)}</ul></Panel>
              ))}
              {e.changed.length > 0 && (
                <Panel className="p-4 md:col-span-3"><div className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">changed</div>
                  <ul className="divide-y divide-foreground/5">{e.changed.map((c) => <li key={c.id} className="py-2 grid gap-2 md:grid-cols-2"><div><div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">before · {c.fields.join(', ')}</div><Recipe b={c.before} /></div><div><div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">after</div><Recipe b={c.after} /></div></li>)}</ul>
                </Panel>
              )}
            </div>
          )}
        </Section>
      ))}
    </div>
  );
}
