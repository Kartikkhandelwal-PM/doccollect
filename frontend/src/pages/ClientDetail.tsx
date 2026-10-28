import { todayISO } from '../lib/dates'
import { ArrowRight, BadgePercent, ChevronRight, FileText, FolderOpen, Mail, MessageCircle, Phone, Plus, Search, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import FilterSelect, { RichFilterSelect } from '../components/FilterSelect'
import ClientRegistrations, { ChangeContact } from '../components/ClientRegistrations'
import ClientRepository from '../components/ClientRepository'
import FileTypeIcon from '../components/FileTypeIcon'
import Pagination, { usePaging } from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'
import { mainContact, useContacts } from '../data/contacts'
import { buildMaster } from '../data/master'
import type { Registration } from '../data/mock'
import { getBookClient, parentIdOf, sameContact } from '../data/mock'
import { fmtDate, isReceived, useRequests } from '../data/requests'
import type { DocRequest, RequestClient, RequestDoc } from '../data/requests'
import type { Service } from '../data/types'
import { serviceColor } from '../lib/status'

type Tab = 'overview' | 'registrations' | 'requests' | 'documents'
const tabs: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'registrations', label: 'Registrations' },
  { key: 'requests', label: 'Requests' },
  { key: 'documents', label: 'Documents' },
]

const stateLabel = {
  review: { text: 'Needs review', className: 'bg-warn-soft text-warn' },
  waiting: { text: 'Waiting for client', className: 'bg-info-soft text-info' },
  completed: { text: 'Completed', className: 'bg-ok-soft text-ok' },
} as const

function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  )
}

const btn = 'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-brand-dark transition-colors hover:border-brand hover:bg-brand-soft'
const chip = (t: Service) => `inline-block w-10 shrink-0 rounded-md bg-slate-100 py-0.5 text-center text-[11px] font-bold ${serviceColor[t]}`

// One request for one registration: "GST monthly" for Karnataka is one line, for Maharashtra another.
interface Line {
  request: DocRequest
  rc: RequestClient
  reg: Registration
}
const lineState = (rc: RequestClient): keyof typeof stateLabel => {
  const docs = rc.docs.filter((d) => d.status !== 'na')
  return docs.every((d) => d.status === 'approved') ? 'completed' : docs.some((d) => d.status === 'to_review') ? 'review' : 'waiting'
}
const lineProgress = (rc: RequestClient) => {
  const docs = rc.docs.filter((d) => d.status !== 'na')
  return { done: docs.filter(isReceived).length, total: docs.length }
}

// The requests of this client as a table, one row per registration. Used on the Overview (a few) and on the Requests tab (all, with search and paging).
function LinesTable({ lines, empty, paging, compact }: { lines: Line[]; empty: string; paging?: ReturnType<typeof usePaging<Line>>; compact?: boolean }) {
  const navigate = useNavigate()
  if (lines.length === 0) return <p className="px-6 py-8 text-sm text-muted">{empty}</p>
  const rows = paging ? paging.rows : lines
  return (
    <>
      <table className="w-full text-left max-md:hidden">
        <thead>
          <tr className="text-[11px] font-bold uppercase tracking-wider text-faint [&>th]:border-b [&>th]:border-line [&>th]:bg-slate-50 [&>th]:px-3 [&>th]:py-2.5 [&>th:first-child]:pl-6 [&>th:last-child]:pr-6">
            <th>Request</th>
            <th>Registration</th>
            {!compact && <th>Documents</th>}
            <th>Status</th>
            <th>Due</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const p = lineProgress(l.rc)
            const st = stateLabel[lineState(l.rc)]
            return (
              <tr key={`${l.request.id}-${l.rc.clientId}`} onClick={() => navigate(`/requests/${l.request.id}?client=${l.rc.clientId}`)} className="cursor-pointer border-b border-line last:border-b-0 hover:bg-slate-50/70">
                <td className="py-3 pl-6 pr-3">
                  <div className="text-[14px] font-semibold">{l.request.title}</div>
                  <div className="text-xs text-muted">
                    {l.request.ref} · sent {fmtDate(l.request.createdAt)}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={chip(l.reg.type)}>{l.reg.type}</span>
                    <span className="text-[13px]">
                      <span className="block font-semibold">{l.reg.type === 'ITR' ? 'Income tax' : (l.reg.label ?? l.reg.number)}</span>
                      <span className="block text-xs text-muted">{l.reg.number}</span>
                    </span>
                  </div>
                </td>
                {!compact && (
                <td className="px-3 py-3">
                  <div className="flex w-36 items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-line">
                      <div className="h-1.5 rounded-full bg-brand" style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-[13px] font-semibold text-slate-600">
                      {p.done}/{p.total}
                    </span>
                  </div>
                </td>
                )}
                <td className="px-3 py-3">
                  <span className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${st.className}`}>{st.text}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-[13px] font-semibold text-slate-600">{fmtDate(l.request.due)}</td>
                <td className="py-3 pl-3 pr-6 text-right text-faint">
                  <ChevronRight size={16} className="inline" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="md:hidden">
        {rows.map((l) => {
          const p = lineProgress(l.rc)
          const st = stateLabel[lineState(l.rc)]
          return (
            <Link key={`${l.request.id}-${l.rc.clientId}`} to={`/requests/${l.request.id}`} className="flex flex-col gap-2 border-b border-line px-4 py-4 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[14px] font-semibold">{l.request.title}</div>
                  <div className="text-xs text-muted">{l.request.ref} · due {fmtDate(l.request.due)}</div>
                </div>
                <span className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${st.className}`}>{st.text}</span>
              </div>
              <div className="flex items-center gap-2 text-[13px]">
                <span className={chip(l.reg.type)}>{l.reg.type}</span>
                <span className="font-semibold">{l.reg.type === 'ITR' ? 'Income tax' : (l.reg.label ?? l.reg.number)}</span>
                <span className="ml-auto text-slate-600">
                  {p.done}/{p.total} docs
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}

type Status2 = 'open' | 'overdue' | 'completed'

interface Item {
  line: Line
  doc: RequestDoc
}

export default function ClientDetail() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { requests } = useRequests()
  const location = useLocation()
  // One client per PAN. The page is the client's, and covers all its registrations (ITR, each GSTIN, each TAN).
  const client = id ? getBookClient(id) : undefined
  const regById = useMemo(() => new Map((client?.registrations ?? []).map((r) => [r.id, r])), [client])
  const ids = useMemo(() => new Set(regById.keys()), [regById])
  const [toast, setToast] = useState<string | null>(null)
  const [changingMain, setChangingMain] = useState(false)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])
  useContacts()

  // ?tab=requests&reg=<registration> shows the requests of one registration. An old ?reg=... link without a tab does the same.
  const regFilter = regById.get(params.get('reg') ?? '') ?? null
  const tab = (tabs.find((t) => t.key === (params.get('tab') ?? (regFilter ? 'requests' : 'overview')))?.key ?? 'overview') as Tab
  // Where a click goes: a tab, and optionally a registration, a kind (ITR, GST, TDS) and a status (open, overdue, completed) to filter by.
  const go = (t: Tab, f: { reg?: string; kind?: Service; status?: Status2 } = {}) =>
    setParams({ ...(t === 'overview' ? {} : { tab: t }), ...(f.reg ? { reg: f.reg } : {}), ...(f.kind ? { kind: f.kind } : {}), ...(f.status ? { status: f.status } : {}) }, { replace: true })
  const setFilter = (name: 'kind' | 'status', value: string) => {
    const next = new URLSearchParams(params)
    if (value === 'All') next.delete(name)
    else next.set(name, value)
    setParams(next, { replace: true })
  }

  // Everything this client is part of, from the real requests. One line per request and registration.
  const lines: Line[] = useMemo(
    () => requests.flatMap((request) => request.clients.filter((rc) => ids.has(rc.clientId)).map((rc) => ({ request, rc, reg: regById.get(rc.clientId)! }))),
    [requests, ids, regById],
  )
  const items: Item[] = useMemo(() => lines.flatMap((line) => line.rc.docs.map((doc) => ({ line, doc }))), [lines])
  const folderFiles = useMemo(() => buildMaster(requests).filter((f) => f.folderId?.startsWith(`c:${client?.id}/`) || (!!f.clientId && parentIdOf(f.clientId) === client?.id)), [requests, client?.id])

  // Requests tab: filter by kind and search.
  const kindParam = params.get('kind')
  const kind: 'All' | Service = kindParam === 'ITR' || kindParam === 'GST' || kindParam === 'TDS' ? kindParam : 'All'
  const statusParam = params.get('status')
  const status: 'All' | Status2 = statusParam === 'open' || statusParam === 'overdue' || statusParam === 'completed' ? statusParam : 'All'
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = (l: Line) => status === 'All' || (status === 'completed' ? lineState(l.rc) === 'completed' : lineState(l.rc) !== 'completed' && (status === 'open' || l.request.due < todayISO()))
  const shown = lines.filter((l) => (!regFilter || l.reg.id === regFilter.id) && (kind === 'All' || l.reg.type === kind) && matches(l) && (q === '' || `${l.request.title} ${l.request.ref} ${l.reg.number} ${l.reg.label ?? ''}`.toLowerCase().includes(q)))
  const linePaging = usePaging(shown, `${kind}|${status}|${query}|${regFilter?.id}`)

  // An old link to one registration (like /clients/ramesh-itr) opens the client it belongs to.
  if (client && id && client.id !== id) return <Navigate replace to={`/clients/${client.id}${location.search}`} />

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

  const others = sameContact(client.id)
  const main = mainContact(client)
  const today = todayISO()
  const openLines = lines.filter((l) => lineState(l.rc) !== 'completed')
  const openBy: Record<string, number> = {}
  for (const l of openLines) openBy[l.reg.id] = (openBy[l.reg.id] ?? 0) + 1
  const recent = [...items.filter((i) => isReceived(i.doc))].reverse().slice(0, 5)
  const docLink = (i: Item) => `/requests/${i.line.request.id}?doc=${i.line.rc.clientId}:${i.doc.id}`
  const sourceText = (d: RequestDoc) => (d.source === 'Link' ? 'via upload link' : 'via WhatsApp')
  const where = (rc: RequestClient) => {
    const r = regById.get(rc.clientId)
    return r && r.type !== 'ITR' && r.label ? ` (${r.label})` : ''
  }

  const headStyle = {
    ITR: { title: 'Income tax', icon: FileText, tile: 'bg-violet-50 text-violet-700', bar: 'bg-violet-500', none: 'Not on file' },
    GST: { title: 'GST', icon: BadgePercent, tile: 'bg-blue-50 text-info', bar: 'bg-info', none: 'Not registered for GST' },
    TDS: { title: 'TDS', icon: Wallet, tile: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500', none: 'No TAN' },
  } as const
  const headCards = (['ITR', 'GST', 'TDS'] as const).map((t) => {
    const h = headStyle[t]
    const Icon = h.icon
    const regs = client.registrations.filter((r) => r.type === t)
    if (regs.length === 0)
      return (
        <div key={t} className="flex flex-col rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-muted">
          <span className="flex items-center gap-3 px-4 pb-2.5 pt-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold">{h.title}</span>
              <span className="block text-[13px]">{h.none}</span>
            </span>
          </span>
          <span className="border-t border-dashed border-slate-300 px-4 py-2.5 text-[13px] font-medium text-faint">Nothing to show</span>
        </div>
      )
    const mineOpen = openLines.filter((l) => l.reg.type === t)
    const late = mineOpen.filter((l) => l.request.due < today).length
    return (
      <button key={t} type="button" onClick={() => go('registrations', { kind: t })} className="group flex h-full flex-col rounded-2xl border border-line bg-white text-left shadow-sm transition hover:border-brand hover:shadow-md">
        <span className="flex items-center gap-3 px-4 pb-2.5 pt-3.5">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${h.tile}`}>
            <Icon size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold">{h.title}</span>
            <span className="block text-[13px] text-muted">
              {regs.length} {regs.length === 1 ? 'registration' : 'registrations'}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-faint transition-colors group-hover:text-brand" />
        </span>
        <span className="border-t border-line px-4 py-2.5 text-[13px] font-semibold">
          {mineOpen.length === 0 ? (
            <span className="font-medium text-faint">No open requests</span>
          ) : (
            <>
              <span className="text-warn">{mineOpen.length} open</span>
              {late > 0 && <span className="text-danger"> · {late} overdue</span>}
            </>
          )}
        </span>
      </button>
    )
  })

  const kinds = (['ITR', 'GST', 'TDS'] as const).filter((t) => client.registrations.some((r) => r.type === t))

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 py-4 pb-8 max-md:pb-28 md:gap-5 md:px-8 md:py-6 md:pb-8">
      <nav className="flex items-center gap-2 text-[13px] text-muted">
        <Link to="/clients" className="font-semibold text-brand">
          ← Clients
        </Link>
        <span>/</span>
        <span className="text-ink">{client.name}</span>
      </nav>

      <section className="flex flex-col gap-4 rounded-[20px] border border-[#D3E9E4] bg-gradient-to-r from-[#DDF3EC] via-[#E7F4F6] to-[#E6EEFC] px-5 py-5 md:flex-row md:items-center md:gap-5 md:px-7 md:py-6">
        <div className="flex items-center gap-4 md:contents">
          <Avatar name={client.name} size={76} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[24px] font-bold tracking-tight">{client.name}</h1>
              {kinds.map((t) => {
                const n = client.registrations.filter((r) => r.type === t).length
                return (
                  <span key={t} className={`rounded-md bg-white px-2 py-0.5 text-xs font-bold ${serviceColor[t]}`}>
                    {t}
                    {n > 1 && <span className="ml-1 font-semibold text-muted">({n})</span>}
                  </span>
                )
              })}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-sm font-medium text-slate-600">
              <span>{main.phone}</span>
              <span>{main.email}</span>
              <span>PAN {client.pan}</span>
            </div>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2.5 md:flex">
          <Link to={`/inbox?client=${client.registrations[0].id}`} className="flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#CFE3DE] bg-white px-4 text-sm font-semibold">
            <MessageCircle size={16} />
            Open chat
          </Link>
          <Link
            to={`/requests/new?client=${client.registrations[0].id}`}
            className="flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)]"
          >
            <Plus size={16} strokeWidth={2.3} />
            New request
          </Link>
        </div>
      </section>

      <div className="sticky top-0 z-10 -mx-4 flex h-11 shrink-0 gap-7 overflow-x-auto border-b border-line bg-canvas px-4 text-sm font-semibold text-muted md:-mx-8 md:px-8" role="tablist">
        {tabs.map((t) => {
          const n = t.key === 'registrations' ? client.registrations.length : t.key === 'requests' ? lines.length : t.key === 'documents' ? folderFiles.length : null
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => go(t.key)}
              className={`flex shrink-0 items-center whitespace-nowrap border-b-[3px] ${tab === t.key ? 'border-brand text-brand-dark' : 'border-transparent hover:text-ink'}`}
            >
              {t.label}
              {n !== null && <span className="ml-1.5 rounded-md bg-white px-1.5 py-px text-xs">{n}</span>}
            </button>
          )
        })}
      </div>

      {/* ---------------- Overview ---------------- */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-4 md:gap-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">{headCards}</div>
          <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-4 md:gap-5 lg:col-span-8">
              <section className="overflow-hidden rounded-[18px] border border-line bg-white">
                <div className="flex items-center justify-between px-4 pb-3 pt-4 md:px-6">
                  <h2 className="text-base font-bold tracking-tight">
                    Open requests <span className="ml-1 text-sm font-medium text-muted">{openLines.length}</span>
                  </h2>
                  <button type="button" onClick={() => go('requests')} className={btn}>
                    All requests <ArrowRight size={14} />
                  </button>
                </div>
                <LinesTable lines={openLines.slice(0, 5)} empty="No open requests." compact />
                {openLines.length > 5 && <p className="border-t border-line px-6 py-2.5 text-[13px] text-muted">Showing 5 of {openLines.length}. See all in Requests.</p>}
              </section>

              <section className="rounded-[18px] border border-line bg-white px-4 py-4 md:px-6 md:py-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold tracking-tight">Recent documents</h2>
                  <button type="button" onClick={() => go('documents')} className={btn}>
                    All documents <ArrowRight size={14} />
                  </button>
                </div>
                {recent.length === 0 && <p className="pt-3 text-sm text-muted">Nothing received yet.</p>}
                {recent.map((i) => (
                  <Link key={`${i.line.request.id}-${i.line.rc.clientId}-${i.doc.id}`} to={docLink(i)} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0 hover:bg-slate-50">
                    <FileTypeIcon file={i.doc.fileName ?? 'file.pdf'} size={34} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">
                        {i.doc.name}
                        {where(i.line.rc) && <span className="font-medium text-muted">{where(i.line.rc)}</span>}
                      </div>
                      <div className="text-xs text-muted">
                        {i.doc.receivedAt} · {sourceText(i.doc)}
                      </div>
                    </div>
                    <StatusBadge status={i.doc.status} />
                  </Link>
                ))}
              </section>
            </div>

            <div className="flex flex-col gap-4 md:gap-5 lg:col-span-4">
              <section className="rounded-[18px] border border-line bg-white p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold tracking-tight">Main contact</h2>
                  <button type="button" onClick={() => setChangingMain(true)} className={btn}>
                    Change
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar name={main.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold leading-tight">{main.name}</div>
                    <div className="mt-0.5 text-xs font-semibold text-brand-dark">Main contact</div>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-[auto_1fr] items-center border-t border-line pt-3 text-[13px]">
                  <dt className="flex items-center gap-2 py-1.5 text-muted">
                    <Phone size={14} /> Mobile
                  </dt>
                  <dd className="py-1.5 pl-4 text-right font-medium">{main.phone || <span className="text-faint">Not added</span>}</dd>
                  <dt className="flex items-center gap-2 border-t border-line py-1.5 text-muted">
                    <Mail size={14} /> Email
                  </dt>
                  <dd className="truncate border-t border-line py-1.5 pl-4 text-right font-medium">{main.email || <span className="text-faint">Not added</span>}</dd>
                </dl>
                <p className="mt-3 text-xs leading-relaxed text-muted">Gets the messages for every registration that has no contact of its own.</p>
              </section>

              {others.length > 0 && (
                <section className="rounded-2xl border border-[#F5DFA8] bg-[#FEF6E4] px-4 py-4 text-[13px] leading-relaxed text-[#7A3B00]">
                  <b>Same contact for other clients</b>
                  <br />
                  {main.name} also handles these. Each request still goes out as its own message with its own link.
                  {others.map((o) => (
                    <Link key={o.id} to={`/clients/${o.id}`} className="mt-2 flex items-center gap-2 rounded-[10px] bg-white px-2.5 py-2 font-semibold text-ink">
                      <Avatar name={o.name} size={26} />
                      {o.name}
                      <span className="ml-auto text-xs text-brand">Open</span>
                    </Link>
                  ))}
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
        </div>
      )}

      {/* ---------------- Registrations ---------------- */}
      {tab === 'registrations' && <ClientRegistrations key={kind} client={client} openBy={openBy} initialKind={kind} onOpen={(regId) => go('requests', { reg: regId })} onDone={setToast} />}

      {/* ---------------- Requests ---------------- */}
      {tab === 'requests' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {kinds.length > 1 && (
              <FilterSelect
                label="Module"
                value={kind}
                onChange={(v) => {
                  const k = v as 'All' | Service
                  // A registration of another module no longer fits, so it is cleared with the change.
                  const next = new URLSearchParams(params)
                  if (k === 'All') next.delete('kind')
                  else next.set('kind', k)
                  if (regFilter && k !== 'All' && regFilter.type !== k) next.delete('reg')
                  setParams(next, { replace: true })
                }}
              >
                <option value="All">All modules ({lines.length})</option>
                {(['GST', 'TDS', 'ITR'] as const)
                  .filter((k) => kinds.includes(k))
                  .map((k) => (
                    <option key={k} value={k}>
                      {k} ({lines.filter((l) => l.reg.type === k).length})
                    </option>
                  ))}
              </FilterSelect>
            )}
            {client.registrations.length > 1 && (
              <RichFilterSelect
                label="Registration"
                allLabel="All registrations"
                value={regFilter?.id ?? ''}
                onChange={(v) => {
                  const next = new URLSearchParams(params)
                  if (v) next.set('reg', v)
                  else next.delete('reg')
                  setParams(next, { replace: true })
                }}
                options={client.registrations
                  .filter((r) => kind === 'All' || r.type === kind)
                  .map((r) => ({ value: r.id, label: r.type === 'ITR' ? 'ITR' : (r.label ?? r.number), sub: r.number }))}
              />
            )}
            <FilterSelect label="Status" value={status} onChange={(v) => setFilter('status', v)}>
              <option value="All">All statuses</option>
              <option value="open">Open</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </FilterSelect>
            <label className="flex h-10 w-[280px] items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm text-muted transition-colors hover:border-slate-400 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
              <Search size={15} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search request or number" className="w-full bg-transparent outline-none placeholder:text-muted" />
            </label>
          </div>
          {lines.length > 0 && shown.length !== lines.length && (
            <div className="flex items-center gap-3 text-[13px] text-muted">
              <span>
                Showing <b className="text-ink">{shown.length}</b> of <b className="text-ink">{lines.length}</b> requests
              </span>
              {(
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    go('requests')
                  }}
                  className="font-semibold text-brand-dark hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
          {lines.length === 0 ? (
            <Empty title="No requests yet" hint="Send the first one with New request." />
          ) : (
            <div className="overflow-clip rounded-[18px] border border-line bg-white">
              <LinesTable lines={shown} paging={linePaging} empty="No request matches." />
              <Pagination p={linePaging} noun="requests" />
            </div>
          )}
        </div>
      )}

      {/* ---------------- Documents ---------------- */}
      {tab === 'documents' && (
        <div className="flex flex-col gap-5">
          <ClientRepository clientId={client.id} />
        </div>
      )}

      {changingMain && <ChangeContact client={client} onClose={() => setChangingMain(false)} onDone={setToast} />}
      <Toast message={toast} />
    </div>
  )
}
