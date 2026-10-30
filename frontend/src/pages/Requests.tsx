import { ChevronRight, Plus, Search } from 'lucide-react'
import Page from '../components/Page'
import { AnimatePresence, motion } from 'framer-motion'
import { Fragment, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Pagination, { usePaging } from '../components/Pagination'
import { getBookClient, getClient, parentIdOf, partyName } from '../data/mock'
import { fmtDate, isCounted, isReceived, lineRef, progress, reminderDate, reminderTime, requestState, useRequests } from '../data/requests'
import type { DocRequest, RequestState } from '../data/requests'
import { daysUntil } from '../lib/dates'
import { SHARED_NUMBER_NAME } from '../lib/brand'
import { ease, rowIn } from '../lib/motion'
import { rowFocus, rowHover, rowKeys } from '../lib/ui'
import FilterSelect from '../components/FilterSelect'
import EmptyState from '../components/EmptyState'

type Tab = 'all' | RequestState

const stateMeta: Record<RequestState, { label: string; className: string }> = {
  review: { label: 'To review', className: 'bg-warn-soft text-warn' },
  waiting: { label: 'Waiting', className: 'bg-info-soft text-info' },
  completed: { label: 'Completed', className: 'bg-ok-soft text-ok' },
}

// On a phone every request is a small card instead of a table row.
const GRID = 'grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_104px_minmax(150px,1fr)_120px] items-center gap-3 px-5 @max-4xl:flex @max-4xl:flex-wrap @max-4xl:gap-x-3 @max-4xl:gap-y-2.5 @max-4xl:px-4'
const SHOW_CLIENTS = 5

// A request is late when its last date has passed and it is not complete.
const isLate = (r: DocRequest) => requestState(r) !== 'completed' && daysUntil(r.due) < 0

function DueCell({ r }: { r: DocRequest }) {
  const days = daysUntil(r.due)
  const done = requestState(r) === 'completed'
  return (
    <span>
      <span className="block text-sm font-semibold">{fmtDate(r.due)}</span>
      {!done && days < 0 && <span className="text-xs font-semibold text-danger">{-days} {days === -1 ? 'day' : 'days'} late</span>}
      {!done && days === 0 && <span className="text-xs font-semibold text-warn">Today</span>}
      {!done && days > 0 && <span className="text-xs text-muted">In {days} {days === 1 ? 'day' : 'days'}</span>}
    </span>
  )
}

export default function Requests() {
  const { requests } = useRequests()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const first = params.get('tab')
  const [tab, setTab] = useState<Tab>(first === 'review' || first === 'waiting' || first === 'completed' ? first : 'all')
  const [query, setQuery] = useState('')
  const [due, setDue] = useState<'all' | 'late' | 'week' | 'later'>('all')
  const [from, setFrom] = useState<'all' | 'own' | 'kdk'>('all')
  const [open, setOpen] = useState<Set<string>>(new Set())

  const q = query.trim().toLowerCase()
  // The search and the two filters first. The tabs then split what is left, and their counts say how many requests each one has under those filters.
  const filtered = requests.filter((r) => {
    if (from !== 'all' && r.via !== from) return false
    if (due !== 'all') {
      const days = daysUntil(r.due)
      const done = requestState(r) === 'completed'
      if (due === 'late' && !isLate(r)) return false
      if (due === 'week' && (done || days < 0 || days > 7)) return false
      if (due === 'later' && (done || days <= 7)) return false
    }
    if (q) {
      const names = r.clients.map((c) => partyName(c.clientId)).join(' ')
      // also each client's PAN, GSTIN or TAN, and mobile, so a number typed from a document finds the request
      const numbers = r.clients.map((c) => `${getBookClient(c.clientId)?.pan ?? ''} ${getBookClient(c.clientId)?.registrations.find((x) => x.id === c.clientId)?.number ?? ''} ${getClient(c.clientId)?.phone ?? ''}`).join(' ')
      const hay = `${r.title} ${r.ref} ${r.clients.map((c) => lineRef(r, c.clientId)).join(' ')} ${names} ${numbers}`.toLowerCase()
      if (!q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false
    }
    return true
  })
  // Where a client stands in a request, so a tab can show only the clients it is about.
  const standing = (rc: DocRequest['clients'][number]): RequestState => {
    const counted = rc.docs.filter(isCounted)
    if (counted.some((d) => d.status === 'to_review')) return 'review'
    if (counted.some((d) => d.status === 'pending' || d.status === 'rejected')) return 'waiting'
    return 'completed'
  }
  // A request is under a tab when any of its clients is in that state (so a request with one client to review and one waiting is under both).
  // Completed is only for a request where everything is approved.
  const inTab = (r: DocRequest, key: Tab) => key === 'all' || (key === 'completed' ? requestState(r) === 'completed' : r.clients.some((rc) => standing(rc) === key))
  const list = filtered.filter((r) => inTab(r, tab))
  const countOf = (key: Tab) => filtered.filter((r) => inTab(r, key)).length
  const listPaging = usePaging(list, `${tab}|${query}|${due}|${from}`)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'review', label: 'To review' },
    { key: 'waiting', label: 'Waiting' },
    { key: 'completed', label: 'Completed' },
  ]
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

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
    >
      <div className="@container overflow-clip rounded-[18px] border border-line bg-white">
        {/* The filters and the column names stay in view while the list scrolls under them */}
        <div className="sticky -top-5 z-10 bg-white">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-line px-4 py-3 md:px-6">
          <div role="group" aria-label="Show requests" className="flex max-w-full shrink-0 overflow-x-auto rounded-xl bg-[#E9EEF5] p-1 text-[13px] font-semibold text-slate-600">
            {tabs.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-pressed={tab === t.key} className={`shrink-0 whitespace-nowrap rounded-[9px] px-3.5 py-2 ${tab === t.key ? 'bg-white text-ink shadow-sm' : 'hover:text-ink'}`}>
                {t.label} <span className="ml-0.5 text-xs text-muted">{countOf(t.key)}</span>
              </button>
            ))}
          </div>
          <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-xl bg-canvas px-3.5 text-sm text-muted @max-4xl:min-w-full">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients or requests" aria-label="Search client, request number, PAN, GSTIN or mobile" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
          </label>
          <FilterSelect value={due} onChange={(v) => setDue(v as typeof due)} label="Last date" width="w-[190px]" named active={due !== 'all'}>
            <option value="all">Any</option>
            <option value="late">Late</option>
            <option value="week">In 7 days</option>
            <option value="later">Later</option>
          </FilterSelect>
          <FilterSelect value={from} onChange={(v) => setFrom(v as typeof from)} label="Sent from" width="w-[230px]" named active={from !== 'all'}>
            <option value="all">Any number</option>
            <option value="own">Your WhatsApp</option>
            <option value="kdk">{SHARED_NUMBER_NAME}</option>
          </FilterSelect>
        </div>

        <div className={`${GRID} @max-4xl:hidden border-b border-line bg-slate-50/80 py-2.5 text-[12px] font-bold uppercase tracking-wider text-faint`}>
          <span className="pl-[26px]">Request</span>
          <span>Clients</span>
          <span>Last date</span>
          <span>Documents</span>
          <span>Status</span>
        </div>
        </div>

        {requests.length === 0 && (
          <EmptyState art="requests" title="No requests yet" text="A request asks your clients for a checklist of documents on WhatsApp. Make the first one, then follow its progress here.">
            <Link to="/requests/new" className="flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white">
              <Plus size={16} /> New request
            </Link>
          </EmptyState>
        )}
        {requests.length > 0 && list.length === 0 && (
          <EmptyState art="search" compact title="No request found" text="Nothing matches what you typed or the filters you chose.">
            <button type="button" onClick={() => { setQuery(''); setDue('all'); setFrom('all'); setTab('all') }} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold hover:border-brand">
              Clear filters
            </button>
          </EmptyState>
        )}
        {listPaging.rows.map((r, index) => {
          const p = progress(r)
          const st = stateMeta[requestState(r)]
          const pct = p.total ? Math.round((p.received / p.total) * 100) : 0
          const rows = r.clients.map((c) => getClient(c.clientId)).filter((c) => c !== undefined)
          // A client with several GSTINs counts once; the line under it says which ones.
          const people = rows.filter((c, i) => rows.findIndex((o) => parentIdOf(o.id) === parentIdOf(c.id)) === i)
          const isOpen = open.has(r.id)
          // How the clients stand, shown under their names: how many have something to review, and how many still owe documents.
          const reviewing = r.clients.filter((rc) => rc.docs.some((d) => d.status === 'to_review')).length
          const owing = r.clients.filter((rc) => {
            const counted = rc.docs.filter(isCounted)
            return !counted.some((d) => d.status === 'to_review') && counted.some((d) => d.status === 'pending' || d.status === 'rejected')
          }).length
          // A tab shows only the counts, and (when opened) only the clients, that it is about.
          const showReviewing = reviewing > 0 && (tab === 'all' || tab === 'review')
          const showOwing = owing > 0 && (tab === 'all' || tab === 'waiting')
          const shownClients = r.clients.filter((rc) => tab === 'all' || standing(rc) === tab)
          return (
            <Fragment key={r.id}>
              <motion.div {...rowIn(index)} {...rowKeys(() => navigate(`/requests/${r.id}`))} aria-label={`Open ${r.title} ${r.ref}`} onClick={() => navigate(`/requests/${r.id}`)} className={`${GRID} min-h-[68px] ${rowHover} ${rowFocus} border-b border-line py-3 @max-4xl:py-3.5 ${isOpen ? 'bg-slate-50' : ''}`}>
                <div className="flex min-w-0 items-center gap-2 @max-4xl:order-1 @max-4xl:flex-[1_1_40%]">
                {people.length <= 1 ? (
                  <span className="w-[18px] shrink-0" />
                ) : (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? `Hide clients of ${r.ref}` : `Show clients of ${r.ref}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(r.id)
                  }}
                  className="-m-2.5 flex shrink-0 items-center justify-center p-2.5 text-muted hover:text-ink"
                >
                  <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={ease} className="flex">
                    <ChevronRight size={18} />
                  </motion.span>
                </button>
                )}
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold">{r.title}</div>
                    <div className="truncate text-xs text-muted">
                      {r.ref} · sent {fmtDate(r.createdAt)}
                      {r.via === 'kdk' && ` · ${SHARED_NUMBER_NAME}`}
                    </div>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-2.5 @max-4xl:order-3 @max-4xl:flex-[1_1_58%]">
                  {people.length === 1 ? (
                    <Avatar name={people[0].name} size={32} />
                  ) : (
                    <div className="flex shrink-0 -space-x-1.5">
                      {people.slice(0, 3).map((c) => (
                        <span key={c.id} className="rounded-full ring-2 ring-white">
                          <Avatar name={c.name} size={30} />
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{people.length === 1 ? people[0].name : `${people.length} clients`}</div>
                    {people.length === 1 && rows.length > 1 && <div className="truncate text-xs text-muted">{rows.map((c) => c.label ?? c.service).join(', ')}</div>}
                    {people.length > 1 && (showReviewing || showOwing) && (
                      <div className="truncate text-xs font-semibold">
                        {showReviewing && <span className="text-warn">{reviewing} to review</span>}
                        {showReviewing && showOwing && <span className="text-faint"> · </span>}
                        {showOwing && <span className={isLate(r) ? 'text-danger' : 'text-muted'}>{owing} {isLate(r) ? 'late' : 'waiting'}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="@max-4xl:order-4 @max-4xl:shrink-0 @max-4xl:text-right"><DueCell r={r} /></div>
                <div className="@max-4xl:order-5 @max-4xl:basis-full">
                  <div className="flex items-center gap-2.5">
                    <div className="h-1.5 flex-1 rounded-full bg-line">
                      <motion.div className="h-1.5 rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }} />
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    <b className="font-semibold text-slate-700">{p.received}</b> of {p.total} received
                  </div>
                </div>
                <div className="@max-4xl:order-2 @max-4xl:shrink-0">
                  <span className={`inline-block rounded-md px-2 py-1 text-[12px] font-semibold uppercase tracking-wide ${st.className}`}>{st.label}</span>
                </div>
              </motion.div>

              <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="more"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                <div className="border-b border-line bg-slate-50/70 py-2 pl-[48px] pr-5 @max-4xl:pl-4 @max-4xl:pr-3">
                  <div className="grid grid-cols-[minmax(0,1.4fr)_150px_150px_170px] gap-4 px-3 @max-4xl:grid-cols-[minmax(0,1fr)_64px_auto] @max-4xl:gap-2 py-1.5 text-[12px] font-bold uppercase tracking-wider text-faint">
                    <span>Client</span>
                    <span>Documents</span>
                    <span>Status</span>
                    <span className="@max-4xl:hidden">Last reminder</span>
                  </div>
                  {shownClients.slice(0, SHOW_CLIENTS).map((rc) => {
                    const c = getClient(rc.clientId)
                    const counted = rc.docs.filter(isCounted)
                    const got = counted.filter(isReceived).length
                    const toReview = counted.filter((d) => d.status === 'to_review').length
                    const missing = counted.filter((d) => d.status === 'pending' || d.status === 'rejected').length
                    const label = toReview > 0 ? `${toReview} to review` : missing > 0 ? 'Waiting' : 'Complete'
                    const tone = toReview > 0 ? 'bg-warn-soft text-warn' : missing > 0 ? 'bg-info-soft text-info' : 'bg-ok-soft text-ok'
                    return (
                      <Link key={rc.clientId} to={`/requests/${r.id}?client=${rc.clientId}`} className="grid grid-cols-[minmax(0,1.4fr)_150px_150px_170px] items-center gap-4 rounded-lg px-3 py-2 text-sm hover:bg-white @max-4xl:grid-cols-[minmax(0,1fr)_64px_auto] @max-4xl:gap-2">
                        <span className="flex min-w-0 items-center gap-2.5">
                          {c && <Avatar name={c.name} size={28} />}
                          <span className="truncate font-semibold">{partyName(rc.clientId)}</span>
                        </span>
                        <span className="text-[13px] text-muted">
                          <b className="font-semibold text-slate-700">{got}</b> of {counted.length}
                        </span>
                        <span>
                          <span className={`inline-block rounded-md px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide ${tone}`}>{label}</span>
                        </span>
                        <span className="text-[13px] text-muted @max-4xl:hidden">{rc.lastReminder ? `${reminderDate(rc.lastReminder)}, ${reminderTime(rc.lastReminder)}` : 'None yet'}</span>
                      </Link>
                    )
                  })}
                  {shownClients.length > SHOW_CLIENTS && (
                    <Link to={`/requests/${r.id}`} className="ml-3 mt-1 inline-block py-1.5 text-[13px] font-semibold text-brand-dark hover:underline">
                      View all {shownClients.length} {tab === 'all' ? '' : `${tab === 'review' ? 'to review ' : tab === 'waiting' ? 'waiting ' : 'completed '}`}clients
                    </Link>
                  )}
                </div>
                </motion.div>
              )}
              </AnimatePresence>
            </Fragment>
          )
        })}
        <Pagination p={listPaging} noun="requests" />
      </div>
    </Page>
  )
}
