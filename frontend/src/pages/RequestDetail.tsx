import { backdropProps, panelProps } from '../lib/motion'
import { motion } from 'framer-motion'
import Toast from '../components/Toast'
import { Bell, ChevronRight, MessageCircle, RefreshCw, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import DocPreviewDrawer from '../components/DocPreviewDrawer'
import ApproveSaveDialog from '../components/ApproveSaveDialog'
import Pagination, { usePaging } from '../components/Pagination'
import ReminderDialog from '../components/ReminderDialog'
import { useMessenger } from '../data/messenger'
import FileTypeIcon from '../components/FileTypeIcon'
import StatusBadge from '../components/StatusBadge'
import DueDatePicker from '../components/DueDatePicker'
import { getBookClient, getClient, regSuffix } from '../data/mock'
import { contactOf, useContacts } from '../data/contacts'
import type { DocRequest } from '../data/requests'
import { fmtDate, progress, useRequests, lineRef } from '../data/requests'
import type { Status } from '../data/types'
import { useSetup } from '../data/setup'
import { isExpired, todayISO } from '../lib/dates'
import { demoOn } from '../lib/demo'
import { serviceColor } from '../lib/status'
import { SHARED_NUMBER_NAME } from '../lib/brand'
import { rowFocus, rowHover, rowKeys } from '../lib/ui'

const reviewOptions: Status[] = ['to_review', 'approved', 'rejected']
const tileBtn = 'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-slate-700 transition-colors hover:border-brand hover:text-brand-dark'
const reasons = ['Blurry or unreadable', 'Wrong document', 'Pages missing', 'Wrong year']

interface Rejecting {
  clientId: string
  docId: string
  docName: string
}

type Filter = 'all' | 'review' | 'waiting' | 'done'

// On a phone each client is a small card; the table header goes away.
const CLIENT_ROW = 'grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_120px_150px_124px_28px] items-center gap-4 px-6 @max-3xl:flex @max-3xl:flex-wrap @max-3xl:gap-x-3 @max-3xl:gap-y-2.5 @max-3xl:px-4'

export default function RequestDetail() {
  const { id } = useParams()
  const { getRequest } = useRequests()
  const request = id ? getRequest(id) : undefined
  if (!request) {
    return (
      <EmptyState art="search" title="Request not found" text="This request may have been removed, or the link is not right.">
        <Link to="/requests" className="flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white">
          Back to requests
        </Link>
      </EmptyState>
    )
  }
  return <RequestView request={request} />
}

// The number a registration is known by: the GSTIN, the TAN, or the PAN (income tax), with its name.
const numberLabel = { GST: 'GSTIN', TDS: 'TAN', ITR: 'PAN' } as const
function regInfo(id: string) {
  const r = getBookClient(id)?.registrations.find((x) => x.id === id)
  return r ? { number: r.number, label: numberLabel[r.type], place: r.type === 'ITR' ? 'ITR' : (r.label ?? '') } : null
}

// Who gets the messages for this registration: its contact's name and mobile.
function contactFor(id: string) {
  const b = getBookClient(id)
  const r = b?.registrations.find((x) => x.id === id)
  return b && r ? contactOf(b, r) : null
}

function RequestView({ request }: { request: DocRequest }) {
  useContacts()
  const [params] = useSearchParams()
  const { setDocStatus, setDocFiled, simulateReply, changeDue } = useRequests()
  const { graceDays, ownNumber, whatsapp } = useSetup()

  const [openDoc, setOpenDoc] = useState<{ clientId: string; docId: string } | null>(() => {
    const [clientId, docId] = (params.get('doc') ?? '').split(':')
    return clientId && docId ? { clientId, docId } : null
  })
  const [rejecting, setRejecting] = useState<Rejecting | null>(null)
  const [reason, setReason] = useState('')
  const [remark, setRemark] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [approving, setApproving] = useState<{ clientId: string; docId: string; next: boolean } | null>(null) // Approve asks where to keep the document
  const [dateOpen, setDateOpen] = useState(false)
  const [dateValue, setDateValue] = useState('')
  const [linkFor, setLinkFor] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [asking, setAsking] = useState(false)
  // Clients whose documents are showing. One client can be opened straight from the Dashboard (?client=).
  const [open, setOpen] = useState<Set<string>>(() => {
    const c = params.get('client') ?? (params.get('doc') ?? '').split(':')[0]
    return new Set(c ? [c] : [])
  })

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const { sendUpdate, sendNewLink, sendRejected, preview } = useMessenger()
  const p = progress(request)
  const mixedKinds = new Set(request.clients.map((rc) => getClient(rc.clientId)?.service)).size > 1
  const pct = p.total ? Math.round((p.received / p.total) * 100) : 0
  const approved = request.clients.flatMap((c) => c.docs).filter((d) => d.status === 'approved').length

  // Every document the client has sent, in the order they are shown. The preview panel walks through these.
  const received = request.clients.flatMap((c) =>
    c.docs.filter((d) => d.status !== 'pending' && d.status !== 'na').map((d) => ({ clientId: c.clientId, doc: d })),
  )
  const idx = openDoc ? received.findIndex((x) => x.clientId === openDoc.clientId && x.doc.id === openDoc.docId) : -1
  const current = idx >= 0 ? received[idx] : null
  const currentClient = current ? getClient(current.clientId) : undefined

  // One row per client. A client who has something to look at counts as "to review", even if more is still missing.
  const today = todayISO()
  const rows = useMemo(
    () =>
      request.clients.flatMap((rc) => {
        const c = getClient(rc.clientId)
        if (!c) return []
        const counted = rc.docs.filter((d) => d.status !== 'na')
        const missing = counted.filter((d) => d.status === 'pending' || d.status === 'rejected').length
        const toReview = counted.filter((d) => d.status === 'to_review').length
        const got = counted.filter((d) => d.status !== 'pending' && d.status !== 'rejected').length
        const late = missing > 0 && request.due < today
        const state: Filter = toReview > 0 ? 'review' : missing > 0 ? 'waiting' : 'done'
        return [{ rc, c, missing, toReview, got, total: counted.length, late, state }]
      }),
    [request, today],
  )
  const counts = { all: rows.length, review: rows.filter((r) => r.state === 'review').length, waiting: rows.filter((r) => r.missing > 0).length, done: rows.filter((r) => r.state === 'done').length }
  // What a search on this page looks in, for one client: the name, the place, every number (the request's number for them, PAN, GSTIN or TAN, mobile, email),
  // the contact who gets the messages, and the names of the documents.
  const matches = (r: (typeof rows)[number], text: string) => {
    const info = regInfo(r.c.id)
    const b = getBookClient(r.c.id)
    const contact = contactFor(r.c.id)
    const hay = [
      r.c.name,
      info?.place,
      lineRef(request, r.rc.clientId),
      request.ref,
      info?.number,
      b?.pan,
      r.c.phone,
      r.c.email,
      contact?.name,
      contact?.phone,
      ...r.rc.docs.map((d) => d.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    // every word typed has to be somewhere ("priya 03", "ABCPK", "karnataka bank")
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((w) => hay.includes(w))
  }
  const shown = rows.filter(
    (r) =>
      (filter === 'all' || (filter === 'waiting' ? r.missing > 0 : r.state === filter)) &&
      (!query.trim() || matches(r, query)),
  )
  const paging = usePaging(shown, `${filter}|${query}`)
  const toRemind = rows.filter((r) => r.missing > 0)
  // One button for the whole request: chase whoever is missing something, or, when nobody is, tell everyone who is done.
  const thanking = toRemind.length === 0
  const toNotify = thanking ? rows.filter((r) => r.state === 'done') : toRemind

  // Coming from the Dashboard: show the page that holds that client.
  const wanted = params.get('client') ?? (params.get('doc') ?? '').split(':')[0]
  useEffect(() => {
    if (!wanted) return
    const at = shown.findIndex((r) => r.rc.clientId === wanted)
    if (at >= 0) paging.setPage(Math.floor(at / paging.size) + 1)
    // only once, when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (clientId: string) =>
    setOpen((o) => {
      const n = new Set(o)
      if (n.has(clientId)) n.delete(clientId)
      else n.add(clientId)
      return n
    })
  const sendReminders = () => {
    toNotify.forEach((r) => sendUpdate(request.id, r.rc.clientId))
    setToast(`${thanking ? 'Update' : 'Reminder'} sent to ${toNotify.length} ${toNotify.length === 1 ? 'client' : 'clients'} on WhatsApp`)
    setAsking(false)
  }

  const openAt = (i: number) => {
    const x = received[(i + received.length) % received.length]
    if (x) setOpenDoc({ clientId: x.clientId, docId: x.doc.id })
  }

  // After a decision, jump to the next document that still needs a look. Close when none are left.
  const advance = (done?: string) => {
    const next =
      received.slice(idx + 1).find((x) => x.doc.status === 'to_review') ??
      received.find((x, i) => i !== idx && x.doc.status === 'to_review')
    if (next) setOpenDoc({ clientId: next.clientId, docId: next.doc.id })
    else {
      setOpenDoc(null)
      setToast(`${done ? `${done}. ` : ''}All done. Nothing left to review in this request.`)
    }
  }

  // Approving asks where to keep the document first (the dialog); the approval itself happens when the CA answers.
  const approveOpen = () => {
    if (!current) return
    setApproving({ clientId: current.clientId, docId: current.doc.id, next: true })
  }

  const rejectOpen = () => {
    if (!current) return
    changeStatus(current.clientId, current.doc.id, current.doc.name, 'rejected')
  }

  const changeStatus = (clientId: string, docId: string, docName: string, next: Status) => {
    if (next === 'rejected') {
      setReason('')
      setRemark('')
      setRejecting({ clientId, docId, docName })
      return
    }
    if (next === 'approved') return setApproving({ clientId, docId, next: false })
    setDocStatus(request.id, clientId, docId, next)
  }

  const confirmReject = () => {
    if (!rejecting) return
    const text = [reason, remark].filter(Boolean).join(' · ') || 'Please send it again'
    setDocStatus(request.id, rejecting.clientId, rejecting.docId, 'rejected', text)
    sendRejected(request.id, rejecting.clientId, rejecting.docName, reason, remark)
    setToast(`${rejecting.docName} rejected. The client was told on WhatsApp.`)
    setRejecting(null)
    if (current && current.clientId === rejecting.clientId && current.doc.id === rejecting.docId) advance()
  }

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 py-4 pb-8 max-md:pb-28 md:gap-5 md:px-8 md:py-6 md:pb-8">
      <div className="z-10 -mx-4 -mt-4 flex flex-col gap-3 bg-canvas px-4 pb-3 pt-4 md:sticky md:top-0 md:-mx-8 md:-mt-6 md:gap-4 md:px-8 md:pt-6">
      <nav className="text-[13px] text-muted">
        <Link to="/requests" className="font-semibold text-brand">
          ← Requests
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{request.ref}</span>
      </nav>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-[24px] font-bold tracking-tight">
            {request.title}
            {[...new Set(request.clients.map((rc) => getClient(rc.clientId)?.service).filter((x): x is NonNullable<typeof x> => !!x))].filter((k) => !request.title.includes(k)).map((k) => (
              <span key={k} className={`rounded-md bg-white px-2 py-0.5 text-xs font-bold shadow-sm ring-1 ring-black/5 ${serviceColor[k]}`}>
                {k}
              </span>
            ))}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {request.ref} · sent {fmtDate(request.createdAt)} from {request.via === 'own' ? (whatsapp?.displayName ?? 'your WhatsApp') : `the ${SHARED_NUMBER_NAME} number`} · due {fmtDate(request.due)}{request.via === 'own' && !ownNumber && ` · your WhatsApp is not connected, reminders go from the ${SHARED_NUMBER_NAME} number`}
            <button
              type="button"
              onClick={() => {
                setDateValue(request.due)
                setDateOpen(true)
              }}
              className="-my-2 ml-1 inline-block px-1 py-2 font-semibold text-brand hover:underline"
            >
              Change date
            </button>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {demoOn() && <button
            type="button"
            onClick={() => setToast(simulateReply(request.id) ? 'Demo: a client just sent a document' : 'Nothing is pending')}
            className="h-10 rounded-xl px-3 text-[13px] font-semibold text-muted hover:bg-white hover:text-ink"
          >
            Demo: simulate reply
          </button>}
          {toNotify.length > 0 && (
            <button type="button" onClick={() => setAsking(true)} className="flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:border-brand hover:text-brand-dark">
              <Bell size={16} />
              {thanking ? 'Send update to' : 'Remind'} {toNotify.length} {toNotify.length === 1 ? 'client' : 'clients'}
            </button>
          )}
        </div>
      </div>

      <section className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-line bg-white px-4 py-4 md:px-6">
        <div>
          <div className="text-[26px] font-bold leading-none">
            {p.received} <span className="text-[15px] font-medium text-muted">of {p.total} received</span>
          </div>
        </div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line max-md:order-3 max-md:basis-full">
          <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-5 text-[13px] text-slate-600">
          <span>
            <b className="text-ok">{approved}</b> approved
          </span>
          <span>
            <b className="text-warn">{p.toReview}</b> to review
          </span>
          <span>
            <b>{p.total - p.received}</b> pending
          </span>
        </div>
      </section>
      </div>

      <section className="@container overflow-hidden rounded-[18px] border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-6 md:py-3.5">
          {rows.length > 1 ? (
          <div className="flex max-w-full overflow-x-auto rounded-xl bg-[#E9EEF5] p-1 text-[13px] font-semibold text-slate-600" role="group" aria-label="Show clients">
            {(
              [
                ['all', 'All', counts.all],
                ['review', 'To review', counts.review],
                ['waiting', 'Waiting', counts.waiting],
                ['done', 'Complete', counts.done],
              ] as [Filter, string, number][]
            ).map(([key, label, n]) => (
              <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key} className={`shrink-0 whitespace-nowrap rounded-[9px] px-3.5 py-2 ${filter === key ? 'bg-white text-ink shadow-sm' : ''}`}>
                {label} <span className="ml-0.5 text-xs text-muted">{n}</span>
              </button>
            ))}
          </div>
          ) : (
            <span />
          )}
          <label className="flex h-10 w-72 items-center gap-2 rounded-xl border border-transparent bg-canvas @max-3xl:w-full px-3.5 text-sm text-muted focus-within:border-brand focus-within:bg-white">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, number, PAN, GSTIN, mobile or document" aria-label="Search clients in this request" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
          </label>
        </div>

        <div className={`${CLIENT_ROW} @max-3xl:hidden border-b border-line bg-slate-50/80 py-2 text-[12px] font-bold uppercase tracking-wider text-faint`}>
          <span>Client</span>
          <span>Contact</span>
          <span>Received</span>
          <span>Status</span>
          <span />
          <span />
        </div>

        {paging.rows.length === 0 && <p className="p-8 text-sm text-muted">No clients match.</p>}
        {paging.rows.map(({ rc, c, missing, toReview, got, total, late, state }) => {
          const isOpen = open.has(rc.clientId)
          const chip =
            state === 'review'
              ? { text: `${toReview} to review`, cls: 'bg-warn-soft text-warn' }
              : late
                ? { text: 'Overdue', cls: 'bg-danger-soft text-danger' }
                : missing > 0
                  ? { text: 'Waiting', cls: 'bg-info-soft text-info' }
                  : { text: 'Complete', cls: 'bg-ok-soft text-ok' }
          return (
            <div key={rc.clientId} className="border-b border-line last:border-b-0">
              <div onClick={() => toggle(rc.clientId)} {...rowKeys(() => toggle(rc.clientId))} aria-expanded={isOpen} aria-label={`${c.name}, ${isOpen ? 'close' : 'open'} documents`} className={`${rowFocus} ${CLIENT_ROW} group h-[68px] cursor-pointer transition-colors @max-3xl:h-auto @max-3xl:py-3.5 ${isOpen ? 'bg-[#EEF8F5]' : 'hover:bg-[#EAF5F0] hover:shadow-[inset_3px_0_0_#0B7A6B]'}`}>
                <div className="flex min-w-0 items-center gap-3 @max-3xl:order-1 @max-3xl:flex-[1_1_50%]">
                  <Avatar name={c.name} size={36} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      <Link to={`/clients/${c.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-brand-dark hover:underline">
                        {c.name}
                      </Link>
                      {/* The kind is in the title badge. Only the place is added (for a client with several GSTINs or TANs), and the kind only when this request mixes kinds. */}
                      {(mixedKinds || regSuffix(c.id)) && (
                        <span className={`ml-1.5 text-xs ${mixedKinds ? `font-bold ${serviceColor[c.service]}` : 'font-medium text-muted'}`}>
                          {mixedKinds ? c.service : ''}
                          {regSuffix(c.id).replace(' ·', mixedKinds ? '' : '').trim() ? `${mixedKinds ? ' ' : ''}${regSuffix(c.id).replace(' ·', '').trim()}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-muted">
                      {regInfo(c.id) && <span className="font-mono text-[12px] text-slate-600">{regInfo(c.id)!.number}</span>}
                      <span title="This client's number in the request"> · {lineRef(request, rc.clientId)}</span>
                      {rc.lastReminder && ` · reminded ${rc.lastReminder}`}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 @max-3xl:order-1 @max-3xl:basis-full">
                  <div className="truncate text-[13px] font-semibold">{contactFor(c.id)?.name ?? c.name}</div>
                  <div className="mt-0.5 truncate text-[13px] text-muted">{contactFor(c.id)?.phone || c.phone}</div>
                </div>
                <div className="@max-3xl:order-3 @max-3xl:basis-[42%]">
                  <div className="text-[13px] font-semibold tabular-nums">
                    {got} <span className="font-medium text-muted">of {total}</span>
                  </div>
                  <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <span className={`block h-full rounded-full ${late ? 'bg-danger' : 'bg-brand'}`} style={{ width: `${total ? (got / total) * 100 : 0}%` }} />
                  </span>
                </div>
                <div className="@max-3xl:order-4 @max-3xl:flex-1">
                  <span className={`inline-block rounded-md px-2 py-1 text-[12px] font-bold uppercase tracking-wide ${chip.cls}`}>{chip.text}</span>
                  {state === 'review' && missing > 0 && <div className="mt-1 text-xs text-muted">{missing} pending</div>}
                </div>
                <div onClick={(e) => e.stopPropagation()} className="flex justify-end @max-3xl:order-2 @max-3xl:shrink-0">
                  {missing > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        sendUpdate(request.id, rc.clientId)
                        setToast(`Reminder sent to ${c.name} on WhatsApp`)
                      }}
                      className="flex h-9 w-[124px] items-center justify-center gap-1.5 rounded-lg border border-line bg-white text-[13px] font-semibold hover:border-brand hover:text-brand-dark"
                    >
                      <Bell size={14} />
                      Remind
                    </button>
                  ) : state === 'done' ? (
                    <button
                      type="button"
                      onClick={() => {
                        sendUpdate(request.id, rc.clientId)
                        setToast(`Thank-you sent to ${c.name} on WhatsApp`)
                      }}
                      className="flex h-9 w-[124px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-white text-[13px] font-semibold hover:border-brand hover:text-brand-dark"
                    >
                      <Bell size={14} />
                      Send update
                    </button>
                  ) : null}
                </div>
                <span className={`flex h-7 w-7 items-center justify-center justify-self-end rounded-full transition @max-3xl:hidden ${isOpen ? 'bg-white text-brand-dark shadow-sm' : 'text-faint group-hover:bg-white group-hover:text-brand-dark group-hover:shadow-sm'}`}>
                  <ChevronRight size={16} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </span>
              </div>

              {/* The tile's own actions, right under the client, in the same tile. */}
              {isOpen && (
                <div className="flex flex-wrap items-center gap-2 bg-[#EEF8F5] px-6 pb-3.5 pl-[72px] @max-3xl:px-4">
                  <Link to={`/inbox?client=${rc.clientId}`} className={tileBtn}>
                    <MessageCircle size={14} /> Open chat
                  </Link>
                  <button type="button" onClick={() => setLinkFor(rc.clientId)} className={`${tileBtn} text-danger hover:border-danger/40`}>
                    <RefreshCw size={14} /> Send a new link
                  </button>
                  {isExpired(request.due, graceDays) && <span className="ml-auto text-[13px] font-semibold text-danger">The upload link has expired</span>}
                </div>
              )}

              {isOpen && (
                <div className="border-t border-line bg-slate-50/50">
                  {rc.docs.map((d) => {
                    const gotIt = d.status !== 'pending' && d.status !== 'na'
                    const active = current?.clientId === rc.clientId && current.doc.id === d.id
                    return (
                      <div
                        key={d.id}
                        role={gotIt ? 'button' : undefined}
                        tabIndex={gotIt ? 0 : undefined}
                        onClick={gotIt ? () => setOpenDoc({ clientId: rc.clientId, docId: d.id }) : undefined}
                        onKeyDown={gotIt ? (e) => e.key === 'Enter' && setOpenDoc({ clientId: rc.clientId, docId: d.id }) : undefined}
                        className={`flex items-center gap-4 border-t border-line px-6 py-3 pl-[72px] @max-3xl:gap-3 @max-3xl:px-4 ${gotIt ? rowHover : ''} ${active ? 'bg-[#EEF8F5] shadow-[inset_3px_0_0_#0B7A6B]' : ''}`}
                      >
                        {gotIt && d.fileName ? <FileTypeIcon file={d.fileName} size={34} /> : <span className="flex h-[34px] w-[27px] items-center justify-center rounded border-[1.5px] border-dashed border-slate-300" />}
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-semibold ${gotIt ? '' : 'text-muted'}`}>{d.name}</div>
                          {(gotIt || d.status === 'na' || (d.status === 'rejected' && d.reason)) && (
                            <div className="text-xs text-muted">
                              {gotIt ? `${d.receivedAt} · via ${d.source === 'Link' ? 'upload link' : 'WhatsApp'}${d.moreFiles?.length ? ` · ${d.moreFiles.length + 1} files` : ''}` : d.status === 'na' ? 'Client says this does not apply to them' : ''}
                              {d.status === 'rejected' && d.reason && <span className="ml-1.5 font-semibold text-danger">· {d.reason}</span>}
                            </div>
                          )}
                        </div>
                        {gotIt ? <StatusBadge status={d.status} options={reviewOptions} onChange={(st) => changeStatus(rc.clientId, d.id, d.name, st)} /> : <StatusBadge status={d.status === 'na' ? 'na' : 'pending'} />}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        <Pagination p={paging} noun="clients" />
      </section>

      {current && currentClient && (
        <DocPreviewDrawer
          client={currentClient}
          doc={current.doc}
          position={idx + 1}
          total={received.length}
          onClose={() => setOpenDoc(null)}
          onPrev={() => openAt(idx - 1)}
          onNext={() => openAt(idx + 1)}
          hide={!!approving}
          onApprove={approveOpen}
          onReject={rejectOpen}
        />
      )}


      {asking && <ReminderDialog targets={toNotify.map((r) => ({ requestId: request.id, clientId: r.rc.clientId }))} update={thanking} text={preview(request.id, toNotify[0].rc.clientId)} onSend={sendReminders} onClose={() => setAsking(false)} />}

      {dateOpen && (
        <motion.div {...backdropProps} className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Change last date">
          <motion.div {...panelProps} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Change the last date</h2>
            <p className="mt-1 text-sm text-muted">Clients see the new date on their upload page. The link stays the same and moves with the date.</p>
            <div className="mt-4">
              <DueDatePicker value={dateValue} onChange={setDateValue} />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setDateOpen(false)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold">
                Cancel
              </button>
              <button
                type="button"
                disabled={!dateValue}
                onClick={() => {
                  changeDue(request.id, dateValue)
                  setDateOpen(false)
                  setToast(`Last date is now ${fmtDate(dateValue)}`)
                }}
                className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white disabled:opacity-40"
              >
                Save date
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {linkFor && (
        <motion.div {...backdropProps} className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Send new link">
          <motion.div {...panelProps} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Send a new link to {getClient(linkFor)?.name}?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">They get a fresh link on WhatsApp. The old link stops working. Files they have already uploaded are kept.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setLinkFor(null)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  sendNewLink(request.id, linkFor)
                  setToast(`New link sent to ${getClient(linkFor)?.name} on WhatsApp`)
                  setLinkFor(null)
                }}
                className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white"
              >
                Send new link
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {rejecting && (
        <motion.div {...backdropProps} className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Reject document">
          <motion.div {...panelProps} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Reject “{rejecting.docName}”?</h2>
            <p className="mt-1 text-sm text-muted">Tell the client what is wrong. They get this on WhatsApp with a fresh upload link.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {reasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${reason === r ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line hover:bg-canvas'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Add a note (optional)"
              className="mt-4 h-24 w-full resize-none rounded-xl border border-line p-3 text-sm outline-none focus:border-brand"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setRejecting(null)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold">
                Cancel
              </button>
              <button type="button" onClick={confirmReject} className="flex h-11 shrink-0 items-center whitespace-nowrap gap-2 rounded-xl bg-danger px-5 text-sm font-semibold text-white">
                <X size={16} />
                Reject
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {approving && (() => {
        const d = request.clients.find((c) => c.clientId === approving.clientId)?.docs.find((x) => x.id === approving.docId)
        if (!d) return null
        return (
          <ApproveSaveDialog
            request={request}
            doc={d}
            clientId={approving.clientId}
            onClose={() => setApproving(null)}
            onApprove={(folderId) => {
              setDocStatus(request.id, approving.clientId, approving.docId, 'approved')
              setDocFiled(request.id, approving.clientId, approving.docId, folderId)
              const msg = folderId ? `${d.name} approved and saved in Document Master` : `${d.name} approved`
              setToast(msg)
              const goOn = approving.next
              setApproving(null)
              if (goOn) advance(msg)
            }}
          />
        )
      })()}

      <Toast message={toast} />
    </div>
  )
}
