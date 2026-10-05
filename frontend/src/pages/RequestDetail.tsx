import { Bell, Check, ChevronDown, ChevronRight, Eye, Link2, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import DocPreviewDrawer from '../components/DocPreviewDrawer'
import Pagination, { usePaging } from '../components/Pagination'
import ReminderDialog from '../components/ReminderDialog'
import { useMessenger } from '../data/messenger'
import FileTypeIcon from '../components/FileTypeIcon'
import StatusBadge from '../components/StatusBadge'
import DueDatePicker from '../components/DueDatePicker'
import { getClient } from '../data/mock'
import type { DocRequest } from '../data/requests'
import { fmtDate, progress, useRequests } from '../data/requests'
import type { Status } from '../data/types'
import { useSetup } from '../data/setup'
import { expiresOn, isExpired, todayISO } from '../lib/dates'
import { serviceColor } from '../lib/status'
import { SHARED_NUMBER_NAME } from '../lib/brand'
import { fullLink, linkToken } from '../lib/links'

const reviewOptions: Status[] = ['to_review', 'approved', 'rejected']
const reasons = ['Blurry or unreadable', 'Wrong document', 'Pages missing', 'Wrong year']

interface Rejecting {
  clientId: string
  docId: string
  docName: string
}

// "Upload link" menu on each client: look at it, copy it, or replace it with a new one.
function LinkMenu({ previewTo, onCopy, onNew }: { previewTo: string; onCopy: () => void; onNew: () => void }) {
  const [open, setOpen] = useState(false)
  const item = 'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-canvas'
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-line px-4 text-sm font-semibold hover:bg-canvas"
      >
        <Link2 size={15} />
        Upload link
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg">
            <Link to={previewTo} role="menuitem" className={item}>
              <Eye size={15} />
              Open client's page
            </Link>
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                setOpen(false)
                onCopy()
              }}
            >
              <Link2 size={15} />
              Copy link
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${item} text-danger`}
              onClick={() => {
                setOpen(false)
                onNew()
              }}
            >
              <Bell size={15} />
              Send new link
            </button>
          </div>
        </>
      )}
    </div>
  )
}

type Filter = 'all' | 'review' | 'waiting' | 'done'

const CLIENT_ROW = 'grid grid-cols-[minmax(0,1fr)_120px_150px_96px_20px] items-center gap-4 px-6'

export default function RequestDetail() {
  const { id } = useParams()
  const { getRequest } = useRequests()
  const request = id ? getRequest(id) : undefined
  if (!request) {
    return (
      <div className="p-8">
        <p className="text-muted">Request not found.</p>
        <Link to="/requests" className="mt-2 inline-block font-semibold text-brand">
          Back to requests
        </Link>
      </div>
    )
  }
  return <RequestView request={request} />
}

function RequestView({ request }: { request: DocRequest }) {
  const [params] = useSearchParams()
  const { setDocStatus, simulateReply, changeDue, newLink, unsorted, useUnsorted } = useRequests()
  const { graceDays } = useSetup()

  const [openDoc, setOpenDoc] = useState<{ clientId: string; docId: string } | null>(() => {
    const [clientId, docId] = (params.get('doc') ?? '').split(':')
    return clientId && docId ? { clientId, docId } : null
  })
  const [rejecting, setRejecting] = useState<Rejecting | null>(null)
  const [reason, setReason] = useState('')
  const [remark, setRemark] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [dateOpen, setDateOpen] = useState(false)
  const [dateValue, setDateValue] = useState('')
  const [linkFor, setLinkFor] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [asking, setAsking] = useState(false)
  const [openFile, setOpenFile] = useState<{ fileId: string; clientId: string } | null>(null) // a file we could not match, open in the preview
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

  const { sendUpdate, preview } = useMessenger()
  const p = progress(request)
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
        const waiting = unsorted.filter((f) => f.phone === c.phone)
        const got = counted.filter((d) => d.status !== 'pending' && d.status !== 'rejected').length
        const late = missing > 0 && request.due < today
        const state: Filter = toReview > 0 || (waiting.length > 0 && missing > 0) ? 'review' : missing > 0 ? 'waiting' : 'done'
        return [{ rc, c, missing, toReview, waiting, got, total: counted.length, late, state }]
      }),
    [request, today, unsorted],
  )
  const counts = { all: rows.length, review: rows.filter((r) => r.state === 'review').length, waiting: rows.filter((r) => r.missing > 0).length, done: rows.filter((r) => r.state === 'done').length }
  const shown = rows.filter(
    (r) =>
      (filter === 'all' || (filter === 'waiting' ? r.missing > 0 : r.state === filter)) &&
      (!query.trim() || `${r.c.name} ${r.c.phone}`.toLowerCase().includes(query.trim().toLowerCase())),
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
  const reviewFirst = () => {
    const x = received.find((x) => x.doc.status === 'to_review')
    if (x) {
      setOpen((o) => new Set(o).add(x.clientId))
      setOpenDoc({ clientId: x.clientId, docId: x.doc.id })
    }
  }
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
  const advance = () => {
    const next =
      received.slice(idx + 1).find((x) => x.doc.status === 'to_review') ??
      received.find((x, i) => i !== idx && x.doc.status === 'to_review')
    if (next) setOpenDoc({ clientId: next.clientId, docId: next.doc.id })
    else {
      setOpenDoc(null)
      setToast('All done. Nothing left to review in this request.')
    }
  }

  const approveOpen = () => {
    if (!current) return
    setDocStatus(request.id, current.clientId, current.doc.id, 'approved')
    setToast(`${current.doc.name} approved`)
    advance()
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
    setDocStatus(request.id, clientId, docId, next)
    if (next === 'approved') setToast(`${docName} approved`)
  }

  const confirmReject = () => {
    if (!rejecting) return
    const text = [reason, remark].filter(Boolean).join(' · ') || 'Please send it again'
    setDocStatus(request.id, rejecting.clientId, rejecting.docId, 'rejected', text)
    setToast(`${rejecting.docName} sent back. The client was told on WhatsApp.`)
    setRejecting(null)
    if (current && current.clientId === rejecting.clientId && current.doc.id === rejecting.docId) advance()
  }

  return (
    <div className="flex min-h-full flex-col gap-5 px-8 py-6">
      <div className="sticky top-0 z-10 -mx-8 -mt-6 flex flex-col gap-4 bg-canvas px-8 pb-3 pt-6">
      <nav className="text-[13px] text-muted">
        <Link to="/requests" className="font-semibold text-brand">
          ← Requests
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{request.ref}</span>
      </nav>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">{request.title}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {request.ref} · sent {fmtDate(request.createdAt)} from {request.via === 'own' ? 'your WhatsApp' : `the ${SHARED_NUMBER_NAME} number`} · due {fmtDate(request.due)}
            <button
              type="button"
              onClick={() => {
                setDateValue(request.due)
                setDateOpen(true)
              }}
              className="ml-2 font-semibold text-brand hover:underline"
            >
              Change date
            </button>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setToast(simulateReply(request.id) ? 'Demo: a client just sent a document' : 'Nothing is pending')}
            className="h-10 rounded-xl px-3 text-[13px] font-semibold text-muted hover:bg-white hover:text-ink"
          >
            Demo: simulate reply
          </button>
          {toNotify.length > 0 && (
            <button type="button" onClick={() => setAsking(true)} className="flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:border-brand hover:text-brand-dark">
              <Bell size={16} />
              {thanking ? 'Send update to' : 'Remind'} {toNotify.length} {toNotify.length === 1 ? 'client' : 'clients'}
            </button>
          )}
          {p.toReview > 0 && (
            <button type="button" onClick={reviewFirst} className="flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)] hover:bg-brand-dark">
              <Eye size={16} />
              Review {p.toReview} {p.toReview === 1 ? 'document' : 'documents'}
            </button>
          )}
        </div>
      </div>

      <section className="flex items-center gap-8 rounded-2xl border border-line bg-white px-6 py-4">
        <div>
          <div className="text-[26px] font-bold leading-none">
            {p.received} <span className="text-[15px] font-medium text-muted">of {p.total} received</span>
          </div>
        </div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
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

      <section className="overflow-hidden rounded-[18px] border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-3.5">
          <div className="flex rounded-xl bg-[#E9EEF5] p-1 text-[13px] font-semibold text-slate-600" role="group" aria-label="Show clients">
            {(
              [
                ['all', 'All', counts.all],
                ['review', 'To review', counts.review],
                ['waiting', 'Waiting', counts.waiting],
                ['done', 'Complete', counts.done],
              ] as [Filter, string, number][]
            ).map(([key, label, n]) => (
              <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key} className={`rounded-[9px] px-3.5 py-1.5 ${filter === key ? 'bg-white text-ink shadow-sm' : ''}`}>
                {label} <span className="ml-0.5 text-xs text-muted">{n}</span>
              </button>
            ))}
          </div>
          <label className="flex h-10 w-72 items-center gap-2 rounded-xl border border-transparent bg-canvas px-3.5 text-sm text-muted focus-within:border-brand focus-within:bg-white">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client" aria-label="Search client" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
          </label>
        </div>

        <div className={`${CLIENT_ROW} border-b border-line bg-slate-50/80 py-2 text-[11px] font-bold uppercase tracking-wider text-faint`}>
          <span>Client</span>
          <span>Received</span>
          <span>Status</span>
          <span />
          <span />
        </div>

        {paging.rows.length === 0 && <p className="p-8 text-sm text-muted">No clients match.</p>}
        {paging.rows.map(({ rc, c, missing, toReview, waiting, got, total, late, state }) => {
          const isOpen = open.has(rc.clientId)
          const chip =
            state === 'review'
              ? { text: toReview > 0 ? `${toReview} to review` : `${waiting.length} to place`, cls: 'bg-warn-soft text-warn' }
              : late
                ? { text: 'Overdue', cls: 'bg-danger-soft text-danger' }
                : missing > 0
                  ? { text: 'Waiting', cls: 'bg-info-soft text-info' }
                  : { text: 'Complete', cls: 'bg-ok-soft text-ok' }
          const firstReview = rc.docs.find((d) => d.status === 'to_review')
          return (
            <div key={rc.clientId} className="border-b border-line last:border-b-0">
              <div onClick={() => toggle(rc.clientId)} className={`${CLIENT_ROW} h-[68px] cursor-pointer ${isOpen ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={c.name} size={36} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {c.name} <span className={`ml-1 text-xs font-bold ${serviceColor[c.service]}`}>{c.service}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-muted">
                      {c.phone}
                      {rc.lastReminder && ` · reminded ${rc.lastReminder}`}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[13px] font-semibold tabular-nums">
                    {got} <span className="font-medium text-muted">of {total}</span>
                  </div>
                  <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <span className={`block h-full rounded-full ${late ? 'bg-danger' : 'bg-brand'}`} style={{ width: `${total ? (got / total) * 100 : 0}%` }} />
                  </span>
                </div>
                <div>
                  <span className={`inline-block rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${chip.cls}`}>{chip.text}</span>
                  {state === 'review' && toReview > 0 && waiting.length > 0 && missing > 0 && <div className="mt-1 text-xs font-semibold text-warn">+ {waiting.length} to place</div>}
                  {state === 'review' && missing > 0 && !(toReview > 0 && waiting.length > 0) && <div className="mt-1 text-xs text-muted">{missing} still missing</div>}
                </div>
                <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
                  {state === 'review' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen((o) => new Set(o).add(rc.clientId))
                        if (firstReview) setOpenDoc({ clientId: rc.clientId, docId: firstReview.id })
                      }}
                      className="flex h-9 items-center rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
                    >
                      Review
                    </button>
                  ) : missing > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        sendUpdate(request.id, rc.clientId)
                        setToast(`Reminder sent to ${c.name} on WhatsApp`)
                      }}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold hover:border-brand hover:text-brand-dark"
                    >
                      <Bell size={14} />
                      Remind
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        sendUpdate(request.id, rc.clientId)
                        setToast(`Thank-you sent to ${c.name} on WhatsApp`)
                      }}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold hover:border-brand hover:text-brand-dark"
                    >
                      <Bell size={14} />
                      Send update
                    </button>
                  )}
                </div>
                <ChevronRight size={18} className={`justify-self-end text-faint transition ${isOpen ? 'rotate-90' : ''}`} />
              </div>

              {isOpen && (
                <div className="border-t border-line bg-slate-50/50">
                  <div className="flex items-center justify-between gap-3 px-6 py-2.5 pl-[72px] text-[13px] text-muted">
                    <span>
                      {isExpired(request.due, graceDays) ? <span className="font-semibold text-danger">Link expired</span> : <>Link valid till {fmtDate(expiresOn(request.due, graceDays))}</>}
                      {' · '}
                      <Link to={`/clients/${c.id}`} className="font-semibold text-brand hover:underline">
                        Open client
                      </Link>
                    </span>
                    <LinkMenu
                      previewTo={`/u/${request.id}/${rc.clientId}?preview=1`}
                      onCopy={() => {
                        const url = fullLink(linkToken(request.ref, rc.clientId, rc.linkVersion ?? 1))
                        navigator.clipboard?.writeText(url).catch(() => undefined)
                        setToast('Link copied')
                      }}
                      onNew={() => setLinkFor(rc.clientId)}
                    />
                  </div>
                  {waiting.length > 0 && missing > 0 && (
                    <>
                      <div className="border-t border-line px-6 pb-1 pt-3 pl-[72px]">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-faint">Files we could not match ({waiting.length})</div>
                        <p className="text-xs text-muted">Open a file to see it, then choose the document it is for. The rest wait for the next request.</p>
                      </div>
                      {waiting.map((f) => (
                        <div
                          key={f.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setOpenFile({ fileId: f.id, clientId: rc.clientId })}
                          onKeyDown={(e) => e.key === 'Enter' && setOpenFile({ fileId: f.id, clientId: rc.clientId })}
                          className="flex cursor-pointer items-center gap-4 border-t border-line px-6 py-3 pl-[72px] hover:bg-white"
                        >
                          <FileTypeIcon file={f.fileName} size={34} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold">{f.fileName}</div>
                            <div className="text-xs text-muted">
                              {f.receivedAt} · via {f.source === 'Link' ? 'upload link' : 'WhatsApp'}
                            </div>
                          </div>
                          <span className="rounded-md bg-warn-soft px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-warn">Not placed</span>
                        </div>
                      ))}
                    </>
                  )}
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
                        className={`flex items-center gap-4 border-t border-line px-6 py-3 pl-[72px] ${gotIt ? 'cursor-pointer hover:bg-white' : ''} ${active ? 'bg-[#EEF8F5] shadow-[inset_3px_0_0_#0B7A6B]' : ''}`}
                      >
                        {gotIt && d.fileName ? <FileTypeIcon file={d.fileName} size={34} /> : <span className="flex h-[34px] w-[27px] items-center justify-center rounded border-[1.5px] border-dashed border-slate-300" />}
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-semibold ${gotIt ? '' : 'text-muted'}`}>{d.name}</div>
                          <div className="text-xs text-muted">
                            {gotIt ? `${d.receivedAt} · via ${d.source === 'Link' ? 'upload link' : 'WhatsApp'}${d.moreFiles?.length ? ` · ${d.moreFiles.length + 1} files` : ''}` : d.status === 'na' ? 'Client says this does not apply to them' : 'Not received yet'}
                            {d.status === 'rejected' && d.reason && <span className="ml-1.5 font-semibold text-danger">· {d.reason}</span>}
                          </div>
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
          onApprove={approveOpen}
          onReject={rejectOpen}
        />
      )}

      {openFile && (() => {
        const rc = request.clients.find((c) => c.clientId === openFile.clientId)
        const client = getClient(openFile.clientId)
        const list = unsorted.filter((f) => f.phone === client?.phone)
        const at = list.findIndex((f) => f.id === openFile.fileId)
        const f = list[at]
        if (!rc || !client || !f) return null
        const go = (i: number) => setOpenFile({ fileId: list[(i + list.length) % list.length].id, clientId: openFile.clientId })
        const options = [
          ...rc.docs.filter((d) => d.status === 'pending' || d.status === 'rejected').map((d) => ({ id: d.id, label: d.name, group: 'Not received yet' })),
          ...rc.docs.filter((d) => d.status === 'to_review').map((d) => ({ id: d.id, label: d.name, group: 'Add as another file of' })),
        ]
        return (
          <DocPreviewDrawer
            key={f.id}
            client={client}
            doc={{ id: f.id, name: f.fileName, status: 'to_review', source: f.source, receivedAt: f.receivedAt, fileName: f.fileName }}
            position={at + 1}
            total={list.length}
            onClose={() => setOpenFile(null)}
            onPrev={() => go(at - 1)}
            onNext={() => go(at + 1)}
            onApprove={() => undefined}
            onReject={() => undefined}
            place={{
              options,
              onPlace: (docId) => {
                const name = rc.docs.find((d) => d.id === docId)?.name
                useUnsorted(f.id, request.id, rc.clientId, docId)
                setToast(`${f.fileName} added to ${name}.`)
                const next = list.filter((x) => x.id !== f.id)
                if (next.length > 0 && options.length > 1) setOpenFile({ fileId: next[Math.min(at, next.length - 1)].id, clientId: openFile.clientId })
                else setOpenFile(null)
              },
            }}
          />
        )
      })()}

      {asking && <ReminderDialog targets={toNotify.map((r) => ({ requestId: request.id, clientId: r.rc.clientId }))} update={thanking} text={preview(request.id, toNotify[0].rc.clientId)} onSend={sendReminders} onClose={() => setAsking(false)} />}

      {dateOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Change last date">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
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
          </div>
        </div>
      )}

      {linkFor && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Send new link">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Send a new link to {getClient(linkFor)?.name}?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">They get a fresh link on WhatsApp. The old link stops working. Files they have already uploaded are kept.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setLinkFor(null)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  newLink(request.id, linkFor)
                  setToast(`New link sent to ${getClient(linkFor)?.name} on WhatsApp`)
                  setLinkFor(null)
                }}
                className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white"
              >
                Send new link
              </button>
            </div>
          </div>
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Send back document">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Send “{rejecting.docName}” back?</h2>
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
                Send back
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl" role="status">
          <Check size={16} className="text-emerald-300" />
          {toast}
        </div>
      )}
    </div>
  )
}
