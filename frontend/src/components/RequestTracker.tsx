import { useState } from 'react'
import Avatar from './Avatar'
import Pagination, { usePaging } from './Pagination'
import { SortButton, SortMark } from './SortHead'
import type { SortDir } from './SortHead'
import { Dot, Legend } from './StatusDot'
import type { Cell } from './StatusDot'
import type { Client } from '../data/types'
import type { DocRequest, RequestClient } from '../data/requests'

export interface TrackerRow {
  rc: RequestClient
  c: Client
  missing: number
  toReview: number
  late: boolean
  state: string
}

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

// This request as a grid: a client per row and a document per column, with one dot in each cell.
// A dot that has a file opens that file in the preview. A client who was not asked for a document has a dash there.
// A click on a heading sorts by it (the sort itself is kept by the page, so the list and the grid share it).
export default function RequestTracker({
  request,
  rows,
  allRows,
  info,
  sort,
  onSort,
  onOpen,
}: {
  request: DocRequest
  rows: TrackerRow[] // the clients that pass the filters, already in order
  allRows: TrackerRow[] // every client of the request, for the counts under each document
  info: (clientId: string) => { number: string; place: string } | null
  sort: { by: string; dir: SortDir } | null
  onSort: (by: string) => void
  onOpen: (clientId: string, docId: string) => void
}) {
  // The documents of the request, in the order they were asked. Clients may have been asked for different ones.
  const docs: { id: string; name: string }[] = []
  for (const rc of request.clients) for (const d of rc.docs) if (!docs.some((x) => x.id === d.id)) docs.push({ id: d.id, name: d.name })

  const cellOf = (rc: RequestClient, docId: string): Cell => {
    const d = rc.docs.find((x) => x.id === docId)
    if (!d) return 'na'
    return d.status === 'approved' ? 'ok' : d.status === 'to_review' ? 'rv' : d.status === 'na' ? 'na' : d.status === 'rejected' ? 'rj' : d.optional ? 'op' : 'miss'
  }
  const paging = usePaging(rows, `${rows.length}|${rows[0]?.rc.clientId}|${rows[rows.length - 1]?.rc.clientId}`, [25, 50, 100])
  // Per document: how many of the clients who were asked for it have sent it (approved or waiting for review).
  const column = docs.map((d) => {
    const asked = allRows.filter((r) => r.rc.docs.some((x) => x.id === d.id && x.status !== 'na'))
    const got = asked.filter((r) => ['ok', 'rv'].includes(cellOf(r.rc, d.id))).length
    return { got, asked: asked.length }
  })

  // The shadow on the frozen column shows only once the table has been scrolled sideways.
  const [scrolled, setScrolled] = useState(false)
  const edge = scrolled ? 'shadow-[3px_0_5px_-3px_rgba(17,27,33,0.28)]' : ''
  const columns = `300px repeat(${Math.max(docs.length, 1)}, minmax(88px,1fr))`
  const sticky = `sticky left-0 z-10 border-r border-line bg-inherit transition-shadow ${edge}`
  const dirOf = (by: string) => (sort?.by === by ? sort.dir : null)
  if (rows.length === 0) return <p className="p-8 text-sm text-muted">No clients match.</p>

  return (
    <div>
      <div className="relative isolate max-h-[calc(100vh-318px)] min-h-[240px] overflow-auto" onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}>
        <div style={{ minWidth: 300 + docs.length * 96 }}>
          <div className="sticky top-0 z-20 grid items-stretch border-b border-line bg-[#F7F9FA] text-[13px] font-semibold text-slate-700" style={{ gridTemplateColumns: columns }}>
            <div className={`sticky left-0 z-30 flex items-center gap-3 border-r border-line bg-[#F7F9FA] px-4 py-2.5 transition-shadow ${edge}`}>
              <div className="min-w-0 flex-1">
                <SortButton on={dirOf('client')} onClick={() => onSort('client')} label="Sort by client name">
                  Client
                </SortButton>
                <div className="text-xs font-medium text-muted">{rows.length === allRows.length ? `${allRows.length} ${allRows.length === 1 ? 'client' : 'clients'}` : `${rows.length} of ${allRows.length}`}</div>
              </div>
              <SortButton on={dirOf('status')} onClick={() => onSort('status')} label="Sort by status, to review first">
                Status
              </SortButton>
            </div>
            {docs.map((d, i) => (
              <button key={d.id} type="button" onClick={() => onSort(`doc:${d.id}`)} aria-label={`Sort by ${d.name}, missing first`} title="Click to sort, missing first" className={`group relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-center transition-colors hover:bg-slate-100 ${focus}`}>
                <SortMark dir={dirOf(`doc:${d.id}`)} className="absolute right-1.5 top-2" />
                <span className="line-clamp-2 leading-tight" title={d.name}>
                  {d.name}
                </span>
                <span className="whitespace-nowrap text-[11px] font-medium text-muted">
                  {column[i].got} / {column[i].asked}
                  {request.clients.some((rc) => rc.docs.find((x) => x.id === d.id)?.optional) && <span className="ml-1 text-slate-400">· optional</span>}
                </span>
              </button>
            ))}
          </div>

          {paging.rows.map((r) => {
            const tag =
              r.state === 'review'
                ? { text: `${r.toReview} to review`, cls: 'text-[#B45309]' }
                : r.late
                  ? { text: 'Overdue', cls: 'text-danger' }
                  : r.missing > 0
                    ? { text: `${r.missing} missing`, cls: 'text-[#B45309]' }
                    : { text: 'Complete', cls: 'text-brand-dark' }
            const reg = info(r.c.id)
            return (
              <div key={r.rc.clientId} className="grid items-center border-b border-[#EEF1F3] bg-white transition-colors last:border-b-0 hover:bg-[#F6F8FA]" style={{ gridTemplateColumns: columns, minHeight: 46 }}>
                <div className={`${sticky} flex h-full items-center gap-3 px-4`}>
                  <Avatar name={r.c.name} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={r.c.name}>
                        {r.c.name}
                      </span>
                      <span className={`shrink-0 whitespace-nowrap text-[12px] font-semibold ${tag.cls}`}>{tag.text}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {r.c.label && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 text-[11px] font-semibold leading-[18px] text-slate-600">{r.c.label}</span>}
                      <span className="truncate font-mono text-[12px] tracking-tight text-muted">{reg?.number}</span>
                    </div>
                  </div>
                </div>
                {docs.map((d) => {
                  const s = cellOf(r.rc, d.id)
                  const label = `${r.c.name}, ${d.name}`
                  return (
                    <div key={d.id} className="flex justify-center py-1">
                      {s === 'ok' || s === 'rv' ? (
                        <button type="button" onClick={() => onOpen(r.rc.clientId, d.id)} aria-label={`Open ${label}`} title="Open the file" className={`flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 ${focus}`}>
                          <Dot s={s} label={label} />
                        </button>
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center">
                          <Dot s={s} label={label} />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      <Pagination p={paging} noun="clients" compact middle={<Legend notAsked />} />
    </div>
  )
}
