import { candidates } from '@/lib/chem';
import { itemName, itemOf, type SlotFill } from '@/lib/industry';
import { cn } from '@/lib/utils';

/** materials that can go in an "Any … material" slot, best fit first */
export const slotOptions = (slot: number) => candidates({ id: slot, qty: 0, trait: itemOf(slot).trait });

/** a dropdown for one "Any … material" slot: leave it open, or pick the material you will use */
export function SlotSelect({ slot, value, onChange, className }: { slot: number; value?: number; onChange: (material: number | undefined) => void; className?: string }) {
  return (
    <select id={`slot${slot}`} aria-label={itemName(slot)} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      className={cn('h-7 max-w-[60vw] rounded-lg bg-background ring-1 ring-foreground/15 px-2 text-xs', value === undefined && 'text-muted-foreground', className)}>
      <option value="">{itemName(slot)}</option>
      {slotOptions(slot).map((c) => <option key={c.id} value={c.id}>{itemName(c.id)}{c.fit === 'sometimes' ? ' (some stacks fit)' : ''}</option>)}
    </select>
  );
}
