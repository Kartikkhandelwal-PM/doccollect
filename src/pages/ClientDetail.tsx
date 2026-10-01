import { FolderOpen, MessageCircle, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import ClientRepository from '../components/ClientRepository'
import FileTypeIcon from '../components/FileTypeIcon'
import StatusBadge from '../components/StatusBadge'
import WaText from '../components/WaText'
import { useInbox } from '../data/inbox'
import { buildMaster } from '../data/master'
import { getClient } from '../data/mock'
import { fmtDate, isReceived, requestState, useRequests } from '../data/requests'
import type { DocRequest, RequestClient, RequestDoc } from '../data/requests'
import { useSetup } from '../data/setup'
import type { Status } from '../data/types'
import { serviceColor } from '../lib/status'
import { SHARED_NUMBER_NAME } from '../lib/brand'

type Tab = 'overview' | 'requests' | 'documents' | 'messages' | 'activity'
const tabs: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'requests', label: 'Requests' },
  { key: 'documents', label: 'Documents' },
  { key: 'messages', label: 'Messages' },
  { key: 'activity', label: 'Activity' },
]

const stateLabel = {
  review: { text: 'Needs review', className: 'bg-warn-soft text-warn' },
  waiting: { text: 'Waiting for client', className: 'bg-info-soft text-info' },
  completed: { text: 'Completed', className: 'bg-ok-soft text-ok' },
} as const

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-2.5 text-sm last:border-b-0">
      <span className="text-muted">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  )
}

function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  )
}

interface Item {
  request: DocRequest
  rc: RequestClient
  doc: RequestDoc
}

export default function ClientDetail() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { requests } = useRequests()
  const { conversations, mode } = useInbox()
  const { readReplies } = useSetup()
  const client = id ? getClient(id) : undefined
  const tab = (tabs.find((t) => t.key === params.get('tab'))?.key ?? 'overview') as Tab

  // Everything this client is part of, from the real requests.
  const mine = useMemo(() => requests.filter((r) => r.clients.some((c) => c.clientId === id)), [requests, id])
  const items: Item[] = useMemo(
    () => mine.flatMap((request) => request.clients.filter((c) => c.clientId === id).flatMap((rc) => rc.docs.map((doc) => ({ request, rc, doc })))),
    [mine, id],
  )
  const folderFiles = useMemo(() => buildMaster(requests).filter((f) => f.folderId?.startsWith(`c:${id}/`)), [requests, id])

  if (!client) {
    return (
      <div className="p-8">
        <p className="text-muted">Client not found.</p>
        <Link to="/clients" className="mt-2 inline-block font-semibold text-brand">
          Back to clients
        </Link>
      </div>
    )
  }

  const other = client.sharedWith ? getClient(client.sharedWith) : undefined
  const open = mine.filter((r) => requestState(r) !== 'completed')
  const count = (s: Status) => items.filter((i) => i.doc.status === s).length
  const received = items.filter((i) => isReceived(i.doc))
  const recent = [...received].reverse().slice(0, 5)
  // Everything not approved yet: waiting for the client, or waiting for you.
  const inProgress = items.filter((i) => i.doc.status !== 'approved' && i.doc.status !== 'na')
  const progressOf = (r: DocRequest) => {
    const docs = r.clients.find((c) => c.clientId === id)?.docs.filter((d) => d.status !== 'na') ?? []
    return { done: docs.filter(isReceived).length, total: docs.length }
  }
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true })
  const docLink = (i: Item) => `/requests/${i.request.id}?doc=${i.rc.clientId}:${i.doc.id}`
  const sourceText = (d: RequestDoc) => (d.source === 'Link' ? 'via upload link' : 'via WhatsApp')

  return (
    <div className="flex min-h-full flex-col gap-5 px-8 py-6">
      <nav className="flex items-center gap-2 text-[13px] text-muted">
        <Link to="/clients" className="font-semibold text-brand">
          ← Clients
        </Link>
        <span>/</span>
        <span className="text-ink">{client.name}</span>
      </nav>

      <section className="flex items-center gap-5 rounded-[20px] border border-[#D3E9E4] bg-gradient-to-r from-[#DDF3EC] via-[#E7F4F6] to-[#E6EEFC] px-7 py-6">
        <Avatar name={client.name} kind={client.kind} size={76} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[24px] font-bold tracking-tight">{client.name}</h1>
            <span className={`rounded-md bg-white px-2 py-0.5 text-xs font-bold ${serviceColor[client.service]}`}>{client.service}</span>
            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-brand-dark">{client.source}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-sm font-medium text-slate-600">
            <span>{client.phone}</span>
            <span>{client.email}</span>
            <span>PAN {client.pan}</span>
            {client.gstin && <span>GSTIN {client.gstin}</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <Link to={`/inbox?client=${client.id}`} className="flex h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-[#CFE3DE] bg-white px-4 text-sm font-semibold">
            <MessageCircle size={16} />
            Open chat
          </Link>
          <Link
            to={`/requests/new?client=${client.id}`}
            className="flex h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)]"
          >
            <Plus size={16} strokeWidth={2.3} />
            New request
          </Link>
        </div>
      </section>

      <div className="sticky top-0 z-10 -mx-8 flex h-11 gap-7 border-b border-line bg-canvas px-8 text-sm font-semibold text-muted" role="tablist">
        {tabs.map((t) => {
          const n = t.key === 'requests' ? mine.length : t.key === 'documents' ? folderFiles.length : null
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center border-b-[3px] ${tab === t.key ? 'border-brand text-brand-dark' : 'border-transparent hover:text-ink'}`}
            >
              {t.label}
              {n !== null && <span className="ml-1.5 rounded-md bg-white px-1.5 py-px text-xs">{n}</span>}
            </button>
          )
        })}
      </div>

      {/* ---------------- Overview ---------------- */}
      {tab === 'overview' && (
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-8 flex flex-col gap-5">
            <div className="grid grid-cols-4 gap-4">
              {[
                ['Open requests', open.length, 'text-ink'],
                ['To review', count('to_review'), 'text-warn'],
                ['Approved', count('approved'), 'text-ok'],
                ['Still pending', count('pending') + count('rejected'), 'text-info'],
              ].map(([label, n, tone]) => (
                <div key={label as string} className="rounded-2xl border border-line bg-white px-5 py-4">
                  <div className={`text-[28px] font-bold leading-none tracking-tight ${tone}`}>{n}</div>
                  <div className="mt-1.5 text-[13px] font-medium text-muted">{label}</div>
                </div>
              ))}
            </div>

            <section className="rounded-[18px] border border-line bg-white px-6 py-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold tracking-tight">Open requests</h2>
                <button type="button" onClick={() => setTab('requests')} className="text-[13px] font-semibold text-brand">
                  See all
                </button>
              </div>
              {open.length === 0 && <p className="pt-3 text-sm text-muted">No open requests.</p>}
              {open.map((r) => {
                const p = progressOf(r)
                const st = stateLabel[requestState(r)]
                return (
                  <Link key={r.id} to={`/requests/${r.id}`} className="flex items-center gap-4 border-b border-line py-3.5 last:border-b-0 hover:bg-slate-50">
                    <div className="flex-1">
                      <div className="text-[15px] font-semibold">
                        {r.title} <span className="ml-1 text-xs font-medium text-muted">{r.ref}</span>
                      </div>
                      <div className="text-[13px] text-muted">
                        Sent {fmtDate(r.createdAt)} · due {fmtDate(r.due)}
                      </div>
                    </div>
                    <div className="flex w-40 items-center gap-2.5">
                      <div className="h-1.5 flex-1 rounded-full bg-line">
                        <div className="h-1.5 rounded-full bg-brand" style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
                      </div>
                      <span className="text-[13px] font-semibold text-slate-600">
                        {p.done} / {p.total}
                      </span>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${st.className}`}>{st.text}</span>
                  </Link>
                )
              })}
            </section>

            <section className="rounded-[18px] border border-line bg-white px-6 py-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold tracking-tight">Recent documents</h2>
                <button type="button" onClick={() => setTab('documents')} className="text-[13px] font-semibold text-brand">
                  See all
                </button>
              </div>
              {recent.length === 0 && <p className="pt-3 text-sm text-muted">Nothing received yet.</p>}
              {recent.map((i) => (
                <Link key={`${i.request.id}-${i.doc.id}`} to={docLink(i)} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0 hover:bg-slate-50">
                  <FileTypeIcon file={i.doc.fileName ?? 'file.pdf'} size={34} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{i.doc.name}</div>
                    <div className="text-xs text-muted">
                      {i.doc.receivedAt} · {sourceText(i.doc)}
                    </div>
                  </div>
                  <StatusBadge status={i.doc.status} />
                </Link>
              ))}
            </section>
          </div>

          <div className="col-span-4 flex flex-col gap-5">
            <section className="rounded-[18px] border border-line bg-white px-5 py-4">
              <h2 className="pb-1 text-base font-bold tracking-tight">Details</h2>
              <Row k="Name" v={client.name} />
              <Row k="Type" v={client.kind === 'firm' ? 'Business' : 'Individual'} />
              <Row k="Service" v={client.service} />
              <Row k="PAN" v={client.pan} />
              {client.gstin && <Row k="GSTIN" v={client.gstin} />}
              <Row k="WhatsApp" v={client.phone} />
              <Row k="Email" v={client.email} />
              <Row k="Source" v={client.source} />
            </section>

            {other && (
              <section className="rounded-2xl border border-[#F5DFA8] bg-[#FEF6E4] px-4 py-4 text-[13px] leading-relaxed text-[#7A3B00]">
                <b>Shares this number with another client</b>
                <br />
                {other.name} ({other.service}) uses the same WhatsApp number. Requests to both go out as one message.
                <Link to={`/clients/${other.id}`} className="mt-3 flex items-center gap-2 rounded-[10px] bg-white px-2.5 py-2 font-semibold text-ink">
                  <Avatar name={other.name} kind={other.kind} size={26} />
                  {other.name} · {other.service}
                  <span className="ml-auto text-xs text-brand">Open</span>
                </Link>
              </section>
            )}

            <Link to="/master" className="flex items-center gap-3.5 rounded-[18px] border border-line bg-white px-5 py-4 hover:bg-slate-50">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                <FolderOpen size={22} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold">Document Master folder</div>
                <div className="text-xs text-muted">
                  {folderFiles.length} approved {folderFiles.length === 1 ? 'file' : 'files'}
                </div>
              </div>
              <span className="text-[13px] font-semibold text-brand">Open</span>
            </Link>
          </div>
        </div>
      )}

      {/* ---------------- Requests ---------------- */}
      {tab === 'requests' && (
        <div className="flex flex-col gap-3">
          {mine.length === 0 && <Empty title="No requests yet" hint="Send the first one with New request." />}
          {mine.length > 0 && (
            <div className="overflow-hidden rounded-[18px] border border-line bg-white">
              {mine.map((r) => {
                const p = progressOf(r)
                const st = stateLabel[requestState(r)]
                return (
                  <Link key={r.id} to={`/requests/${r.id}`} className="flex items-center gap-5 border-b border-line px-6 py-4 last:border-b-0 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold">
                        {r.title} <span className="ml-1 text-xs font-medium text-muted">{r.ref}</span>
                      </div>
                      <div className="text-[13px] text-muted">
                        Sent {fmtDate(r.createdAt)} from {r.via === 'own' ? 'your WhatsApp' : `the ${SHARED_NUMBER_NAME} number`}
                      </div>
                    </div>
                    <div className="flex w-44 items-center gap-2.5">
                      <div className="h-1.5 flex-1 rounded-full bg-line">
                        <div className="h-1.5 rounded-full bg-brand" style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
                      </div>
                      <span className="text-[13px] font-semibold text-slate-600">
                        {p.done} / {p.total}
                      </span>
                    </div>
                    <span className={`w-36 rounded-md px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide ${st.className}`}>{st.text}</span>
                    <span className="w-20 text-right text-[13px] font-semibold text-slate-600">Due {fmtDate(r.due)}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------- Documents ---------------- */}
      {tab === 'documents' && (
        <div className="flex flex-col gap-5">
          <ClientRepository clientId={client.id} />

          {inProgress.length > 0 && (
            <section className="rounded-[18px] border border-line bg-white px-6 py-5">
              <h2 className="text-base font-bold tracking-tight">
                In progress <span className="ml-1.5 text-sm font-medium text-muted">{inProgress.length}</span>
              </h2>
              <p className="text-[13px] text-muted">Not in the repository yet. A document moves there once you approve it.</p>
              <div className="mt-2">
                {inProgress.map((i) => {
                  const got = isReceived(i.doc)
                  const row = (
                    <>
                      {got ? (
                        <FileTypeIcon file={i.doc.fileName ?? 'file.pdf'} size={30} />
                      ) : (
                        <span className="flex h-[30px] w-[24px] items-center justify-center rounded border-[1.5px] border-dashed border-slate-300" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-semibold ${got ? '' : 'text-muted'}`}>{i.doc.name}</div>
                        <div className="text-xs text-muted">
                          {i.request.title} · {i.request.ref}
                          {got && ` · ${i.doc.receivedAt}`}
                        </div>
                      </div>
                      <StatusBadge status={i.doc.status} />
                    </>
                  )
                  const cls = 'flex items-center gap-3.5 border-b border-line py-2.5 last:border-b-0'
                  return got ? (
                    <Link key={`${i.request.id}-${i.doc.id}`} to={docLink(i)} className={`${cls} hover:bg-slate-50`}>
                      {row}
                    </Link>
                  ) : (
                    <div key={`${i.request.id}-${i.doc.id}`} className={cls}>
                      {row}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ---------------- Messages ---------------- */}
      {tab === 'messages' && (
        <MessagesTab
          clientId={client.id}
          conversations={conversations}
          reading={mode === 'own' && readReplies}
        />
      )}

      {/* ---------------- Activity ---------------- */}
      {tab === 'activity' && (
        <div className="flex flex-col gap-5">
          {mine.length === 0 && <Empty title="Nothing has happened yet" />}
          {mine.map((r) => {
            const rc = r.clients.find((c) => c.clientId === id)!
            const events: { text: string; when: string; tone: string }[] = [
              { text: `${r.title} request sent`, when: fmtDate(r.createdAt), tone: 'bg-brand' },
              ...rc.docs
                .filter(isReceived)
                .map((d) => ({ text: `${d.name} received ${sourceText(d)}`, when: d.receivedAt ?? '', tone: 'bg-info' })),
              ...rc.docs.filter((d) => d.status === 'approved').map((d) => ({ text: `${d.name} approved`, when: '', tone: 'bg-ok' })),
              ...rc.docs.filter((d) => d.status === 'rejected').map((d) => ({ text: `${d.name} sent back${d.reason ? `: ${d.reason}` : ''}`, when: '', tone: 'bg-danger' })),
              ...(rc.lastReminder ? [{ text: 'Reminder sent on WhatsApp', when: rc.lastReminder, tone: 'bg-amber-500' }] : []),
            ]
            return (
              <section key={r.id} className="rounded-[18px] border border-line bg-white px-6 py-5">
                <h2 className="text-base font-bold tracking-tight">
                  {r.title} <span className="ml-1 text-xs font-medium text-muted">{r.ref}</span>
                </h2>
                <ol className="relative mt-3 flex flex-col">
                  <span className="absolute bottom-3 left-[4px] top-3 w-0.5 bg-line" aria-hidden="true" />
                  {events.map((e, i) => (
                    <li key={i} className="relative flex items-start gap-4 py-2 text-sm">
                      <span className={`z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${e.tone}`} />
                      <span className="flex-1">{e.text}</span>
                      <span className="text-xs text-muted">{e.when}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

// The WhatsApp messages that belong to this client: what the firm sent, and the files the client sent back.
function MessagesTab({ clientId, conversations, reading }: { clientId: string; conversations: ReturnType<typeof useInbox>['conversations']; reading: boolean }) {
  const conv = conversations.find((c) => c.clientIds.includes(clientId))
  const msgs = (conv?.msgs ?? []).filter((m) => m.from === 'ca' || (reading && m.from === 'client' && m.file))
  if (!conv || msgs.length === 0) return <Empty title="No messages yet" hint="Messages you send for requests will show here." />
  return (
    <section className="rounded-[18px] border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight">WhatsApp</h2>
        <Link to={`/inbox?client=${clientId}`} className="text-[13px] font-semibold text-brand">
          Open in Inbox
        </Link>
      </div>
      <div className="flex flex-col gap-2.5 rounded-2xl bg-[#EFEAE2] p-4">
        {msgs.map((m) => {
          const mine = m.from === 'ca'
          return (
            <div key={m.id} className={`max-w-[70%] rounded-[10px] px-3 py-2 text-[14px] leading-snug shadow-sm ${mine ? 'self-end rounded-tr-none bg-[#D9FDD3]' : 'self-start rounded-tl-none bg-white'}`}>
              {m.file && (
                <div className="mb-1 flex items-center gap-2.5 rounded-md bg-slate-100 p-2">
                  <FileTypeIcon file={m.file.name} size={30} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px]">{m.file.name}</div>
                    <div className="text-xs text-slate-500">{m.file.size}</div>
                  </div>
                </div>
              )}
              {m.text && <WaText text={m.text} />}
              <div className="pt-0.5 text-right text-[11px] text-slate-500">{m.time}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
