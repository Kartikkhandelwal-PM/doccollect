import { ChevronRight, Plus } from 'lucide-react'
import Page from '../components/Page'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Pagination, { usePaging } from '../components/Pagination'
import { getClient } from '../data/mock'
import { fmtDate, progress, requestState, useRequests } from '../data/requests'
import type { RequestState } from '../data/requests'

type Tab = 'all' | RequestState

const stateMeta: Record<RequestState, { label: string; className: string }> = {
  review: { label: 'Needs review', className: 'bg-warn-soft text-warn' },
  waiting: { label: 'Waiting for clients', className: 'bg-info-soft text-info' },
  completed: { label: 'Completed', className: 'bg-ok-soft text-ok' },
}

export default function Requests() {
  const { requests } = useRequests()
  const [params] = useSearchParams()
  const first = params.get('tab')
  const [tab, setTab] = useState<Tab>(first === 'review' || first === 'waiting' || first === 'completed' ? first : 'all')

  const count = (t: Tab) => (t === 'all' ? requests.length : requests.filter((r) => requestState(r) === t).length)
  const list = requests.filter((r) => tab === 'all' || requestState(r) === tab)
  const listPaging = usePaging(list, tab)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'review', label: 'Needs review' },
    { key: 'waiting', label: 'Waiting for clients' },
    { key: 'completed', label: 'Completed' },
  ]

  return (
    <Page
      header={
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">Requests</h1>
          <p className="mt-0.5 text-sm text-muted">Every document request you have sent, and where it stands.</p>
        </div>
        <Link
          to="/requests/new"
          className="flex h-11 shrink-0 items-center whitespace-nowrap gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)]"
        >
          <Plus size={16} strokeWidth={2.3} />
          New request
        </Link>
      </div>
      }
      tabs={
      <div className="flex gap-7 border-b border-line text-sm font-semibold text-muted">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex h-11 items-center border-b-[3px] ${tab === t.key ? 'border-brand text-brand-dark' : 'border-transparent hover:text-ink'}`}
          >
            {t.label}
            <span className="ml-1.5 rounded-md bg-canvas px-1.5 py-px text-xs">{count(t.key)}</span>
          </button>
        ))}
      </div>
      }
    >
      <div className="overflow-hidden rounded-[18px] border border-line bg-white">
        {list.length === 0 && <p className="p-8 text-sm text-muted">No requests here yet.</p>}
        {listPaging.rows.map((r) => {
          const p = progress(r)
          const st = stateMeta[requestState(r)]
          const pct = p.total ? Math.round((p.received / p.total) * 100) : 0
          const people = r.clients.map((c) => getClient(c.clientId)).filter((c) => c !== undefined)
          return (
            <Link
              key={r.id}
              to={`/requests/${r.id}`}
              className="flex items-center gap-5 border-b border-line px-6 py-4 last:border-b-0 hover:bg-slate-50"
            >
              <div className="flex w-[136px] shrink-0 -space-x-2">
                {people.slice(0, 3).map((c) => (
                  <span key={c.id} className="rounded-full ring-2 ring-white">
                    <Avatar name={c.name} size={40} />
                  </span>
                ))}
                {people.length > 3 && (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas text-xs font-bold text-slate-600 ring-2 ring-white">+{people.length - 3}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">
                  {r.title} <span className="ml-1 text-xs font-medium text-muted">{r.ref}</span>
                </div>
                <div className="truncate text-[13px] text-muted">
                  {people.length === 1 ? people[0].name : `${people.length} clients: ${people.slice(0, 2).map((c) => c.name).join(', ')}${people.length > 2 ? ` and ${people.length - 2} more` : ''}`} · sent {fmtDate(r.createdAt)}
                </div>
              </div>
              <div className="flex w-48 items-center gap-2.5">
                <div className="h-1.5 flex-1 rounded-full bg-line">
                  <div className="h-1.5 rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[13px] font-semibold text-slate-600">
                  {p.received} / {p.total}
                </span>
              </div>
              <div className="w-40">
                <span className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${st.className}`}>
                  {requestState(r) === 'review' ? `${p.toReview} to review` : st.label}
                </span>
              </div>
              <div className="w-20 text-right text-[13px] font-semibold text-slate-600">Due {fmtDate(r.due)}</div>
              <ChevronRight size={18} className="text-faint" />
            </Link>
          )
        })}
        <Pagination p={listPaging} noun="requests" />
      </div>
    </Page>
  )
}
