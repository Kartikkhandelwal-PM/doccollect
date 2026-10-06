import { ChevronRight, Plus, Search } from 'lucide-react'
import Page from '../components/Page'
import { AnimatePresence, motion } from 'framer-motion'
import { Fragment, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Pagination, { usePaging } from '../components/Pagination'
import { getClient } from '../data/mock'
import { fmtDate, isReceived, progress, requestState, useRequests } from '../data/requests'
import type { DocRequest, RequestState } from '../data/requests'
import { daysUntil } from '../lib/dates'
import { SHARED_NUMBER_NAME } from '../lib/brand'
import { ease, rowIn } from '../lib/motion'

type Tab = 'all' | RequestState

const stateMeta: Record<RequestState, { label: string; className: string }> = {
  review: { label: 'Needs review', className: 'bg-warn-soft text-warn' },
  waiting: { label: 'Waiting for clients', className: 'bg-info-soft text-info' },
  completed: { label: 'Completed', className: 'bg-ok-soft text-ok' },
}

// On a phone every request is a small card instead of a table row.
const GRID = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_130px_110px_170px_150px] items-center gap-4 px-5 @max-4xl:flex @max-4xl:flex-wrap @max-4xl:gap-x-3 @max-4xl:gap-y-2.5 @max-4xl:px-4'
const selectCls = 'h-10 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand @max-4xl:min-w-0 @max-4xl:flex-1 @max-4xl:px-2 @max-4xl:text-[13px]'
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
  const list = requests.filter((r) => {
    if (tab !== 'all' && requestState(r) !== tab) return false
    if (from !== 'all' && r.via !== from) return false
    if (due !== 'all') {
      const days = daysUntil(r.due)
      const done = requestState(r) === 'completed'
      if (due === 'late' && !isLate(r)) return false
      if (due === 'week' && (done || days < 0 || days > 7)) return false
      if (due === 'later' && (done || days <= 7)) return false
    }
    if (q) {
      const names = r.clients.map((c) => getClient(c.clientId)?.name ?? '').join(' ')
      if (!`${r.title} ${r.ref} ${names}`.toLowerCase().includes(q)) return false
    }
    return true
  })
  const listPaging = usePaging(list, `${tab}|${query}|${due}|${from}`)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'review', label: 'Needs review' },
    { key: 'waiting', label: 'Waiting for clients' },
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
      tabs={
      <div className="flex gap-7 overflow-x-auto border-b border-line text-sm font-semibold text-muted">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex h-11 shrink-0 items-center whitespace-nowrap border-b-[3px] ${tab === t.key ? 'border-brand text-brand-dark' : 'border-transparent hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      }
    >
      <div className="@container overflow-clip rounded-[18px] border border-line bg-white">
        {/* The filters and the column names stay in view while the list scrolls under them */}
        <div className="sticky -top-5 z-10 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 md:px-6 md:py-4">
          <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl bg-canvas px-3.5 text-sm text-muted @max-4xl:min-w-full">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client or request number" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
          </label>
          <select value={due} onChange={(e) => setDue(e.target.value as typeof due)} className={selectCls} aria-label="Last date">
            <option value="all">Any last date</option>
            <option value="late">Late</option>
            <option value="week">Due in 7 days</option>
            <option value="later">Due later</option>
          </select>
          <select value={from} onChange={(e) => setFrom(e.target.value as typeof from)} className={selectCls} aria-label="Sent from">
            <option value="all">All numbers</option>
            <option value="own">Your WhatsApp</option>
            <option value="kdk">{SHARED_NUMBER_NAME}</option>
          </select>
        </div>

        <div className={`${GRID} @max-4xl:hidden border-b border-line bg-slate-50/80 py-2.5 text-[11px] font-bold uppercase tracking-wider text-faint`}>
          <span className="pl-[26px]">Request</span>
          <span>Clients</span>
          <span>Sent</span>
          <span>Last date</span>
          <span>Documents</span>
          <span>Status</span>
        </div>
        </div>

        {list.length === 0 && <p className="p-8 text-sm text-muted">No requests match.</p>}
        {listPaging.rows.map((r, index) => {
          const p = progress(r)
          const st = stateMeta[requestState(r)]
          const pct = p.total ? Math.round((p.received / p.total) * 100) : 0
          const people = r.clients.map((c) => getClient(c.clientId)).filter((c) => c !== undefined)
          const isOpen = open.has(r.id)
          // How the clients stand, shown under their names: how many have something to review, and how many still owe documents.
          const reviewing = r.clients.filter((rc) => rc.docs.some((d) => d.status === 'to_review')).length
          const owing = r.clients.filter((rc) => {
            const counted = rc.docs.filter((d) => d.status !== 'na')
            return !counted.some((d) => d.status === 'to_review') && counted.some((d) => d.status === 'pending' || d.status === 'rejected')
          }).length
          return (
            <Fragment key={r.id}>
              <motion.div {...rowIn(index)} onClick={() => navigate(`/requests/${r.id}`)} className={`${GRID} min-h-[68px] cursor-pointer border-b border-line py-3 transition-colors hover:bg-slate-50 @max-4xl:py-3.5 ${isOpen ? 'bg-slate-50' : ''}`}>
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
                  className="-m-1.5 flex shrink-0 items-center justify-center p-1.5 text-muted hover:text-ink"
                >
                  <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={ease} className="flex">
                    <ChevronRight size={18} />
                  </motion.span>
                </button>
                )}
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold">{r.title}</div>
                    <div className="text-xs text-muted">{r.ref}</div>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-2.5 @max-4xl:order-3 @max-4xl:flex-[1_1_58%]">
                  {people.length === 1 ? (
                    <Avatar name={people[0].name} size={32} />
                  ) : (
                    <div className="flex shrink-0 -space-x-2">
                      {people.slice(0, 3).map((c) => (
                        <span key={c.id} className="rounded-full ring-2 ring-white">
                          <Avatar name={c.name} size={32} />
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{people.length === 1 ? people[0].name : `${people.length} clients`}</div>
                    {people.length > 1 && (reviewing > 0 || owing > 0) && (
                      <div className="truncate text-xs font-semibold">
                        {reviewing > 0 && <span className="text-warn">{reviewing} to review</span>}
                        {reviewing > 0 && owing > 0 && <span className="text-faint"> · </span>}
                        {owing > 0 && <span className={isLate(r) ? 'text-danger' : 'text-muted'}>{owing} {isLate(r) ? 'late' : 'waiting'}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="@max-4xl:hidden">
                  <div className="text-sm font-semibold">{fmtDate(r.createdAt)}</div>
                  <div className="truncate text-xs text-muted">{r.via === 'own' ? 'Your WhatsApp' : SHARED_NUMBER_NAME}</div>
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
                  <span className={`inline-block rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${st.className}`}>{st.label}</span>
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
                  <div className="grid grid-cols-[minmax(0,1.4fr)_150px_150px_170px] gap-4 px-3 @max-4xl:grid-cols-[minmax(0,1fr)_64px_auto] @max-4xl:gap-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-faint">
                    <span>Client</span>
                    <span>Documents</span>
                    <span>Status</span>
                    <span className="@max-4xl:hidden">Last reminder</span>
                  </div>
                  {r.clients.slice(0, SHOW_CLIENTS).map((rc) => {
                    const c = getClient(rc.clientId)
                    const counted = rc.docs.filter((d) => d.status !== 'na')
                    const got = counted.filter(isReceived).length
                    const toReview = counted.filter((d) => d.status === 'to_review').length
                    const missing = counted.filter((d) => d.status === 'pending' || d.status === 'rejected').length
                    const label = toReview > 0 ? `${toReview} to review` : missing > 0 ? 'Waiting' : 'Complete'
                    const tone = toReview > 0 ? 'bg-warn-soft text-warn' : missing > 0 ? 'bg-info-soft text-info' : 'bg-ok-soft text-ok'
                    return (
                      <Link key={rc.clientId} to={`/requests/${r.id}?client=${rc.clientId}`} className="grid grid-cols-[minmax(0,1.4fr)_150px_150px_170px] items-center gap-4 rounded-lg px-3 py-2 text-sm hover:bg-white @max-4xl:grid-cols-[minmax(0,1fr)_64px_auto] @max-4xl:gap-2">
                        <span className="flex min-w-0 items-center gap-2.5">
                          {c && <Avatar name={c.name} size={28} />}
                          <span className="truncate font-semibold">{c?.name}</span>
                        </span>
                        <span className="text-[13px] text-muted">
                          <b className="font-semibold text-slate-700">{got}</b> of {counted.length}
                        </span>
                        <span>
                          <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>{label}</span>
                        </span>
                        <span className="text-[13px] text-muted @max-4xl:hidden">{rc.lastReminder ?? 'None yet'}</span>
                      </Link>
                    )
                  })}
                  {r.clients.length > SHOW_CLIENTS && (
                    <Link to={`/requests/${r.id}`} className="ml-3 mt-1 inline-block py-1.5 text-[13px] font-semibold text-brand-dark hover:underline">
                      View all {r.clients.length} clients
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
