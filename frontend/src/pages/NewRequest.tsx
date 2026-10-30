import { ArrowLeft, Check, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import DueDatePicker from '../components/DueDatePicker'
import WaText from '../components/WaText'
import { book, getBookClient, getClient, regSuffix } from '../data/mock'
import { fmtDate, useRequests } from '../data/requests'
import { useInbox } from '../data/inbox'
import { useSetup } from '../data/setup'
import type { DocRequest } from '../data/requests'
import type { Service } from '../data/types'
import { contactOf, useContacts, whatsappOn } from '../data/contacts'
import { useMessenger } from '../data/messenger'
import { defaultDue } from '../lib/dates'
import { serviceColor } from '../lib/status'
import { fillTemplate, formatDocuments } from '../lib/template'
import { LINK_DOMAIN, SHARED_NUMBER_NAME } from '../lib/brand'
import { linkToken } from '../lib/links'

type CatalogDoc = { id: string; name: string; multiple?: boolean; optional?: boolean }
type Kind = Service

const kindName: Record<Kind, string> = { ITR: 'ITR', GST: 'GST', TDS: 'TDS' }

function Box({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${on ? 'bg-brand text-white' : 'border-[1.5px] border-slate-300 bg-white'}`}
      aria-hidden="true"
    >
      {on && <Check size={13} strokeWidth={3.4} />}
    </span>
  )
}

function Section({ n, title, hint, right, children }: { n?: number; title?: string; hint?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-line bg-white">
      {title && (
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          {n && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">{n}</span>}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold tracking-tight">{title}</h2>
            {hint && <p className="text-[13px] text-muted">{hint}</p>}
          </div>
          {right}
        </div>
      )}
      <div className="p-6">{children}</div>
    </section>
  )
}

// A soft colour behind the title, by what the checklist is used for.
const tint: Record<Kind, string> = { ITR: 'from-violet-50 to-white', GST: 'from-blue-50 to-white', TDS: 'from-amber-50 to-white' }

const ROW = 'grid grid-cols-[24px_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)_110px] items-center gap-4 px-4 max-md:grid-cols-[24px_minmax(0,1fr)_110px]'

const stepLabels = ['What you need', 'Who to ask', 'Review and send']

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2.5 text-sm font-semibold">
      {stepLabels.map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <li key={label} className="flex items-center gap-2.5">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${done ? 'bg-brand-soft text-brand-dark' : active ? 'bg-brand text-white' : 'bg-slate-200 text-slate-500'}`}>{done ? <Check size={14} strokeWidth={3} /> : n}</span>
            <span className={active ? 'text-ink' : 'text-muted'}>{label}</span>
            {n < 3 && <span className={`h-0.5 w-8 ${n < step ? 'bg-brand' : 'bg-slate-200'}`} />}
          </li>
        )
      })}
    </ol>
  )
}

export default function NewRequest() {
  const navigate = useNavigate()
  useContacts()
  const { create, receiveFile } = useRequests()
  const { markPlaced } = useInbox()
  const { sendRequest } = useMessenger()
  const { documents, groups, compliances, messageTemplates, firm, ownNumber, whatsapp, sendFrom, approvedTemplates, viaFor, addCompliance } = useSetup()
  const [params] = useSearchParams()
  // Opened from the Tracker with some clients ticked: they are asked only for what each one is missing.
  const fromTracker = (useLocation().state as { tracker?: { kind: Kind; complianceId: string; clientIds: string[]; missing: Record<string, string[]> } } | null)?.tracker
  const trackerDocs = fromTracker ? [...new Set(Object.values(fromTracker.missing).flat())] : []
  const preselected = params.get('client')
  // Opened from a file a client sent with no request: when the request is sent, that file goes on its document.
  const fileParam = params.get('file')
  const docParam = params.get('doc') ?? ''
  const convParam = params.get('conv') ?? ''
  const preClient = preselected ? (getClient(preselected) ? getBookClient(preselected) : getBookClient(preselected)) : undefined

  // Kind first: it decides which checklists and which registrations are offered.
  const kindParam = params.get('kind')
  const firstKind = (['ITR', 'GST', 'TDS'] as const).find((k) => preClient?.registrations.some((r) => r.type === k))
  const [kind, setKind] = useState<Kind>(fromTracker?.kind ?? (kindParam === 'ITR' || kindParam === 'GST' || kindParam === 'TDS' ? kindParam : (firstKind ?? 'GST')))
  const [complianceId, setComplianceId] = useState<string>(() => fromTracker?.complianceId ?? compliances.find((c) => c.kind === kind)?.id ?? 'custom')
  const [docIds, setDocIds] = useState<string[]>(() => (fromTracker ? trackerDocs : (compliances.find((c) => c.kind === kind)?.docIds ?? [])))
  const [custom, setCustom] = useState<CatalogDoc[]>([])
  const [docQuery, setDocQuery] = useState('')

  // What is picked are registrations: a client's ITR, or one of its GSTINs or TANs. Each one gets its own request line and its own message.
  const [selected, setSelected] = useState<string[]>(() => fromTracker?.clientIds ?? (preClient ? preClient.registrations.filter((r) => r.type === (kindParam === 'ITR' || kindParam === 'GST' || kindParam === 'TDS' ? kindParam : firstKind)).map((r) => r.id) : []))
  const [query, setQuery] = useState('')

  // Starts on whatever is connected in Settings. Your own number is only there once it is connected.
  // The firm picks the number once in Settings; here it only shows.
  const via: 'own' | 'kdk' = ownNumber && sendFrom === 'own' ? 'own' : 'kdk'
  const shownVia = viaFor(via, 'request')
  const [due, setDue] = useState(() => defaultDue(compliances.find((c) => c.kind === kind)?.id ?? ''))
  const [dueTouched, setDueTouched] = useState(false)
  const [created, setCreated] = useState<DocRequest | null>(null)
  const [messageCount, setMessageCount] = useState(0)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(preClient ? 2 : 1)

  const allDocs = useMemo(() => [...groups.flatMap((g) => g.docs), ...custom], [groups, custom])
  // Required or optional, for this request only. It starts from the document's own default (Documents page) and can be changed here; once the request is sent it is fixed.
  const [optChoice, setOptChoice] = useState<Record<string, boolean>>({})
  const isOpt = (id: string) => optChoice[id] ?? !!documents.find((d) => d.id === id)?.optional
  const chosenDocs = docIds
    .map((id) => allDocs.find((d) => d.id === id))
    .filter((d): d is CatalogDoc => !!d)
    .map((d) => ({ ...d, optional: isOpt(d.id) }))
  const requiredDocs = chosenDocs.filter((d) => !d.optional)
  const optionalDocs = chosenDocs.filter((d) => d.optional)
  const chosenClients = selected.map((id) => getClient(id)).filter((c) => c !== undefined)
  const checklist = compliances.find((c) => c.id === complianceId)
  // Your own checklist: the CA gives it a name (it is also the name of the request), and can keep it for next time.
  const [listQuery, setListQuery] = useState('')
  const [listKind, setListKind] = useState<'All' | Kind>('All')
  const [customName, setCustomName] = useState('')
  const [saveIt, setSaveIt] = useState(true)
  const listed = compliances.filter((c) => (listKind === 'All' || c.kind === listKind) && c.name.toLowerCase().includes(listQuery.trim().toLowerCase()))
  const title = complianceId === 'custom' ? customName.trim() || `${kindName[kind]} request` : (checklist?.name ?? 'Request')

  // Choosing a checklist sets what it is used for, fills its documents and drops registrations of another kind.
  const applyChecklist = (id: string) => {
    const c = compliances.find((x) => x.id === id)
    const k = id === 'custom' ? kind : (c?.kind ?? kind)
    setComplianceId(id)
    setKind(k)
    setDocIds(id === 'custom' ? [] : (c?.docIds ?? []))
    setSelected((sel) => sel.filter((rid) => getClient(rid)?.service === k))
    if (!dueTouched) setDue(defaultDue(id))
  }
  // The CA changed the documents of the checklist. Switching to another one would throw those changes away, so ask first.
  const base = checklist?.docIds ?? []
  const edited = complianceId === 'custom' ? docIds.length > 0 : docIds.length !== base.length || docIds.some((x) => !base.includes(x))
  const [switchTo, setSwitchTo] = useState<string | null>(null)
  const chooseChecklist = (id: string) => {
    if (id === complianceId) return
    if (edited) setSwitchTo(id)
    else applyChecklist(id)
  }
  const dq = docQuery.trim().toLowerCase()
  const shownGroups = [...groups, ...(custom.length ? [{ title: 'Added by you', docs: custom }] : [])]
    .map((g) => ({ ...g, docs: g.docs.filter((d) => dq === '' || d.name.toLowerCase().includes(dq)) }))
    .filter((g) => g.docs.length > 0)
    // The group of this kind (GST or TDS) comes first.
    .sort((a, b) => Number(b.title === kind) - Number(a.title === kind))
  const canAddTyped = dq !== '' && !allDocs.some((d) => d.name.toLowerCase() === dq)
  const addCustomNamed = (text: string) => {
    const name = text.trim()
    if (!name) return
    const doc = { id: `c-${Date.now()}`, name }
    setCustom((c) => [...c, doc])
    setDocIds((s) => [...s, doc.id])
    setDocQuery('')
  }
  const toggleDoc = (id: string) => setDocIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  // The registrations of this kind, one row each, grouped by client in the order of the client book.
  const q = query.trim().toLowerCase()
  const rows = book.flatMap((c) =>
    c.registrations
      .filter((r) => r.type === kind)
      .map((r) => ({ c, r, contact: contactOf(c, r) })),
  )
  const visible = rows.filter(({ c, r, contact }) => q === '' || `${c.name} ${c.pan} ${r.number} ${r.label ?? ''} ${contact.name} ${contact.phone}`.toLowerCase().includes(q))
  const allOn = visible.length > 0 && visible.every(({ r }) => selected.includes(r.id))
  const toggleReg = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleAll = () => setSelected((s) => (allOn ? s.filter((id) => !visible.some(({ r }) => r.id === id)) : [...s, ...visible.map(({ r }) => r.id).filter((id) => !s.includes(id))]))

  const noWhatsApp = chosenClients.filter((c) => {
    const b = getBookClient(c.id)
    const reg = b?.registrations.find((r) => r.id === c.id)
    return b && reg ? !whatsappOn(b, reg) : false
  }).length

  const first = chosenClients[0]

  // The words come from Message templates, so editing that page changes what clients receive.
  const req = messageTemplates.find((m) => m.id === 'request')
  const requestTemplate = (via === 'kdk' ? req?.onBehalf : req?.text) ?? ''
  const message = fillTemplate(requestTemplate, {
    name: first?.name ?? 'there',
    firm: firm.name,
    // Required first; an optional one says so, so the client knows it can skip it.
    documents: formatDocuments(requiredDocs.map((d) => d.name), optionalDocs.map((d) => d.name)),
    request: `${title}${first && regSuffix(first.id) ? ` (${regSuffix(first.id).replace(' · ', '')})` : ''}`,
    due_date: due ? fmtDate(due) : 'the last date',
    link: `${LINK_DOMAIN}/u/${linkToken('R-' + (1050), first?.id ?? 'client', 1)}`,
  })

  const send = () => {
    if (complianceId === 'custom' && saveIt && customName.trim()) {
      addCompliance(customName.trim(), kind, docIds)
    }
    // The checklist may have no document for this file. Then one is added to the request, so the file is not left out.
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '')
    const fits = (name: string) => norm(docParam).length > 2 && (norm(name).includes(norm(docParam)) || norm(docParam).includes(norm(name)))
    const docs = fileParam && docParam && !chosenDocs.some((d) => fits(d.name)) ? [...chosenDocs, { id: `file-${Date.now()}`, name: docParam }] : chosenDocs
    // From the Tracker, each client gets only the documents they are missing (plus anything added here for everyone).
    const docsByClient = fromTracker ? Object.fromEntries(selected.map((id) => [id, docs.filter((d) => !trackerDocs.includes(d.id) || fromTracker.missing[id]?.includes(d.id))])) : undefined
    const clientIds = docsByClient ? selected.filter((id) => (docsByClient[id]?.length ?? 0) > 0) : selected
    const r = create({ title, due, via, clientIds, docs, docsByClient })
    if (fileParam && convParam) {
      const line = r.clients.find((c) => c.clientId === preselected) ?? r.clients[0]
      const doc = line?.docs.find((d) => fits(d.name))
      if (line && doc) {
        receiveFile(r.id, line.clientId, doc.id, fileParam)
        markPlaced(convParam, fileParam, `Filed as ${doc.name} · To review`, { requestId: r.id, clientId: line.clientId, docId: doc.id })
      }
    }
    sendRequest(r)
    setMessageCount(chosenClients.length)
    setCreated(r)
    setStep(4)
  }
  const reset = () => {
    setStep(1)
    setSelected([])
    setCreated(null)
    setQuery('')
  }

  // ---------- Sent ----------
  if (step === 4 && created) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-canvas to-[#E9F5F1] px-8 py-10">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_26px_rgba(11,122,107,0.3)]">
          <Check size={34} strokeWidth={2.8} />
        </span>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Request sent</h1>
          <p className="mt-1.5 text-[15px] text-slate-600">
            {messageCount} WhatsApp {messageCount === 1 ? 'message' : 'messages'} went out to {created.clients.length}{' '}
            {created.clients.length === 1 ? 'client' : 'clients'}. Replies will show up here.
          </p>
        </div>
        <div className="w-full max-w-xl rounded-[18px] border border-line bg-white px-6 py-2">
          {created.clients.map((rc) => {
            const c = getClient(rc.clientId)
            if (!c) return null
            return (
              <div key={rc.clientId} className="flex items-center gap-3.5 border-b border-line py-3.5 last:border-b-0">
                <Avatar name={c.name} size={38} />
                <div className="flex-1">
                  <div className="text-[15px] font-semibold">
                    {c.name} <span className={`ml-1 text-xs font-bold ${serviceColor[c.service]}`}>{c.service}</span>
                  </div>
                  <div className="text-[13px] text-muted">{rc.docs.length} documents asked</div>
                </div>
                <span className="text-xs font-semibold text-ok">Sent</span>
              </div>
            )
          })}
        </div>
        <div className="w-full max-w-xl rounded-2xl border border-line bg-white px-5 py-4 text-sm leading-7 text-slate-600">
          <b className="text-ink">What happens now</b>
          <br />
          1. Clients reply with files, or use the upload link.
          <br />
          2. You see each file in the request and set its status.
          <br />
          3. Clients who do not reply stay under “Waiting”. You can remind them in one click.
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={reset} className="h-12 rounded-xl border border-line bg-white px-6 text-sm font-semibold">
            Send another
          </button>
          <button
            type="button"
            onClick={() => navigate(`/u/${created.id}/${created.clients[0].clientId}?preview=1`)}
            className="h-12 rounded-xl border border-line bg-white px-6 text-sm font-semibold"
          >
            See what the client gets
          </button>
          <button type="button" onClick={() => navigate(`/requests/${created.id}`)} className="h-12 rounded-xl bg-brand px-7 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)]">
            View {created.ref}
          </button>
        </div>
      </div>
    )
  }

  const canSend = selected.length > 0 && docIds.length > 0 && !!due
  const why = selected.length === 0 ? 'Pick at least one registration' : docIds.length === 0 ? 'Pick at least one document' : !due ? 'Pick a last date' : ''

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 pb-8 md:gap-5 md:px-8">
      <div className="z-10 -mx-4 border-b border-line bg-canvas px-4 py-3 md:sticky md:top-0 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/requests" aria-label="Back to requests" title="Back to requests" className="-ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-white hover:text-ink">
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold leading-tight tracking-tight">{step === 1 ? 'What do you need?' : step === 2 ? 'Who should get it?' : 'Check and send'}</h1>
              <p className="truncate text-[13px] text-muted">{step === 1 ? 'Pick a checklist, then change its documents if you need to.' : step === 2 ? `Only ${kindName[kind]} registrations are listed.` : 'This is what your clients will receive.'}</p>
            </div>
          </div>
          <Stepper step={step as 1 | 2 | 3} />
        </div>
      </div>

      {fileParam && (
        <div className="rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-[14px]">
          Started from <span className="font-semibold">{fileParam}</span>, which the client sent on WhatsApp. When you send the request, the file goes on its document.
        </div>
      )}

      {fromTracker && step < 4 && (
        <div className="rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-[14px]">
          From the Tracker: <span className="font-semibold">{fromTracker.clientIds.length} {fromTracker.clientIds.length === 1 ? 'client' : 'clients'}</span> are asked only for the documents they have not sent. The list below is everything any of them is missing.
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className={`flex min-w-0 flex-col gap-5 ${step === 3 ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          {/* ---------- 1. What ---------- */}
          {step === 1 && (
            <div className="grid h-[calc(100vh-232px)] min-h-[520px] grid-cols-1 overflow-hidden rounded-[18px] border border-line bg-white md:grid-cols-[340px_1fr]">
              {/* ---- The checklists ---- */}
              <div className="flex min-h-0 flex-col border-b border-line md:border-b-0 md:border-r">
                <div className="shrink-0 border-b border-line p-3 md:flex md:h-[104px] md:flex-col md:justify-center">
                  <label className="flex h-10 items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 text-sm text-muted focus-within:border-brand">
                    <Search size={15} />
                    <input value={listQuery} onChange={(e) => setListQuery(e.target.value)} placeholder={`Search ${compliances.length} checklists`} className="w-full bg-transparent outline-none placeholder:text-muted" />
                  </label>
                  <div className="mt-2 flex w-full gap-0.5 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Income tax, GST or TDS">
                    {(['All', 'ITR', 'GST', 'TDS'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        role="tab"
                        aria-selected={listKind === k}
                        onClick={() => setListKind(k)}
                        className={`flex h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition-colors ${listKind === k ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-600 hover:text-ink'}`}
                      >
                        {k === 'All' ? 'All' : k}
                        <span className={listKind === k ? 'text-brand-dark/70' : 'text-faint'}>{k === 'All' ? compliances.length : compliances.filter((c) => c.kind === k).length}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  {listed.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={complianceId === c.id}
                      onClick={() => chooseChecklist(c.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${complianceId === c.id ? 'bg-[#EEF8F5] ring-1 ring-inset ring-brand' : 'hover:bg-canvas'}`}
                    >
                      <span className={`w-9 shrink-0 rounded-md bg-slate-100 py-0.5 text-center text-[12px] font-bold ${serviceColor[c.kind]}`}>{c.kind}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[14px] ${complianceId === c.id ? 'font-bold text-brand-dark' : 'font-semibold'}`}>{c.name}</span>
                        <span className="block text-xs text-muted">{c.docIds.length} documents</span>
                        <span className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-slate-500">
                          {c.docIds.slice(0, 4).map((id) => allDocs.find((d) => d.id === id)?.name ?? id).join(', ')}
                          {c.docIds.length > 4 && ` +${c.docIds.length - 4} more`}
                        </span>
                      </span>
                    </button>
                  ))}
                  {listed.length === 0 && <p className="p-3 text-sm text-muted">No checklist matches.</p>}
                </div>
                <div className="shrink-0 border-t border-line p-2">
                  <button
                    type="button"
                    aria-pressed={complianceId === 'custom'}
                    onClick={() => chooseChecklist('custom')}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${complianceId === 'custom' ? 'bg-[#EEF8F5] text-brand-dark ring-1 ring-inset ring-brand' : 'text-brand-dark hover:bg-canvas'}`}
                  >
                    <Plus size={15} strokeWidth={2.6} />
                    Make my own checklist
                  </button>
                </div>
              </div>

              {/* ---- The chosen one: its name, and its documents ---- */}
              <section className="flex min-h-0 flex-col">
                {complianceId === 'custom' ? (
                  /* Your own checklist: one row for what you fill in (the kind, the name, what it is used for, keep it), and a line under it. Everything on the row is the same height. */
                  <div className={`shrink-0 border-b border-line bg-gradient-to-r px-6 py-4 md:flex md:h-[104px] md:flex-col md:justify-center ${tint[kind]}`}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[12px] font-extrabold shadow-sm ring-1 ring-black/5 ${serviceColor[kind]}`}>{kind}</span>
                      <input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Name your checklist"
                        aria-label="Name of your checklist"
                        className="h-11 min-w-0 flex-[1_1_180px] rounded-xl border border-black/10 bg-white px-3.5 text-[17px] font-bold tracking-tight text-ink outline-none placeholder:font-semibold placeholder:text-faint focus:border-brand"
                      />
                      <div className="flex h-11 shrink-0 items-center gap-0.5 rounded-xl bg-white px-1 shadow-sm ring-1 ring-black/5" role="radiogroup" aria-label="Used for">
                        {(['ITR', 'GST', 'TDS'] as const).map((k) => (
                          <button
                            key={k}
                            type="button"
                            role="radio"
                            aria-checked={kind === k}
                            onClick={() => {
                              setKind(k)
                              setSelected((sel) => sel.filter((rid) => getClient(rid)?.service === k))
                            }}
                            className={`h-9 rounded-lg px-3.5 text-[13px] font-semibold transition-colors ${kind === k ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                          >
                            {kindName[k]}
                          </button>
                        ))}
                      </div>
                      <button type="button" role="checkbox" aria-checked={saveIt} onClick={() => setSaveIt((v) => !v)} className="flex h-11 shrink-0 items-center gap-2 text-[13px] font-medium text-slate-700">
                        <Box on={saveIt} />
                        Keep for next time
                      </button>
                    </div>
                    <p className="mt-2 text-[13px] text-slate-600 md:pl-[60px]">
                      {kindName[kind]} · {docIds.length} {docIds.length === 1 ? 'document' : 'documents'} · {kind === 'GST' ? 'sent to each GSTIN' : kind === 'TDS' ? 'sent to each TAN' : 'sent on the PAN'}
                    </p>
                  </div>
                ) : (
                <div className={`flex shrink-0 items-center gap-4 border-b border-line bg-gradient-to-r px-6 py-4 md:h-[104px] ${tint[kind]}`}>
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[13px] font-extrabold shadow-sm ring-1 ring-black/5 ${serviceColor[kind]}`}>{kind}</span>
                  <div className="min-w-0 flex-1">
                    {complianceId === 'custom' ? (
                      <input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Name your checklist"
                        aria-label="Name of your checklist"
                        className="block w-full rounded-lg border border-black/10 bg-white/80 px-3 py-1.5 text-[20px] font-bold tracking-tight text-ink outline-none placeholder:font-semibold placeholder:text-faint focus:border-brand"
                      />
                    ) : (
                      <h2 className="truncate text-[22px] font-bold tracking-tight text-ink">{checklist?.name}</h2>
                    )}
                    <p className="mt-0.5 text-[13px] text-slate-600">
                      {kindName[kind]} · {docIds.length} {docIds.length === 1 ? 'document' : 'documents'} · {kind === 'GST' ? 'sent to each GSTIN' : kind === 'TDS' ? 'sent to each TAN' : 'sent on the PAN'}
                    </p>
                  </div>
                  {complianceId === 'custom' ? (
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="flex gap-0.5 rounded-xl bg-white/80 p-1 shadow-sm ring-1 ring-black/5" role="radiogroup" aria-label="Used for">
                        {(['ITR', 'GST', 'TDS'] as const).map((k) => (
                          <button
                            key={k}
                            type="button"
                            role="radio"
                            aria-checked={kind === k}
                            onClick={() => {
                              setKind(k)
                              setSelected((sel) => sel.filter((rid) => getClient(rid)?.service === k))
                            }}
                            className={`h-8 rounded-lg px-3 text-[13px] font-semibold transition-colors ${kind === k ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                          >
                            {kindName[k]}
                          </button>
                        ))}
                      </div>
                      <button type="button" role="checkbox" aria-checked={saveIt} onClick={() => setSaveIt((v) => !v)} className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
                        <Box on={saveIt} />
                        Keep for next time
                      </button>
                    </div>
                  ) : (
                    edited && (
                      <button type="button" onClick={() => setDocIds(base)} className="shrink-0 rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-brand-dark hover:border-brand">
                        Reset to {checklist?.docIds.length} saved
                      </button>
                    )
                  )}
                </div>
                )}

                <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                  <div className="flex min-h-0 flex-col border-r border-line">
                    <div className="shrink-0 px-5 pb-3 pt-4">
                      <h3 className="text-[13px] font-bold">All documents</h3>
                      <p className="text-xs text-muted">Tick to add to this request.</p>
                      <label className="mt-2.5 flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm text-muted focus-within:border-brand">
                        <Search size={15} />
                        <input
                          value={docQuery}
                          onChange={(e) => setDocQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && canAddTyped) addCustomNamed(docQuery)
                          }}
                          placeholder="Search, or type a new document"
                          className="w-full bg-transparent outline-none placeholder:text-muted"
                        />
                      </label>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                      {canAddTyped && (
                        <button type="button" onClick={() => addCustomNamed(docQuery)} className="mb-2 flex w-full items-center gap-2.5 rounded-lg border border-dashed border-brand/60 px-3 py-2.5 text-left text-[14px] font-semibold text-brand-dark hover:bg-brand-soft">
                          <Plus size={15} /> Add “{docQuery.trim()}” as a new document
                        </button>
                      )}
                      {shownGroups.length === 0 && !canAddTyped && <p className="px-2 py-4 text-sm text-muted">No document matches.</p>}
                      {shownGroups.map((g) => (
                        <div key={g.title} className="mb-3">
                          <div className="mb-1 px-2 text-[12px] font-bold uppercase tracking-widest text-faint">{g.title}</div>
                          {g.docs.map((d) => {
                            const on = docIds.includes(d.id)
                            return (
                              <button
                                key={d.id}
                                type="button"
                                role="checkbox"
                                aria-checked={on}
                                onClick={() => toggleDoc(d.id)}
                                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left text-[14px] ${on ? 'bg-[#EEF8F5] font-semibold' : 'font-medium hover:bg-canvas'}`}
                              >
                                <Box on={on} />
                                {d.name}
                              </button>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-col bg-[#FAFCFB]">
                    <div className="flex shrink-0 items-start justify-between px-5 pb-3 pt-4">
                      <div>
                        <h3 className="text-[13px] font-bold">
                          In this request <span className="ml-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-dark">{docIds.length}</span>
                        </h3>
                        <p className="text-xs text-muted">What the client is asked for.</p>
                      </div>
                      {docIds.length > 0 && (
                        <button type="button" onClick={() => setDocIds([])} className="-my-2 shrink-0 whitespace-nowrap px-2 py-2 text-[13px] font-semibold text-muted hover:text-danger">
                          Clear all
                        </button>
                      )}
                    </div>
                    {chosenDocs.length > 0 && (
                      <div className="flex items-center justify-end gap-2 px-5 pb-1 text-[11px] font-semibold text-muted">
                        <span>Switch on = optional</span>
                        <span className="w-8" />
                      </div>
                    )}
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                      {chosenDocs.length === 0 && <div className="mx-2 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-muted">Nothing here yet. Tick documents on the left.</div>}
                      {(
                        [
                          ['Mandatory', requiredDocs, 'The request waits for these'],
                          ['Optional', optionalDocs, 'Client can skip these. Nobody is reminded.'],
                        ] as const
                      ).map(([title, list, hint]) =>
                        list.length === 0 && title === 'Optional' ? null : (
                          <div key={title} className="mb-3">
                            <div className="flex items-baseline gap-2 px-2.5 pb-1 pt-1.5" title={hint}>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-faint">{title}</span>
                              <span className="text-[11px] font-semibold text-muted">{list.length}</span>
                            </div>
                            {list.map((d) => (
                              <div key={d.id} className="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[14px] font-medium hover:bg-white">
                                <span className="min-w-0 flex-1 truncate" title={d.name}>
                                  {d.name}
                                </span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={!!d.optional}
                                  aria-label={`${d.name}: ${d.optional ? 'optional' : 'mandatory'}. Click to change`}
                                  title={d.optional ? 'Optional. Click to make it mandatory' : 'Mandatory. Click to make it optional'}
                                  onClick={() => setOptChoice((o) => ({ ...o, [d.id]: !d.optional }))}
                                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${d.optional ? 'bg-[#E3A33B]' : 'bg-slate-300'}`}
                                >
                                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${d.optional ? 'left-[18px]' : 'left-0.5'}`} />
                                </button>
                                <button type="button" onClick={() => toggleDoc(d.id)} aria-label={`Remove ${d.name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-danger-soft hover:text-danger">
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        ),
                      )}
                      {chosenDocs.length > 0 && requiredDocs.length === 0 && <p className="mx-2 rounded-xl bg-[#FEF0D5] px-3 py-2 text-[13px] text-[#6E3B00]">Keep at least one document mandatory, or the request has nothing to wait for.</p>}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ---------- 2. Who ---------- */}
          {step === 2 && (
          <Section>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm text-muted focus-within:border-brand">
                <Search size={15} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, number or PAN" className="w-full bg-transparent outline-none placeholder:text-muted" />
              </label>
              <button type="button" onClick={toggleAll} className="flex h-10 items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 text-sm font-semibold hover:border-brand">
                <Box on={allOn} />
                Select all {visible.length}
              </button>
              <span className="text-[13px] text-muted">
                <b className="text-ink">{selected.length}</b> of {rows.length} selected
              </span>
            </div>
            <div className="mt-3 max-h-[calc(100vh-360px)] min-h-[320px] overflow-y-auto rounded-xl border border-line">
              <div className={`${ROW} sticky top-0 z-[1] border-b border-line bg-slate-50 py-2 text-[12px] font-bold uppercase tracking-wider text-faint max-md:hidden`}>
                <span />
                <span>Client</span>
                <span>{kind === 'GST' ? 'GSTIN' : kind === 'TDS' ? 'TAN' : 'PAN'}</span>
                <span>Contact</span>
                <span>Mobile</span>
                <span />
              </div>
              {visible.length === 0 && <p className="p-6 text-sm text-muted">No {kindName[kind]} registration matches.</p>}
              {visible.map(({ c, r, contact }) => {
                const on = selected.includes(r.id)
                const waOff = !whatsappOn(c, r)
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleReg(r.id)}
                    className={`${ROW} w-full border-b border-line py-2.5 text-left last:border-b-0 ${on ? 'bg-[#EEF8F5]' : 'hover:bg-slate-50'}`}
                  >
                    <Box on={on} />
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={c.name} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{c.name}</span>
                        {r.type !== 'ITR' && r.label && <span className="block truncate text-xs text-muted">{r.label}</span>}
                      </span>
                    </span>
                    <span className="truncate font-mono text-[13px] text-slate-700 max-md:hidden">{r.number}</span>
                    <span className="min-w-0 max-md:hidden">
                      <span className="block truncate text-[13px] font-medium text-slate-700">{contact.name}</span>
                    </span>
                    <span className="truncate text-[13px] text-muted max-md:hidden">{contact.phone || 'No mobile number'}</span>
                    <span className="flex justify-end">{waOff && <span className="whitespace-nowrap rounded-full bg-danger-soft px-2 py-0.5 text-[12px] font-semibold text-danger">WhatsApp off</span>}</span>
                  </button>
                )
              })}
            </div>
          </Section>

          )}

          {/* ---------- 3. Send ---------- */}
          {step === 3 && (
          <Section>
            {/* Read-only: the firm picks the number once in Settings. */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-muted">Sent from</div>
                <div className="text-sm font-semibold">{shownVia === 'own' ? `${whatsapp?.displayName ?? 'Your WhatsApp'} · ${ownNumber}` : SHARED_NUMBER_NAME}</div>
                <div className="text-[13px] text-muted">
                  {via === 'own'
                    ? approvedTemplates.includes('request')
                      ? 'Replies are read here.'
                      : 'WhatsApp has not approved this message yet, so it goes from the shared number.'
                    : 'Clients upload through the link. Replies are not read.'}
                </div>
              </div>
              <Link to="/settings?tab=whatsapp" className="text-[13px] font-semibold text-brand hover:underline">
                Change in Settings
              </Link>
            </div>
            <div className="mt-4">
              <div className="text-[13px] font-semibold text-muted">Last date</div>
              <DueDatePicker
                value={due}
                onChange={(v) => {
                  setDue(v)
                  setDueTouched(true)
                }}
              />
            </div>
          </Section>
          )}

          {/* What will go out, in short. */}
          {step === 3 && (
          <section className="rounded-[18px] border border-line bg-white p-5">
            <h2 className="text-base font-bold tracking-tight">{title}</h2>
            <dl className="mt-3 flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">{kind === 'GST' ? 'GSTINs' : kind === 'TDS' ? 'TANs' : 'Registrations'}</dt><dd className="font-semibold">{selected.length}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Documents each</dt><dd className="font-semibold">{docIds.length}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Last date</dt><dd className="font-semibold">{due ? fmtDate(due) : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Sent from</dt><dd className="font-semibold">{via === 'own' ? (whatsapp?.displayName ?? 'Your WhatsApp') : SHARED_NUMBER_NAME}</dd></div>
            </dl>
            {noWhatsApp > 0 && (
              <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-xs leading-relaxed text-danger">
                <b>{noWhatsApp}</b> {noWhatsApp === 1 ? 'has' : 'have'} WhatsApp off, so no message will go to {noWhatsApp === 1 ? 'it' : 'them'}.
              </p>
            )}
          </section>
          )}
        </div>

        {/* ---------- Summary and message preview: only when it is time to check and send ---------- */}
        {step === 3 && (
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[132px] lg:col-span-5">

          <section className="rounded-[18px] border border-line bg-white p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-bold tracking-tight">Message preview</h2>
              <span className="text-xs font-medium text-muted">{first ? `to ${first.name}` : 'sample'}</span>
            </div>
            <div className="mt-3 rounded-2xl bg-[#EFEAE2] p-3.5">
              <div className="rounded-[10px] rounded-tr-none bg-[#D9FDD3] px-3 py-2.5 text-[14px] leading-relaxed shadow-sm">
                <WaText text={message} />
              </div>
            </div>
          </section>
        </aside>
        )}
      </div>

      {switchTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Change checklist" onClick={() => setSwitchTo(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-bold">Change the checklist?</div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">You changed the documents of this checklist. If you switch to “{switchTo === 'custom' ? 'Start from scratch' : compliances.find((c) => c.id === switchTo)?.name}”, those changes are lost.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setSwitchTo(null)} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold">
                Keep my changes
              </button>
              <button
                type="button"
                onClick={() => {
                  applyChecklist(switchTo)
                  setSwitchTo(null)
                }}
                className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 mt-auto flex items-center justify-between gap-3 border-t border-line bg-white px-4 py-3 md:-mx-8 md:px-8 md:py-3.5">
        <button type="button" onClick={() => (step === 1 ? navigate('/requests') : setStep((step - 1) as 1 | 2))} className="h-12 shrink-0 rounded-xl border border-line bg-white px-6 text-sm font-semibold hover:bg-canvas">
          {step === 1 ? 'Cancel' : '← Back'}
        </button>
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-muted max-md:hidden">{step === 1 ? `${title} · ${docIds.length} ${docIds.length === 1 ? 'document' : 'documents'}` : step === 2 ? `${title} · ${selected.length} selected` : why || 'Nothing is sent until you press this'}</span>
          <button
            type="button"
            onClick={() => (step === 3 ? send() : setStep((step + 1) as 2 | 3))}
            disabled={step === 1 ? requiredDocs.length === 0 : step === 2 ? selected.length === 0 : !canSend}
            className="h-12 rounded-xl bg-brand px-7 text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {step === 1 ? 'Continue to who →' : step === 2 ? 'Continue to review →' : `Send ${selected.length} ${selected.length === 1 ? 'message' : 'messages'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
