import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { Status } from '../data/types'
import { changeableStatuses, statusMeta } from '../lib/status'

interface Props {
  status: Status
  onChange?: (next: Status) => void
  options?: Status[]
}

// Jira-style status lozenge. When onChange is given, it opens a menu to change status in place.
export default function StatusBadge({ status, onChange, options = changeableStatuses }: Props) {
  const [open, setOpen] = useState(false)
  const meta = statusMeta[status]
  const base =
    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide'

  if (!onChange) return <span className={`${base} ${meta.className}`}>{meta.label}</span>

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${base} ${meta.className} cursor-pointer hover:brightness-95`}
      >
        {meta.label}
        <ChevronDown size={12} strokeWidth={3} />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          />
          <div
            role="menu"
            className="absolute left-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg"
          >
            {options.map((s) => (
              <button
                key={s}
                role="menuitem"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(s)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-canvas"
              >
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${statusMeta[s].className}`}>
                  {statusMeta[s].label}
                </span>
                {s === status && <Check size={14} className="text-brand" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
