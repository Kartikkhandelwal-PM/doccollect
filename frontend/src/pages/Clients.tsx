import { motion } from 'framer-motion'
import { rowIn } from '../lib/motion'
import { ChevronRight, RefreshCw, Search } from 'lucide-react'
import Page from '../components/Page'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Pagination, { usePaging } from '../components/Pagination'
import { mainContact, useContacts } from '../data/contacts'
import { book } from '../data/mock'
import EmptyState from '../components/EmptyState'
import { serviceColor } from '../lib/status'
import { rowFocus, rowKeys, trHover } from '../lib/ui'
import FilterSelect from '../components/FilterSelect'

const MotionLink = motion.create(Link)

type Filter = 'All' | 'GST' | 'TDS' | 'GST+TDS' | 'Many' | 'ITR'
type Work = 'All' | 'Open' | 'Overdue' | 'None'
const filterLabel: Record<Filter, string> = { All: 'Any registration', GST: 'Has GST', TDS: 'Has TDS', 'GST+TDS': 'Has GST and TDS', Many: 'Multiple GSTINs or TANs', ITR: 'Income tax only' }
const workLabel: Record<Work, string> = { All: 'All clients', Open: 'With open requests', Overdue: 'Overdue', None: 'Nothing open' }

export default function Clients() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  useContacts()
  const fromLink = params.get('service')
  const [filter, setFilter] = useState<Filter>(fromLink === 'GST' || fromLink === 'TDS' ? fromLink : fromLink === 'ITR' ? 'ITR' : 'All')
  const [work, setWork] = useState<Work>('All')
  const [query, setQuery] = useState('')

  // One row per client. A client has an ITR (on the PAN), and maybe GSTINs and TANs; the filter shows clients that have that kind.
  const q = query.trim().toLowerCase()
  const count = (c: (typeof book)[number], t: 'GST' | 'TDS') => c.registrations.filter((r) => r.type === t).length
  const list = book.filter(
    (c) =>
      (filter === 'All' ||
        (filter === 'GST' && count(c, 'GST') > 0) ||
        (filter === 'TDS' && count(c, 'TDS') > 0) ||
        (filter === 'GST+TDS' && count(c, 'GST') > 0 && count(c, 'TDS') > 0) ||
        (filter === 'Many' && (count(c, 'GST') > 1 || count(c, 'TDS') > 1)) ||
        (filter === 'ITR' && count(c, 'GST') === 0 && count(c, 'TDS') === 0)) &&
      (work === 'All' || (work === 'Open' && c.openRequests > 0) || (work === 'Overdue' && c.note === 'Overdue') || (work === 'None' && c.openRequests === 0)) &&
      (q === '' || `${c.name} ${c.pan} ${c.registrations.map((r) => r.number).join(' ')} ${c.contacts.map((x) => `${x.name} ${x.phone} ${x.email}`).join(' ')}`.toLowerCase().includes(q)),
  )
  const paging = usePaging(list, `${filter}|${work}|${query}`)

  return (
    <Page
      header={
<div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">Clients</h1>
          <p className="mt-0.5 text-sm text-muted">{book.length === 0 ? 'Not synced yet' : 'Last synced from KDK today, 08:30'}</p>
        </div>
        <div className="flex gap-3">
          <button type="button" aria-label="Sync from KDK" className="flex h-11 shrink-0 items-center whitespace-nowrap gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold max-md:w-11 max-md:justify-center max-md:px-0">
            <RefreshCw size={16} />
            <span className="max-md:hidden">Sync from KDK</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        <FilterSelect value={filter} onChange={(v) => setFilter(v as Filter)} label="Filter by registration" width="w-[210px]">
          {(Object.keys(filterLabel) as Filter[]).map((f) => (
            <option key={f} value={f}>{filterLabel[f]}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={work} onChange={(v) => setWork(v as Work)} label="Filter by requests" width="w-[190px]">
          {(Object.keys(workLabel) as Work[]).map((w) => (
            <option key={w} value={w}>{workLabel[w]}</option>
          ))}
        </FilterSelect>
        <label className="flex h-11 w-80 items-center max-md:w-full gap-2.5 rounded-xl border border-line bg-white px-4 text-sm text-muted">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-muted"
            placeholder="Name, PAN, GSTIN, TAN or number"
          />
        </label>
      </div>
</div>
      }
    >
      <div className="overflow-clip rounded-[18px] border border-line bg-white">
        {book.length === 0 && (
          <EmptyState art="clients" title="No clients yet" text="Your clients come from KDK: one record for each PAN, with their GSTINs and TANs. Sync to bring them in, then send a request." >
            <button type="button" className="flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white">
              <RefreshCw size={16} /> Sync from KDK
            </button>
          </EmptyState>
        )}
        {book.length > 0 && list.length === 0 && (
          <EmptyState art="search" compact title="No client found" text="Nothing matches what you typed or the filters you chose.">
            <button type="button" onClick={() => { setQuery(''); setFilter('All'); setWork('All') }} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold hover:border-brand">
              Clear filters
            </button>
          </EmptyState>
        )}
        {list.length > 0 && (
          <table className="w-full text-left max-md:hidden">
            <thead>
              <tr className="text-[12px] font-bold uppercase tracking-wider text-faint [&>th]:sticky [&>th]:-top-5 [&>th]:z-10 [&>th]:border-b [&>th]:border-line [&>th]:bg-slate-50">
                <th className="py-2.5 pl-6 pr-3 font-bold">Client</th>
                <th className="px-3 py-2.5 font-bold">Registrations</th>
                <th className="px-3 py-2.5 font-bold">Main contact</th>
                <th className="px-3 py-2.5 font-bold">Email</th>
                <th className="px-3 py-2.5 text-right font-bold">Open requests</th>
                <th className="w-10 py-2.5 pr-4" />
              </tr>
            </thead>
            <tbody>
              {paging.rows.map((c) => {
                return (
                  <tr key={c.id} {...rowKeys(() => navigate(`/clients/${c.id}`))} aria-label={`Open ${c.name}`} onClick={() => navigate(`/clients/${c.id}`)} className={`${trHover} ${rowFocus} border-b border-line last:border-b-0`}>
                    <td className="py-3 pl-6 pr-3">
                      <Link to={`/clients/${c.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
                        <Avatar name={c.name} size={40} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-semibold">{c.name}</span>
                          <span className="block text-xs text-muted">{c.pan}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {(['ITR', 'GST', 'TDS'] as const).map((t) => {
                          const regs = c.registrations.filter((r) => r.type === t)
                          return regs.length === 0 ? null : (
                            <span key={t} title={regs.map((r) => r.number).join('\n')} className={`text-xs font-bold ${serviceColor[t]}`}>
                              {t}
                              {regs.length > 1 && <span className="ml-0.5 font-semibold text-muted">({regs.length})</span>}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[13px]">
                      <div className="font-semibold">{mainContact(c).name}</div>
                      <div className="text-muted">{mainContact(c).phone}</div>
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-[13px] text-muted">{mainContact(c).email}</td>
                    <td className="px-3 py-3 text-right text-[13px] font-semibold">{c.openRequests > 0 ? <span className={c.note === 'Overdue' ? 'text-danger' : ''}>{c.openRequests}{c.note === 'Overdue' && ' · overdue'}</span> : <span className="text-faint">0</span>}</td>
                    <td className="py-3 pr-4 text-faint"><ChevronRight size={18} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {paging.rows.map((c, index) => (
          <MotionLink
            key={c.id}
            {...rowIn(index)}
            to={`/clients/${c.id}`}
            className="flex items-center gap-3 border-b border-line px-4 py-3.5 transition-colors last:border-b-0 hover:bg-slate-50 md:hidden"
          >
            <Avatar name={c.name} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="truncate text-[15px] font-semibold">{c.name}</span>
                {(['ITR', 'GST', 'TDS'] as const).map((t) => {
                  const n = c.registrations.filter((r) => r.type === t).length
                  return n === 0 ? null : (
                    <span key={t} className={`text-xs font-bold ${serviceColor[t]}`}>
                      {t}
                      {n > 1 && <span className="ml-0.5 font-semibold text-muted">({n})</span>}
                    </span>
                  )
                })}
              </div>
              <div className="truncate text-[13px] text-muted">
                {mainContact(c).name !== c.name && <span>{mainContact(c).name} · </span>}
                {mainContact(c).phone} <span className="max-md:hidden">· {mainContact(c).email}</span>
              </div>
              {(c.note || c.openRequests > 0) && (
                <div className="mt-0.5 text-xs font-semibold md:hidden">
                  <span className={c.note === 'Overdue' ? 'text-danger' : 'text-muted'}>{c.note}</span>
                  {c.note && c.openRequests > 0 && <span className="text-faint"> · </span>}
                  {c.openRequests > 0 && <span className="text-slate-700">{c.openRequests} open</span>}
                </div>
              )}
            </div>
            <ChevronRight size={18} className="text-faint" />
          </MotionLink>
        ))}
        <Pagination p={paging} noun="clients" />
      </div>
    </Page>
  )
}
