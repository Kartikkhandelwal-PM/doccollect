import { ChevronRight, Plus, RefreshCw, Search } from 'lucide-react'
import Page from '../components/Page'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Pagination, { usePaging } from '../components/Pagination'
import { clients } from '../data/mock'
import type { Service } from '../data/types'
import { serviceColor } from '../lib/status'

type Filter = 'All' | Service

export default function Clients() {
  const [params] = useSearchParams()
  const fromLink = params.get('service')
  const [filter, setFilter] = useState<Filter>(fromLink === 'GST' || fromLink === 'TDS' || fromLink === 'ITR' ? fromLink : 'All')
  const [query, setQuery] = useState('')

  const list = clients.filter(
    (c) =>
      (filter === 'All' || c.service === filter) &&
      (query === '' || `${c.name} ${c.phone} ${c.pan}`.toLowerCase().includes(query.toLowerCase())),
  )
  const paging = usePaging(list, `${filter}|${query}`)

  return (
    <Page
      header={
<div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">Clients</h1>
          <p className="mt-0.5 text-sm text-muted">Last synced from KDK today, 08:30</p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="flex h-11 shrink-0 items-center whitespace-nowrap gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold">
            <RefreshCw size={16} />
            Sync from KDK
          </button>
          <button type="button" className="flex h-11 shrink-0 items-center whitespace-nowrap gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)]">
            <Plus size={16} strokeWidth={2.3} />
            Add client
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex rounded-xl bg-[#E9EEF5] p-1 text-sm font-semibold text-slate-600">
          {(['All', 'GST', 'TDS', 'ITR'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-[9px] px-4 py-2 ${filter === f ? 'bg-white text-ink shadow-sm' : ''}`}
            >
              {f}
            </button>
          ))}
        </div>
        <label className="flex h-11 w-80 items-center gap-2.5 rounded-xl border border-line bg-white px-4 text-sm text-muted">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-muted"
            placeholder="Search by name, number or PAN"
          />
        </label>
      </div>
</div>
      }
    >
      <div className="overflow-hidden rounded-[18px] border border-line bg-white">
        {list.length === 0 && <p className="p-8 text-sm text-muted">No clients match your search.</p>}
        {paging.rows.map((c) => (
          <Link
            key={c.id}
            to={`/clients/${c.id}`}
            className="flex items-center gap-4 border-b border-line px-6 py-3.5 last:border-b-0 hover:bg-slate-50"
          >
            <Avatar name={c.name} kind={c.kind} size={44} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">
                {c.name} <span className={`ml-1 text-xs font-bold ${serviceColor[c.service]}`}>{c.service}</span>
              </div>
              <div className="text-[13px] text-muted">
                {c.phone} · {c.email}
              </div>
            </div>
            <div className={`w-44 text-xs font-semibold ${c.note === 'Overdue' ? 'text-danger' : c.sharedWith ? 'text-amber-700' : 'text-muted'}`}>
              {c.note ?? c.source}
            </div>
            <div className="w-28 text-right text-[13px] font-semibold">
              {c.openRequests > 0 ? `${c.openRequests} open request` : 'No open'}
            </div>
            <ChevronRight size={18} className="text-faint" />
          </Link>
        ))}
        <Pagination p={paging} noun="clients" />
      </div>
    </Page>
  )
}
