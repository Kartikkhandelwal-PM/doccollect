import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

// One look for every filter dropdown: the same height and width, the arrow in the same place, a clear focus ring.
export default function FilterSelect({ value, onChange, label, children, width = 'w-[200px]' }: { value: string; onChange: (value: string) => void; label: string; children: ReactNode; width?: string }) {
  return (
    <label className={`relative block h-10 shrink-0 ${width} max-md:w-full`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-10 w-full appearance-none truncate rounded-xl border border-line bg-white pl-3.5 pr-9 text-sm font-semibold text-ink outline-none transition-colors hover:border-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </label>
  )
}

export interface RichOption {
  value: string
  label: string // the main line, for example the place
  sub?: string // a smaller line under it, for example the GSTIN
}

// A dropdown whose choices have two lines: the main text, and a small grey line under it. The button shows only the main text,
// so it keeps the same size as the other filters.
export function RichFilterSelect({ value, onChange, label, allLabel, options, width = 'w-[200px]' }: { value: string; onChange: (value: string) => void; label: string; allLabel: string; options: RichOption[]; width?: string }) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <div className={`relative h-10 shrink-0 ${width} max-md:w-full`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 w-full items-center rounded-xl border bg-white pl-3.5 pr-9 text-left text-sm font-semibold text-ink outline-none transition-colors hover:border-slate-400 ${open ? 'border-brand ring-2 ring-brand/15' : 'border-line'}`}
      >
        <span className="truncate">{current ? current.label : allLabel}</span>
      </button>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      {open && (
        <>
          <button type="button" aria-label="Close" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div role="listbox" className="absolute left-0 top-full z-40 mt-1.5 max-h-[340px] min-w-full overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-xl">
            {[{ value: '', label: allLabel } as RichOption, ...options].map((o) => (
              <button
                key={o.value || 'all'}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  setOpen(false)
                  onChange(o.value)
                }}
                className={`flex w-full flex-col items-start px-3.5 py-2 text-left hover:bg-canvas ${o.value === value ? 'bg-[#EEF8F5]' : ''}`}
              >
                <span className={`text-sm ${o.value === value ? 'font-bold text-brand-dark' : 'font-semibold'}`}>{o.label}</span>
                {o.sub && <span className="font-mono text-[12px] text-muted">{o.sub}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
