import { Check, ChevronDown, Download, FileSpreadsheet, FileText, Search, Send, X } from 'lucide-react'
import { Children, isValidElement, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import EmptyState from './EmptyState'
import Toast from './Toast'
import { cellText, Dot, Legend } from './StatusDot'
import type { Cell } from './StatusDot'
import Pagination, { usePaging } from './Pagination'
import { SortButton, SortMark } from './SortHead'
import { buildMaster } from '../data/master'
import { useMasterStore } from '../data/masterStore'
import { clients, getBookClient, parentIdOf, partyName } from '../data/mock'
import { useRequests } from '../data/requests'
import { useSetup } from '../data/setup'
import type { Service } from '../data/types'
import { buildCsv, buildXlsx, download, safeName, ST } from '../lib/export'
import { ALL_YEARS, CURRENT_FY, periodOf, YEARS } from '../lib/period'

type Status = 'all' | 'complete' | 'review' | 'missing'

const kinds: Service[] = ['ITR', 'GST', 'TDS']
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

// A filter: its name sits inside the box. The choices open in a menu right under it (not the system's own list, which opens over the box and hides it).
function Select({ label, value, onChange, children, className = '' }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  const options = Children.toArray(children).flatMap((c) => (isValidElement(c) ? [{ value: String((c.props as { value: string }).value), text: Children.toArray((c.props as { children: ReactNode }).children).join('') }] : []))
  const current = options.find((o) => o.value === value)
  return (
    <div className={`relative ${className}`}>
      <button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`flex h-10 w-full items-center gap-2 rounded-xl border bg-white pl-3 pr-2.5 text-left text-sm transition-colors hover:border-slate-300 ${focus} ${open ? 'border-brand' : 'border-line'}`}>
        <span className="shrink-0 text-muted">{label}</span>
        <span className="min-w-0 flex-1 truncate font-semibold text-ink">{current?.text}</span>
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div role="listbox" aria-label={label} className="absolute left-0 top-full z-40 mt-1.5 max-h-[320px] min-w-full overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-[0_12px_32px_rgba(17,27,33,0.16)]">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-6 whitespace-nowrap px-3.5 py-2 text-left text-sm hover:bg-canvas ${o.value === value ? 'bg-[#EEF8F5] font-semibold text-brand-dark' : ''}`}
              >
                {o.text}
                {o.value === value && <Check size={15} className="shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// What the Filing column says about a client: what is stopping it, or that it is ready.
const tagOf = (r: { missing: string[]; review: number }) =>
  r.review > 0
    ? { text: `${r.review} to review`, cls: 'text-[#1D5FB8]' }
    : r.missing.length > 0
      ? { text: `${r.missing.length} missing`, cls: 'text-[#B45309]' }
      : { text: 'Complete', cls: 'text-brand-dark' }

// What a click on a column heading sorts by: the client's name, how much is missing, or one document (missing first).
type SortBy = 'client' | 'filing' | number
const cellOrder: Record<Cell, number> = { rj: 0, miss: 1, rv: 2, op: 3, ok: 4, na: 5 }

// Who has sent what. Every client is a row and every document a column, for one kind of work and one year (or all years).
// The documents come from a checklist, or are picked one by one. Tick clients and ask only for what each one is missing.
export default function Tracker() {
  const navigate = useNavigate()
  const { requests } = useRequests()
  const { fileEdits } = useMasterStore()
  const { compliances, documents, groups, onceIds } = useSetup()
  const [kind, setKind] = useState<Service>('ITR')
  const [by, setBy] = useState<'checklist' | 'documents'>('checklist')
  const [listId, setListId] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [pickOpen, setPickOpen] = useState(false)
  const [docsTab, setDocsTab] = useState<'checklist' | 'pick'>('checklist')
  const [pickQuery, setPickQuery] = useState('')
  const [year, setYear] = useState(CURRENT_FY)
  const [status, setStatus] = useState<Status>('all')
  const [query, setQuery] = useState('')
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ by: SortBy; dir: 'asc' | 'desc' } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const lists = compliances.filter((c) => c.kind === kind)
  const list = lists.find((c) => c.id === listId) ?? lists[0]
  // Picked documents are listed newest first in the picker; the columns go in the order they were picked.
  const docIds = by === 'checklist' ? (list?.docIds ?? []) : [...picked].reverse()
  const docs = docIds.map((id) => ({ id, name: documents.find((d) => d.id === id)?.name ?? id }))
  // A PAN or Aadhaar belongs to the client, not to one registration: having it on the ITR counts for the GSTINs too.
  const ownedByClient = (docId: string) => documents.find((d) => d.id === docId)?.group === 'Identity'
  const keyOf = (clientId: string, docId: string) => `${ownedByClient(docId) ? parentIdOf(clientId) : clientId}|${docId}`

  // What each registration has for each document in the chosen year. Approved comes from the files in Document Master (so a file saved
  // there counts), the rest from the requests. When there are several answers the best one wins.
  const states = useMemo(() => {
    const rank: Record<Cell, number> = { ok: 5, rv: 4, rj: 3, miss: 2, op: 1, na: 0 }
    const m = new Map<string, Cell>()
    const put = (key: string, c: Cell) => {
      const had = m.get(key)
      if (!had || had === 'na' || (c !== 'na' && rank[c] > rank[had])) m.set(key, c)
    }
    const inYear = (p?: string) => year === ALL_YEARS || (p ?? CURRENT_FY) === year
    for (const f of buildMaster(requests, onceIds)) {
      const docId = fileEdits[f.id]?.docId ?? f.docId
      // A file with no year (a document kept once, like PAN) counts in every year.
      if (!docId || !f.clientId || fileEdits[f.id]?.deleted || (f.period !== undefined && !inYear(f.period))) continue
      put(keyOf(f.clientId, docId), 'ok')
    }
    for (const r of requests) {
      if (!inYear(periodOf(r))) continue
      for (const rc of r.clients)
        for (const d of rc.docs) put(keyOf(rc.clientId, d.id), d.status === 'approved' ? 'ok' : d.status === 'to_review' ? 'rv' : d.status === 'na' ? 'na' : d.status === 'rejected' ? 'rj' : d.optional ? 'op' : 'miss')
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, fileEdits, year, documents, onceIds])

  const all = useMemo(
    () =>
      clients
        .filter((c) => c.service === kind)
        .map((c) => {
          const cells = docIds.map((id) => states.get(keyOf(c.id, id)) ?? (documents.find((d) => d.id === id)?.optional ? 'op' : 'miss'))
          // A rejected file has to be sent again, so it counts as missing.
          const missing = docIds.filter((_, i) => cells[i] === 'miss' || cells[i] === 'rj')
          const review = cells.filter((x) => x === 'rv').length
          return { client: c, cells, missing, review }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, docIds.join(','), states],
  )
  const q = query.trim().toLowerCase()
  const rows = all.filter((r) => {
    if (q && !`${partyName(r.client.id)} ${r.client.label ?? ''} ${r.client.pan} ${r.client.gstin ?? ''} ${r.client.tan ?? ''}`.toLowerCase().includes(q)) return false
    if (status === 'complete') return r.missing.length === 0 && r.review === 0
    if (status === 'review') return r.review > 0
    if (status === 'missing') return r.review === 0 && r.missing.length > 0
    return true
  })
  const count = {
    all: all.length,
    complete: all.filter((r) => r.missing.length === 0 && r.review === 0).length,
    review: all.filter((r) => r.review > 0).length,
    missing: all.filter((r) => r.review === 0 && r.missing.length > 0).length,
  }
  const sorted = sort
    ? [...rows].sort((a, b) => {
        const d = sort.by === 'client' ? partyName(a.client.id).localeCompare(partyName(b.client.id)) : sort.by === 'filing' ? b.missing.length - a.missing.length : cellOrder[a.cells[sort.by]] - cellOrder[b.cells[sort.by]]
        return sort.dir === 'asc' ? d : -d
      })
    : rows
  const sortBy = (by: SortBy) => setSort((s) => (!s || s.by !== by ? { by, dir: 'asc' } : s.dir === 'asc' ? { by, dir: 'desc' } : null))
  const paging = usePaging(sorted, `${kind}|${by}|${list?.id}|${picked.join(',')}|${year}|${status}|${q}|${sort?.by}|${sort?.dir}`, [25, 50, 100])
  // Per document: how many of the clients who need it have it approved.
  const column = docs.map((_, i) => {
    const need = all.filter((r) => r.cells[i] !== 'na')
    const done = need.filter((r) => r.cells[i] === 'ok').length
    return { done, need: need.length, pct: need.length ? Math.round((done / need.length) * 100) : 0 }
  })

  const tickedRows = all.filter((r) => ticked.has(r.client.id))
  const toAsk = tickedRows.filter((r) => r.missing.length > 0)
  // A request is made for the current year, so asking is off while an older year is on screen.
  const canAsk = year === CURRENT_FY || year === ALL_YEARS
  const pageIds = paging.rows.map((r) => r.client.id)
  const allTicked = pageIds.length > 0 && pageIds.every((id) => ticked.has(id))
  const toggle = (id: string) =>
    setTicked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const toggleAll = () =>
    setTicked((s) => {
      const n = new Set(s)
      pageIds.forEach((id) => (allTicked ? n.delete(id) : n.add(id)))
      return n
    })
  const ask = () => {
    if (toAsk.length === 0 || !canAsk) return
    navigate('/requests/new', {
      state: { tracker: { kind, complianceId: by === 'checklist' && list ? list.id : 'custom', clientIds: toAsk.map((r) => r.client.id), missing: Object.fromEntries(toAsk.map((r) => [r.client.id, r.missing])) } },
    })
  }
  const resetTicks = () => setTicked(new Set())

  // Everything the filters show (all pages, in the order on screen), as a file.
  const exportIt = (format: 'xlsx' | 'csv') => {
    const idName = kind === 'GST' ? 'GSTIN' : kind === 'TDS' ? 'TAN' : 'PAN'
    const withPlace = kind !== 'ITR' // a GSTIN has a state, a TAN a place
    const head = ['Client', ...(withPlace ? ['State or place'] : []), idName, 'Filing', ...docs.map((d) => d.name), 'Missing documents']
    const body = sorted.map((r) => {
      const idNo = kind === 'GST' && r.client.gstin ? r.client.gstin : kind === 'TDS' && r.client.tan ? r.client.tan : r.client.pan
      return { name: r.client.name, place: r.client.label ?? '', idNo, tag: tagOf(r).text, cells: r.cells, missing: r.missing.map((id) => docs.find((d) => d.id === id)?.name ?? id).join(', ') }
    })
    const file = `${safeName(`Tracker ${kind} ${year}`)}.${format}`
    if (format === 'csv') download(file, buildCsv([head, ...body.map((b) => [b.name, ...(withPlace ? [b.place] : []), b.idNo, b.tag, ...b.cells.map((c) => cellText[c]), b.missing])]))
    else {
      const style = { ok: ST.ok, rv: ST.review, miss: ST.miss, rj: ST.rej, op: ST.na, na: ST.na } as const
      download(
        file,
        buildXlsx([
          {
            name: 'Tracker',
            filter: true,
            freeze: { cols: withPlace ? 3 : 2, rows: 1 },
            widths: [30, ...(withPlace ? [18] : []), 20, 16, ...docs.map(() => 17), 46],
            rows: [
              head.map((h, i) => ({ v: h, s: i < (withPlace ? 4 : 3) || i === head.length - 1 ? ST.headLeft : ST.head })),
              ...body.map((b) => [{ v: b.name }, ...(withPlace ? [{ v: b.place }] : []), { v: b.idNo }, { v: b.tag }, ...b.cells.map((c) => ({ v: cellText[c], s: style[c] })), { v: b.missing }]),
            ],
          },
          {
            name: 'About',
            widths: [22, 60],
            rows: [
              [{ v: 'Tracker', s: ST.headLeft }, { v: `${kind} · ${year}`, s: ST.headLeft }],
              [{ v: 'Work' }, { v: kind }],
              [{ v: 'Documents' }, { v: by === 'checklist' ? `${list?.name ?? ''} (${docs.length})` : docs.map((d) => d.name).join(', ') }],
              [{ v: 'Year' }, { v: year }],
              [{ v: 'Clients' }, { v: `${status === 'all' ? 'All' : status === 'complete' ? 'Complete' : status === 'review' ? 'To review' : 'Waiting for client'}${q ? ` · search "${query.trim()}"` : ''}` }],
              [{ v: 'Rows' }, { v: String(body.length) }],
              [{ v: 'Exported' }, { v: new Date().toLocaleString('en-IN') }],
              [{ v: 'Approved' , s: ST.ok }, { v: 'The file is here and approved' }],
              [{ v: 'To review', s: ST.review }, { v: 'The file came and is waiting for review' }],
              [{ v: 'Missing', s: ST.miss }, { v: 'Not here yet: asked and waiting, or never asked' }],
              [{ v: 'Rejected', s: ST.rej }, { v: 'Sent back to the client, so it is still needed' }],
              [{ v: 'Optional', s: ST.na }, { v: 'Asked only if the client has it; not counted as missing' }],
              [{ v: 'Not needed', s: ST.na }, { v: 'This client does not need it' }],
            ],
          },
        ]),
      )
    }
    setExportOpen(false)
    setToast(`Downloaded ${file} · ${body.length} ${body.length === 1 ? 'row' : 'rows'}`)
    window.setTimeout(() => setToast(null), 3200)
  }

  // The client column (with its Filing tag) and the header row stay in view when the table is wider than the screen.
  const columns = `320px repeat(${Math.max(docs.length, 1)}, minmax(92px,1fr))`
  const width = 320 + docs.length * 100
  // The shadow on the frozen column shows only when the table has been scrolled sideways, so something is sliding under it.
  const [scrolled, setScrolled] = useState(false)
  const edge = scrolled ? 'shadow-[3px_0_5px_-3px_rgba(17,27,33,0.28)]' : ''
  const stickyHead = `sticky left-0 z-30 border-r border-line bg-[#F7F9FA] transition-shadow ${edge}`
  const stickyCell = `sticky left-0 z-10 border-r border-line bg-inherit transition-shadow ${edge}`
  const pickedLabel = picked.length === 0 ? 'Choose documents' : picked.length <= 2 ? picked.map((id) => documents.find((d) => d.id === id)?.name ?? id).join(', ') : `${picked.length} documents`
  const pq = pickQuery.trim().toLowerCase()

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-3 px-4 pb-4 pt-2 md:px-8">
      {/* Filters, in one line: what kind of work (the rows), which documents (the columns), which year, which clients, and a search. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <Select
          label="Work"
          value={kind}
          onChange={(v) => {
            setKind(v as Service)
            setListId('')
            resetTicks()
          }}
          className="w-[158px]"
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {k} ({clients.filter((c) => c.service === k).length})
            </option>
          ))}
        </Select>

        <div className="relative">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={pickOpen}
            onClick={() => {
              setDocsTab(by === 'documents' ? 'pick' : 'checklist')
              setPickOpen((v) => !v)
            }}
            className={`flex h-10 w-[226px] items-center gap-2 rounded-xl border bg-white pl-3 pr-2.5 text-sm transition-colors hover:border-slate-300 ${focus} ${pickOpen ? 'border-brand' : 'border-line'}`}
          >
            <span className="shrink-0 text-muted">Documents</span>
            <span className={`min-w-0 flex-1 truncate text-left font-semibold ${by === 'documents' && picked.length === 0 ? 'text-muted' : ''}`}>{by === 'checklist' ? `${list?.name ?? 'No checklist'} · ${docIds.length}` : pickedLabel}</span>
            <ChevronDown size={16} className="shrink-0 text-muted" />
          </button>
          {pickOpen && (
            <>
              <button type="button" aria-label="Close" className="fixed inset-0 z-30 cursor-default" onClick={() => setPickOpen(false)} />
              <div role="dialog" aria-label="Choose the documents to check" className="absolute left-0 top-full z-40 mt-2 flex max-h-[min(520px,calc(100vh-220px))] w-[400px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_16px_40px_rgba(17,27,33,0.18)]">
                <div className="shrink-0 border-b border-line p-3">
                  <div role="tablist" aria-label="Where the documents come from" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1">
                    {(['checklist', 'pick'] as const).map((t) => (
                      <button key={t} type="button" role="tab" aria-selected={docsTab === t} onClick={() => setDocsTab(t)} className={`h-9 rounded-lg text-sm font-semibold transition-colors ${docsTab === t ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
                        {t === 'checklist' ? 'From a checklist' : 'Pick documents'}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2.5 px-1 text-[13px] leading-snug text-muted">
                    {docsTab === 'checklist' ? `Use the documents of one ${kind} checklist as the columns.` : 'Tick any documents. Each one becomes a column.'}
                  </p>
                </div>

                {docsTab === 'checklist' ? (
                  <div className="min-h-0 flex-1 overflow-y-auto p-2">
                    {lists.map((c) => {
                      const on = by === 'checklist' && list?.id === c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setBy('checklist')
                            setListId(c.id)
                            setPickOpen(false)
                            resetTicks()
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${on ? 'bg-brand-soft text-brand-dark' : 'hover:bg-canvas'}`}
                        >
                          <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-brand' : 'border-slate-300'}`}>{on && <span className="h-2 w-2 rounded-full bg-brand" />}</span>
                          <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                          <span className="shrink-0 text-xs text-muted">{c.docIds.length} documents</span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <>
                    <div className="shrink-0 border-b border-line px-3 py-2.5">
                      <label className="flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm text-muted focus-within:border-brand">
                        <Search size={15} />
                        <input autoFocus value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} placeholder="Search documents" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
                      </label>
                    </div>
                    <div className="min-h-[200px] flex-1 overflow-y-auto py-1">
                      {(() => {
                        const row = (d: { id: string; name: string }) => (
                          <label key={d.id} className="mx-1.5 flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm hover:bg-canvas">
                            <input
                              type="checkbox"
                              checked={picked.includes(d.id)}
                              onChange={() => {
                                setBy('documents')
                                setPicked((p) => (p.includes(d.id) ? p.filter((x) => x !== d.id) : [d.id, ...p]))
                                resetTicks()
                              }}
                              className="h-[18px] w-[18px] accent-[#0F7B6C]"
                            />
                            {d.name}
                          </label>
                        )
                        // What you picked goes to the top (the newest first), so it is always in sight. The rest stay in their categories.
                        const chosen = picked.map((id) => documents.find((d) => d.id === id)).filter((d): d is (typeof documents)[number] => !!d && (!pq || d.name.toLowerCase().includes(pq)))
                        return (
                          <>
                            {chosen.length > 0 && (
                              <div className="mb-1 border-b border-line pb-1.5">
                                <div className="px-4 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wider text-brand-dark">Chosen · {picked.length}</div>
                                {chosen.map(row)}
                              </div>
                            )}
                            {groups.map((g) => {
                              const shown = g.docs.filter((d) => !picked.includes(d.id) && (!pq || d.name.toLowerCase().includes(pq)))
                              if (shown.length === 0) return null
                              return (
                                <div key={g.title}>
                                  <div className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-faint">{g.title}</div>
                                  {shown.map(row)}
                                </div>
                              )
                            })}
                          </>
                        )
                      })()}
                    </div>
                    <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-3 text-sm">
                      <span className="text-muted">{picked.length === 0 ? 'None chosen' : `${picked.length} chosen`}</span>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setPicked([])} disabled={picked.length === 0} className="font-semibold text-muted hover:text-ink disabled:opacity-40">
                          Clear
                        </button>
                        <button type="button" onClick={() => setPickOpen(false)} className="h-9 rounded-lg bg-brand px-4 font-semibold text-white">
                          Show
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <Select label="Year" value={year} onChange={(v) => (setYear(v), resetTicks())} className="w-[172px]">
          {[...YEARS, ALL_YEARS].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>

        <Select label="Clients" value={status} onChange={(v) => setStatus(v as Status)} className="w-[185px]">
          <option value="all">All ({count.all})</option>
          <option value="complete">Complete ({count.complete})</option>
          <option value="review">To review ({count.review})</option>
          <option value="missing">Waiting for client ({count.missing})</option>
        </Select>

        <label className="flex h-10 w-full min-w-[150px] flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm text-muted transition-colors focus-within:border-brand hover:border-slate-300">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients" aria-label="Search client, place or number" className="w-full bg-transparent font-medium text-ink outline-none placeholder:text-muted" />
        </label>

        <div className="relative ml-auto">
          <button type="button" aria-haspopup="menu" aria-expanded={exportOpen} disabled={sorted.length === 0 || docs.length === 0} onClick={() => setExportOpen((v) => !v)} className={`flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm font-semibold transition-colors hover:border-slate-300 disabled:opacity-40 ${focus}`}>
            <Download size={16} />
            Export
            <ChevronDown size={15} className="text-muted" />
          </button>
          {exportOpen && (
            <>
              <button type="button" aria-label="Close" className="fixed inset-0 z-30 cursor-default" onClick={() => setExportOpen(false)} />
              <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-[300px] overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[0_16px_40px_rgba(17,27,33,0.18)]">
                <button type="button" role="menuitem" onClick={() => exportIt('xlsx')} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-canvas">
                  <FileSpreadsheet size={20} className="mt-0.5 shrink-0 text-brand" />
                  <span>
                    <span className="block text-sm font-semibold">Excel (.xlsx)</span>
                    <span className="block text-[13px] text-muted">Coloured status, the header and client stay in view, a filter on every column.</span>
                  </span>
                </button>
                <button type="button" role="menuitem" onClick={() => exportIt('csv')} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-canvas">
                  <FileText size={20} className="mt-0.5 shrink-0 text-muted" />
                  <span>
                    <span className="block text-sm font-semibold">CSV (.csv)</span>
                    <span className="block text-[13px] text-muted">Plain text that opens in any tool.</span>
                  </span>
                </button>
                <p className="px-3 pb-1.5 pt-2 text-[12px] text-muted">
                  Exports the <b className="text-ink">{sorted.length}</b> {sorted.length === 1 ? 'row' : 'rows'} that match the filters, not only this page.
                </p>
              </div>
            </>
          )}
        </div>

      </div>

      {all.length === 0 || docs.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-slate-300 bg-white">
          <EmptyState
            art="folder"
            title={docs.length === 0 ? (by === 'documents' ? 'Choose the documents to check' : 'This checklist has no documents') : `No ${kind} clients yet`}
            text={docs.length === 0 ? (by === 'documents' ? 'Pick one or more documents, and you will see which clients have each of them.' : 'Add documents to the checklist in Checklists.') : `Add a client with an ${kind} registration to see them here.`}
          >
            {docs.length === 0 && by === 'documents' && (
              <button type="button" onClick={() => (setDocsTab('pick'), setPickOpen(true))} className="flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white">
                Choose documents
              </button>
            )}
          </EmptyState>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-line bg-white">
          <div className="min-h-0 flex-1 overflow-auto" onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}>
            <div style={{ minWidth: width }}>
              {/* Header row */}
              <div className="sticky top-0 z-20 grid items-stretch border-b border-line bg-[#F7F9FA] text-[13px] font-semibold text-slate-700" style={{ gridTemplateColumns: columns }}>
                <div className={`${stickyHead} flex items-center gap-3 px-4 py-2.5`}>
                  <input type="checkbox" aria-label="Select all clients on this page" checked={allTicked} onChange={toggleAll} className={`h-[18px] w-[18px] cursor-pointer accent-[#0F7B6C] ${focus}`} />
                  <div className="min-w-0 flex-1">
                    <SortButton on={sort?.by === 'client' ? sort.dir : null} onClick={() => sortBy('client')} label="Sort by client name">
                      Client
                    </SortButton>
                    <div className="text-xs font-medium text-muted">{rows.length === count.all ? `${count.all} ${count.all === 1 ? 'registration' : 'registrations'}` : `${rows.length} of ${count.all}`}</div>
                  </div>
                  <SortButton on={sort?.by === 'filing' ? sort.dir : null} onClick={() => sortBy('filing')} label="Sort by how much is missing">
                    Filing
                  </SortButton>
                </div>
                {docs.map((d, i) => (
                  <button key={d.id} type="button" onClick={() => sortBy(i)} aria-label={`Sort by ${d.name}, missing first`} title="Click to sort, missing first" className={`group relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-center transition-colors hover:bg-slate-100 ${focus}`}>
                    <SortMark dir={sort?.by === i ? sort.dir : null} className="absolute right-1.5 top-2" />
                    <span className="line-clamp-2 leading-tight" title={d.name}>
                      {d.name}
                    </span>
                    <span className="whitespace-nowrap text-[11px] font-medium text-muted">
                      {column[i].done} / {column[i].need}
                      {documents.find((x) => x.id === d.id)?.optional && <span className="ml-1 text-slate-400">· optional</span>}
                    </span>
                  </button>
                ))}
              </div>

              {rows.length === 0 && <p className="px-4 py-12 text-center text-sm text-muted">No client matches these filters.</p>}

              {paging.rows.map((r) => {
                const on = ticked.has(r.client.id)
                const tag = tagOf(r)
                const id = kind === 'GST' && r.client.gstin ? r.client.gstin : kind === 'TDS' && r.client.tan ? r.client.tan : r.client.pan
                return (
                  <div key={r.client.id} className={`grid items-center border-b border-[#EEF1F3] transition-colors ${on ? 'bg-[#F0FAF6]' : 'bg-white hover:bg-[#F6F8FA]'}`} style={{ gridTemplateColumns: columns, minHeight: 46 }}>
                    <div className={`${stickyCell} flex h-full items-center gap-3 px-4`}>
                      <input type="checkbox" aria-label={`Select ${partyName(r.client.id)}`} checked={on} onChange={() => toggle(r.client.id)} className={`h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#0F7B6C] ${focus}`} />
                      <Avatar name={getBookClient(r.client.id)?.name ?? r.client.name} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={r.client.name}>
                            {r.client.name}
                          </span>
                          <span className={`shrink-0 whitespace-nowrap text-[12px] font-semibold ${tag.cls}`}>{tag.text}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          {r.client.label && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 text-[11px] font-semibold leading-[18px] text-slate-600">{r.client.label}</span>}
                          <span className="truncate font-mono text-[12px] tracking-tight text-muted">{id}</span>
                        </div>
                      </div>
                    </div>
                    {r.cells.map((s, i) => (
                      <div key={docs[i].id} className="flex justify-center py-1">
                        <Dot s={s} label={docs[i].name} />
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
          <Pagination
            p={paging}
            noun="clients"
            compact
            middle={<Legend />}
          />
        </div>
      )}

      <Toast message={toast} />

      {/* Appears when clients are ticked. */}
      {ticked.size > 0 && (
        <div role="region" aria-label="Selected clients" className="absolute bottom-20 left-1/2 z-40 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center gap-3 rounded-2xl bg-ink px-5 py-3 text-white shadow-[0_16px_40px_rgba(17,27,33,0.35)]">
          <b className="text-sm">
            {ticked.size} {ticked.size === 1 ? 'client' : 'clients'} selected
          </b>
          <button type="button" disabled={toAsk.length === 0 || !canAsk} onClick={ask} className={`flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-40 ${focus}`}>
            <Send size={15} />
            Ask for missing documents{toAsk.length > 0 && toAsk.length !== ticked.size ? ` (${toAsk.length})` : ''}
          </button>
          <button type="button" onClick={resetTicks} className={`flex h-10 items-center gap-1.5 rounded-xl border border-white/25 px-3.5 text-sm font-semibold hover:bg-white/10 ${focus}`}>
            <X size={15} />
            Clear
          </button>
          {!canAsk ? <span className="text-[13px] text-white/70">Requests are made for {CURRENT_FY}. Switch the year to ask.</span> : toAsk.length === 0 && <span className="text-[13px] text-white/70">Nothing is missing for these clients.</span>}
        </div>
      )}
    </div>
  )
}
