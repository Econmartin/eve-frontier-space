import { candidates } from '@/lib/chem';
import { itemName, itemOf } from '@/lib/industry';
import { cn } from '@/lib/utils';

/** materials that can go in an "Any … material" slot, best fit first */
export const slotOptions = (slot: number) => candidates({ id: slot, qty: 0, trait: itemOf(slot).trait });

/**
 * An "Any … material" slot shown as its own name: it reads "Any Radome material" until you pick, then the material.
 * `title` blends into a card heading (the graph); the default is a small field (lists).
 */
export function SlotSelect({ slot, value, onChange, className, variant }: { slot: number; value?: number; onChange: (material: number | undefined) => void; className?: string; variant?: 'title' }) {
  return (
    <select id={`slot${slot}`} aria-label={`${itemName(slot)}: pick a material`} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      title="Pick the material that goes in this slot"
      className={cn('max-w-full truncate cursor-pointer dark:[color-scheme:dark]',
        variant === 'title'
          ? 'w-full -mx-1 px-1 h-6 rounded-md bg-transparent text-sm font-medium leading-tight ring-1 ring-transparent hover:ring-foreground/20 focus:ring-[var(--color-martian-500)] outline-none'
          : 'h-7 rounded-lg bg-background ring-1 ring-foreground/15 px-2 text-sm',
        value === undefined && 'text-[var(--color-martian-500)]', className)}>
      {/* the list opens on the page's own colours, not the transparent, tinted field's */}
      <option value="" className="bg-background text-muted-foreground">{itemName(slot)}</option>
      {slotOptions(slot).map((c) => <option key={c.id} value={c.id} className="bg-background text-foreground">{itemName(c.id)}{c.fit === 'sometimes' ? ' (some stacks fit)' : ''}</option>)}
    </select>
  );
}
