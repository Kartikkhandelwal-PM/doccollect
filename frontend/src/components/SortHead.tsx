import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { ReactNode } from 'react'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

export type SortDir = 'asc' | 'desc'

// The next state of a sort when a heading is clicked: first this column (ascending), then descending, then back to the default order.
export const nextSort = <K,>(now: { by: K; dir: SortDir } | null, by: K): { by: K; dir: SortDir } | null =>
  !now || now.by !== by ? { by, dir: 'asc' } : now.dir === 'asc' ? { by, dir: 'desc' } : null

// The arrow of the column that is sorted. The other columns show a faint one only while the pointer is over them.
export function SortMark({ dir, className = '' }: { dir: SortDir | null; className?: string }) {
  if (dir === 'asc') return <ArrowUp size={13} className={`shrink-0 text-brand ${className}`} aria-hidden />
  if (dir === 'desc') return <ArrowDown size={13} className={`shrink-0 text-brand ${className}`} aria-hidden />
  return <ArrowUpDown size={12} className={`shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 ${className}`} aria-hidden />
}

export function SortButton({ on, onClick, label, children }: { on: SortDir | null; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`group flex items-center gap-1.5 rounded-md py-1 text-left ${focus}`}>
      <span className="text-left">{children}</span>
      <SortMark dir={on} className="mt-0.5" />
    </button>
  )
}
