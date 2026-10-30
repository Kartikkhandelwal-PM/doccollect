import { Check, X } from 'lucide-react'

// One document for one registration: the dot used by the Tracker and by a request's Tracker view.
// ok: approved. rv: came, waiting for review. miss: not here yet (asked and waiting, or never asked). rj: sent back (rejected), so it is still needed. na: not needed.
export type Cell = 'ok' | 'rv' | 'miss' | 'rj' | 'op' | 'na'

export const cellText: Record<Cell, string> = { ok: 'Approved', rv: 'To review', miss: 'Missing', rj: 'Rejected', op: 'Optional', na: 'Not needed' }
export const legendCells: Cell[] = ['ok', 'rv', 'miss', 'rj', 'op', 'na']

export function Dot({ s, label, small }: { s: Cell; label: string; small?: boolean }) {
  // The small one is for the key at the bottom of a table: the same dots, lighter.
  const base = small ? 'inline-flex h-3.5 w-3.5 items-center justify-center rounded-full' : 'inline-flex h-[18px] w-[18px] items-center justify-center rounded-full'
  const icon = small ? 9 : 11
  const title = label ? `${label}: ${cellText[s]}` : cellText[s]
  if (s === 'ok')
    return (
      <span title={title} role="img" aria-label={title} className={`${base} bg-brand text-white`}>
        <Check size={icon} strokeWidth={3.2} />
      </span>
    )
  if (s === 'rv')
    return (
      <span title={title} role="img" aria-label={title} className={`${base} ${small ? 'border-2' : 'border-2'} border-[#D97706] bg-white`}>
        <span className={`${small ? 'h-1 w-1' : 'h-1.5 w-1.5'} rounded-full bg-[#D97706]`} />
      </span>
    )
  if (s === 'rj')
    return (
      <span title={title} role="img" aria-label={title} className={`${base} bg-[#C0392B] text-white`}>
        <X size={icon} strokeWidth={3.2} />
      </span>
    )
  if (s === 'op') return <span title={title} role="img" aria-label={title} className={`${base} border-[1.5px] border-dotted border-[#C3CDD3] bg-white`} />
  if (s === 'miss') return <span title={title} role="img" aria-label={title} className={`${base} ${small ? 'border-[1.5px]' : 'border-[1.5px]'} border-dashed border-[#A9B6BF] bg-white`} />
  return (
    <span title={title} role="img" aria-label={title} className={`${base} ${small ? 'text-xs' : 'text-base'} text-[#7B8A94]`}>
      –
    </span>
  )
}

// The key to the dots, small and light, for the bottom of a table.
export function Legend({ notAsked }: { notAsked?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-500" aria-label="What the dots mean">
      {legendCells.map((c) => (
        <span key={c} className="flex items-center gap-1.5">
          <Dot s={c} label="" small />
          {c === 'na' && notAsked ? 'Not asked' : cellText[c]}
        </span>
      ))}
    </div>
  )
}
