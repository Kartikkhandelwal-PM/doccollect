import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface Paging<T> {
  rows: T[]
  page: number
  pages: number
  size: number
  sizes: number[]
  total: number
  setPage: (n: number) => void
  setSize: (n: number) => void
}

// Splits a long list into pages. Goes back to page 1 whenever `resetKey` changes (a new search, filter or tab).
export function usePaging<T>(items: T[], resetKey: string, sizes: number[] = [10, 25, 50]): Paging<T> {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(sizes[0])
  useEffect(() => setPage(1), [resetKey, size])
  const pages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(page, pages)
  return { rows: items.slice((current - 1) * size, current * size), page: current, pages, size, sizes, total: items.length, setPage, setSize }
}

// 1 … 4 5 6 … 20
function pageList(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const set = new Set([1, pages, page - 1, page, page + 1])
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n))
  if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((n) => set.add(n))
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
}

const btn = 'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[13px] font-semibold'

export default function Pagination<T>({ p, noun = 'items', className = '' }: { p: Paging<T>; noun?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  if (p.total === 0) return null
  const from = (p.page - 1) * p.size + 1
  const to = Math.min(p.page * p.size, p.total)

  // After moving to another page, bring the list back to its top.
  const go = (n: number) => {
    p.setPage(n)
    let el = ref.current?.parentElement ?? null
    while (el) {
      const o = getComputedStyle(el).overflowY
      if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight) {
        el.scrollTo({ top: 0 })
        break
      }
      el = el.parentElement
    }
  }

  return (
    <div ref={ref} className={`flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-slate-50/80 px-6 py-2 text-[13px] text-muted ${className}`}>
      <span>
        Showing <b className="font-semibold text-ink">{from}–{to}</b> of <b className="font-semibold text-ink">{p.total}</b> {noun}
      </span>
      {p.total > p.sizes[0] && (
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            Rows per page
            <select
              value={p.size}
              onChange={(e) => p.setSize(Number(e.target.value))}
              className="h-8 rounded-lg border border-line bg-white px-2 text-[13px] font-semibold text-ink outline-none focus:border-brand"
            >
              {p.sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {p.pages > 1 && (
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <button type="button" onClick={() => go(p.page - 1)} disabled={p.page === 1} aria-label="Previous page" className={`${btn} text-slate-600 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent`}>
                <ChevronLeft size={16} />
              </button>
              {pageList(p.page, p.pages).map((n, i) =>
                n === '…' ? (
                  <span key={`g${i}`} className="px-1 text-faint">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => go(n)}
                    aria-current={n === p.page ? 'page' : undefined}
                    className={`${btn} ${n === p.page ? 'bg-brand text-white' : 'text-slate-600 hover:bg-white'}`}
                  >
                    {n}
                  </button>
                ),
              )}
              <button type="button" onClick={() => go(p.page + 1)} disabled={p.page === p.pages} aria-label="Next page" className={`${btn} text-slate-600 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent`}>
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  )
}
