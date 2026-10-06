import { Check, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import DueDatePicker from '../components/DueDatePicker'
import WaText from '../components/WaText'
import { clients, getClient } from '../data/mock'
import { buildMaster, isPermanent } from '../data/master'
import { fmtDate, useRequests } from '../data/requests'
import { useSetup } from '../data/setup'
import type { DocRequest } from '../data/requests'
import type { Service } from '../data/types'
import { useMessenger } from '../data/messenger'
import { defaultDue } from '../lib/dates'
import { serviceColor } from '../lib/status'
import { fillTemplate, formatList } from '../lib/template'
import { SHARED_NUMBER_NAME } from '../lib/brand'

type Step = 1 | 2 | 3 | 4
type CatalogDoc = { id: string; name: string }

const stepLabels = ['Choose clients', 'Choose documents', 'Review and send']

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

function Stepper({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-2.5 text-sm font-semibold">
      {stepLabels.map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <li key={label} className="flex items-center gap-2.5">
            <span className={`flex items-center gap-2 ${done ? 'text-ok' : active ? 'text-ink' : 'text-muted'}`}>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] ${
                  done ? 'bg-ok-soft' : active ? 'bg-brand text-white' : 'bg-slate-100'
                }`}
              >
                {done ? <Check size={14} strokeWidth={3.2} /> : n}
              </span>
              {label}
            </span>
            {n < 3 && <span className={`h-0.5 w-8 ${n < step ? 'bg-brand' : 'bg-slate-200'}`} />}
          </li>
        )
      })}
    </ol>
  )
}

function Footer({
  onBack,
  backLabel,
  onNext,
  nextLabel,
  note,
  disabled,
}: {
  onBack: () => void
  backLabel: string
  onNext: () => void
  nextLabel: string
  note: string
  disabled?: boolean
}) {
  return (
    <div className="sticky bottom-0 -mx-8 mt-auto flex items-center justify-between border-t border-line bg-white px-8 py-3.5">
      <button type="button" onClick={onBack} className="h-12 rounded-xl border border-line bg-white px-6 text-sm font-semibold hover:bg-canvas">
        {backLabel}
      </button>
      <div className="flex items-center gap-4">
        <span className="text-[13px] text-muted">{note}</span>
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className="h-12 rounded-xl bg-brand px-7 text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  )
}

export default function NewRequest() {
  const navigate = useNavigate()
  const { create, requests } = useRequests()
  const { sendRequest } = useMessenger()
  const { groups, templates, messageTemplates, firm, ownNumber, whatsapp } = useSetup()
  const [params] = useSearchParams()
  const preselected = params.get('client')

  const [step, setStep] = useState<Step>(preselected ? 2 : 1)
  const [selected, setSelected] = useState<string[]>(preselected && getClient(preselected) ? [preselected] : [])
  const [query, setQuery] = useState('')
  const [service, setService] = useState<'All' | Service>('All')
  const [onlySelected, setOnlySelected] = useState(false)

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? 'custom')
  const [docIds, setDocIds] = useState<string[]>(templates[0]?.docIds ?? [])
  const [custom, setCustom] = useState<CatalogDoc[]>([])
  const [customText, setCustomText] = useState('')

  // Starts on whatever is connected in Settings. Your own number is only there once it is connected.
  const [picked, setVia] = useState<'own' | 'kdk'>(ownNumber ? 'own' : 'kdk')
  const via = picked === 'own' && !ownNumber ? 'kdk' : picked
  const [due, setDue] = useState('')
  const [dueTouched, setDueTouched] = useState(false)
  const [created, setCreated] = useState<DocRequest | null>(null)
  const [messageCount, setMessageCount] = useState(0)

  const allDocs = useMemo(() => [...groups.flatMap((g) => g.docs), ...custom], [custom])
  const chosenDocs = docIds.map((id) => allDocs.find((d) => d.id === id)).filter((d): d is CatalogDoc => !!d)
  const chosenClients = selected.map((id) => getClient(id)).filter((c) => c !== undefined)

  // Documents that never change (PAN, Aadhaar ...) are not asked again from a client who already has them on file.
  // "Ask again" on a document asks everyone, for the times a copy is old or wrong.
  const master = useMemo(() => buildMaster(requests), [requests])
  const [askAgain, setAskAgain] = useState<string[]>([])
  const onFile = (clientId: string, d: { id: string; name: string }) =>
    isPermanent(d.name) && !askAgain.includes(d.id) ? master.find((f) => f.name === d.name && f.folderId?.startsWith(`c:${clientId}/`)) : undefined
  const haveCount = (d: { id: string; name: string }) => chosenClients.filter((c) => onFile(c.id, d)).length

  // Every client gets their own message and their own link, even when two of them use the same number.
  const sharedCount = chosenClients.filter((c) => chosenClients.some((o) => o.id !== c.id && o.phone === c.phone)).length

  const list = clients.filter(
    (c) =>
      (!onlySelected || selected.includes(c.id)) &&
      (service === 'All' || c.service === service) &&
      (query === '' || `${c.name} ${c.phone} ${c.pan}`.toLowerCase().includes(query.toLowerCase())),
  )

  const toggleClient = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleDoc = (id: string) => {
    setTemplateId('custom')
    setDocIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }
  const pickTemplate = (id: string) => {
    setTemplateId(id)
    const t = templates.find((x) => x.id === id)
    if (t && id !== 'custom') setDocIds(t.docIds)
  }
  const addCustom = () => {
    const name = customText.trim()
    if (!name) return
    const doc = { id: `c-${Date.now()}`, name }
    setCustom((c) => [...c, doc])
    setDocIds((s) => [...s, doc.id])
    setCustomText('')
    setTemplateId('custom')
  }

  const first = chosenClients[0]
  const title = templates.find((t) => t.id === templateId)?.name ?? 'Custom'

  // The words come from Message templates, so editing that page changes what clients receive.
  const req = messageTemplates.find((m) => m.id === 'request')
  const requestTemplate = (via === 'kdk' ? req?.onBehalf : req?.text) ?? ''
  const message = fillTemplate(
    requestTemplate,
    {
      name: (first?.name ?? 'there').split(' ')[0],
      firm: firm.name,
      documents: formatList(chosenDocs.filter((d) => !(first && onFile(first.id, d))).map((d) => d.name)),
      request: templateId === 'custom' ? 'your request' : title,
      due_date: due ? fmtDate(due) : 'the last date',
    },
  )

  const send = () => {
    const r = create({
      title: templateId === 'custom' ? 'Custom request' : title,
      due,
      via,
      clientIds: selected,
      docs: chosenDocs,
      onFile: Object.fromEntries(
        chosenClients.map((c) => [c.id, Object.fromEntries(chosenDocs.flatMap((d) => { const f = onFile(c.id, d); return f ? [[d.id, { fileName: f.fileName, receivedAt: f.date }]] : [] }))]),
      ),
    })
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

  // ---------- Step 4: sent ----------
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
          3. Clients who do not reply stay under “Waiting for clients”. You can remind them in one click.
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

  const heading =
    step === 1
      ? { t: 'Who do you want to ask?', s: 'Tick one or more clients. Search or filter by service.' }
      : step === 2
        ? { t: 'What do you need from them?', s: 'Pick a saved checklist, then tick or add documents.' }
        : { t: 'Check and send', s: 'This is what your clients will receive.' }

  return (
    <div className="flex min-h-full flex-col gap-5 px-8">
      <div className="sticky top-0 z-10 -mx-8 flex items-end justify-between border-b border-line bg-canvas px-8 pb-4 pt-6">
        <div>
          <div className="text-[13px] text-muted">
            <Link to="/requests" className="font-semibold text-brand">
              ← Requests
            </Link>{' '}
            · Step {step} of 3
          </div>
          <h1 className="mt-1 text-[24px] font-bold tracking-tight">{heading.t}</h1>
          <p className="mt-0.5 text-sm text-muted">{heading.s}</p>
        </div>
        <Stepper step={step} />
      </div>

      {/* ---------- Step 1: clients ---------- */}
      {step === 1 && (
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-8 overflow-hidden rounded-[18px] border border-line bg-white">
            <div className="flex items-center gap-3.5 border-b border-line p-4">
              <label className="flex h-11 flex-1 items-center gap-2.5 rounded-xl bg-canvas px-3.5 text-sm text-muted">
                <Search size={16} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, number or PAN" className="w-full bg-transparent outline-none placeholder:text-muted" />
              </label>
              <div className="flex rounded-xl bg-[#E9EEF5] p-1 text-[13px] font-semibold text-slate-600">
                {(['All', 'GST', 'TDS', 'ITR'] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setService(f)} className={`rounded-[9px] px-3.5 py-2 ${service === f ? 'bg-white text-ink shadow-sm' : ''}`}>
                    {f}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-pressed={onlySelected}
                onClick={() => setOnlySelected((v) => !v)}
                className={`h-11 shrink-0 whitespace-nowrap rounded-xl border px-4 text-[13px] font-semibold ${onlySelected ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line hover:bg-canvas'}`}
              >
                Selected ({selected.length})
              </button>
            </div>
            {list.length === 0 && <p className="p-6 text-sm text-muted">{onlySelected ? 'You have not selected anyone yet.' : 'No clients match.'}</p>}
            {list.map((c) => {
              const on = selected.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleClient(c.id)}
                  className={`flex w-full items-center gap-3.5 border-b border-line px-6 py-3 text-left last:border-b-0 ${on ? 'bg-[#F1F9F6]' : 'hover:bg-slate-50'}`}
                >
                  <Box on={on} />
                  <Avatar name={c.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">
                      {c.name} <span className={`ml-1 text-xs font-bold ${serviceColor[c.service]}`}>{c.service}</span>
                    </div>
                    <div className="text-[13px] text-muted">{c.phone}</div>
                  </div>
                  {c.sharedWith && <span className="text-xs font-semibold text-amber-700">Shares number</span>}
                </button>
              )
            })}
          </div>

          <div className="sticky top-32 col-span-4 flex flex-col gap-4 self-start">
            <div className="rounded-[18px] border border-line bg-white p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold tracking-tight">Selected</h2>
                <span className="flex items-center gap-3 text-[13px] font-semibold">
                  <span className="text-brand-dark">{selected.length} clients</span>
                  {selected.length > 0 && (
                    <button type="button" onClick={() => setSelected([])} className="text-muted hover:text-danger">
                      Clear all
                    </button>
                  )}
                </span>
              </div>
              {selected.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Nobody yet. Tick clients on the left.</p>
              ) : (
                <ul className="mt-3 flex max-h-[calc(100vh-420px)] min-h-24 flex-col gap-2.5 overflow-y-auto pr-1 text-sm font-medium">
                  {chosenClients.map((c) => (
                    <li key={c.id} className="flex items-center justify-between">
                      <span>
                        {c.name} <span className={`text-xs font-bold ${serviceColor[c.service]}`}>{c.service}</span>
                      </span>
                      <button type="button" onClick={() => toggleClient(c.id)} className="text-muted hover:text-danger" aria-label={`Remove ${c.name}`}>
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {sharedCount > 0 && (
              <div className="rounded-2xl border border-[#F5DFA8] bg-[#FEF6E4] p-4 text-[13px] leading-relaxed text-[#7A3B00]">
                <b>{sharedCount} of these clients use the same WhatsApp number.</b>
                <br />
                Each one still gets their own message and their own upload link.
              </div>
            )}
            <div className="rounded-2xl border border-[#D3E9E4] bg-gradient-to-r from-[#E4F5EE] to-[#E8F1FD] p-4 text-[13px] leading-relaxed text-slate-600">
              <b className="text-brand-dark">What happens next</b>
              <br />
              Step 2: choose documents. Step 3: check the message and send.
            </div>
          </div>
        </div>
      )}

      {/* ---------- Step 2: documents ---------- */}
      {step === 2 && (
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-8 flex flex-col gap-5">
          <section className="rounded-[18px] border border-line bg-white px-6 py-5">
            <h2 className="text-base font-bold tracking-tight">Start from a saved checklist</h2>
            <div className="mt-3.5 grid max-h-[236px] grid-cols-3 gap-3 overflow-y-auto pr-1">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t.id)}
                  className={`rounded-2xl p-3.5 text-left ${templateId === t.id ? 'border-2 border-brand bg-[#EEF8F5]' : 'border border-line hover:bg-canvas'} ${t.id === 'custom' && templateId !== 'custom' ? 'border-dashed' : ''}`}
                >
                  <div className={`text-[15px] font-semibold ${templateId === t.id ? 'text-brand-dark' : ''}`}>{t.name}</div>
                  <div className="text-xs text-muted">{t.id === 'custom' ? 'Pick your own' : `${t.docIds.length} documents`}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[18px] border border-line bg-white px-6 py-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight">
                Documents to ask for <span className="ml-1.5 font-medium text-muted">{docIds.length} selected</span>
              </h2>
              <div className="flex gap-2">
                <input
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                  placeholder="Add your own document"
                  className="h-10 w-64 rounded-xl border border-line px-3.5 text-sm outline-none focus:border-brand"
                />
                <button type="button" onClick={addCustom} className="flex h-10 items-center gap-1.5 rounded-xl bg-canvas px-4 text-[13px] font-semibold hover:bg-slate-100">
                  <Plus size={14} strokeWidth={2.4} />
                  Add
                </button>
              </div>
            </div>
            <div className="mt-4 columns-2 gap-x-8">
              {[...groups, ...(custom.length ? [{ title: 'Added by you', docs: custom }] : [])].map((g) => (
                <div key={g.title} className="mb-5 break-inside-avoid">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-faint">{g.title}</div>
                  <div className="flex flex-col gap-1.5">
                    {g.docs.map((d) => {
                      const on = docIds.includes(d.id)
                      const have = on ? haveCount(d) : 0
                      const total = chosenClients.length
                      return (
                        <div key={d.id} className={`flex items-center gap-2 rounded-xl pr-3 ${on ? 'bg-[#EEF8F5]' : 'border border-line hover:bg-canvas'}`}>
                          <button type="button" role="checkbox" aria-checked={on} onClick={() => toggleDoc(d.id)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left text-sm font-medium">
                            <Box on={on} />
                            <span className="truncate">{d.name}</span>
                          </button>
                          {on && isPermanent(d.name) && askAgain.includes(d.id) && (
                            <button type="button" onClick={() => setAskAgain((a) => a.filter((x) => x !== d.id))} className="shrink-0 text-xs font-semibold text-muted hover:text-ink hover:underline">
                              Asking everyone · undo
                            </button>
                          )}
                          {have > 0 && (
                            <span className="flex shrink-0 items-center gap-2 text-xs">
                              <span className="font-semibold text-brand-dark">{total === 1 ? 'On file' : `On file for ${have} of ${total}`}</span>
                              <button type="button" onClick={() => setAskAgain((a) => [...a, d.id])} className="font-semibold text-muted hover:text-ink hover:underline">
                                Ask again
                              </button>
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
          </div>

          <div className="sticky top-32 col-span-4 self-start">
            <div className="rounded-[18px] border border-line bg-white p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold tracking-tight">Selected documents</h2>
                <span className="flex items-center gap-3 text-[13px] font-semibold">
                  <span className="text-brand-dark">{docIds.length}</span>
                  {docIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocIds([])
                        setTemplateId('custom')
                      }}
                      className="text-muted hover:text-danger"
                    >
                      Clear all
                    </button>
                  )}
                </span>
              </div>
              {chosenDocs.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Nothing yet. Tick documents on the left.</p>
              ) : (
                <ol className="mt-3 flex max-h-[calc(100vh-330px)] min-h-24 flex-col overflow-y-auto pr-1 text-sm font-medium">
                  {chosenDocs.map((d, i) => (
                    <li key={d.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-canvas">
                      <span className="w-5 shrink-0 text-xs text-muted">{i + 1}.</span>
                      <span className="flex-1">{d.name}</span>
                      <button type="button" onClick={() => toggleDoc(d.id)} className="text-muted hover:text-danger" aria-label={`Remove ${d.name}`}>
                        ✕
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Step 3: review and send ---------- */}
      {step === 3 && (
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-7 flex flex-col gap-4">
            <section className="rounded-[18px] border border-line bg-white px-6 py-5">
              <h2 className="text-base font-bold tracking-tight">Send from</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {ownNumber ? (
                  <button type="button" onClick={() => setVia('own')} className={`rounded-2xl p-3.5 text-left ${via === 'own' ? 'border-2 border-brand bg-[#EEF8F5]' : 'border border-line'}`}>
                    <div className={`text-sm font-semibold ${via === 'own' ? 'text-brand-dark' : ''}`}>{whatsapp?.displayName ?? 'Your WhatsApp'}</div>
                    <div className="text-[13px] text-slate-600">{ownNumber} · replies are read here</div>
                  </button>
                ) : (
                  <Link to="/settings?tab=whatsapp" className="rounded-2xl border border-dashed border-slate-300 p-3.5 text-left hover:border-brand">
                    <div className="text-sm font-semibold text-muted">Your WhatsApp</div>
                    <div className="text-[13px] text-muted">Not connected · <span className="font-semibold text-brand">Connect it in Settings</span></div>
                  </Link>
                )}
                <button type="button" onClick={() => setVia('kdk')} className={`rounded-2xl p-3.5 text-left ${via === 'kdk' ? 'border-2 border-brand bg-[#EEF8F5]' : 'border border-line'}`}>
                  <div className={`text-sm font-semibold ${via === 'kdk' ? 'text-brand-dark' : ''}`}>{SHARED_NUMBER_NAME}</div>
                  <div className="text-[13px] text-muted">Shared number · link only · replies are not read</div>
                </button>
              </div>
            </section>
            <section className="rounded-[18px] border border-line bg-white px-6 py-5">
              <h2 className="text-base font-bold tracking-tight">Options</h2>
              <div className="mt-3">
                <div className="text-[13px] text-muted">Last date</div>
                <DueDatePicker
                  value={due}
                  onChange={(v) => {
                    setDue(v)
                    setDueTouched(true)
                  }}
                />
              </div>
            </section>
          </div>

          <div className="col-span-5 flex flex-col gap-4">
            <section className="rounded-[18px] border border-line bg-white px-6 py-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold tracking-tight">Message preview</h2>
                <span className="text-xs font-medium text-muted">to {first?.name}</span>
              </div>
              <div className="mt-3 rounded-2xl bg-[#EFEAE2] p-3.5">
                <div className="rounded-[10px] rounded-tr-none bg-[#D9FDD3] px-3 py-2.5 text-[13.5px] leading-relaxed shadow-sm">
                  <WaText text={message} />
                </div>
              </div>
            </section>
            <section className="rounded-[18px] border border-line bg-white px-6 py-5 text-sm">
              <h2 className="text-base font-bold tracking-tight">Summary</h2>
              <dl className="mt-3 flex flex-col gap-2.5">
                <div className="flex justify-between"><dt className="text-muted">Clients</dt><dd className="font-semibold">{chosenClients.length}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">WhatsApp messages</dt><dd className="font-semibold">{chosenClients.length}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Documents each</dt><dd className="font-semibold">{chosenDocs.length}</dd></div>
                {chosenDocs.some((d) => haveCount(d) > 0) && <div className="flex justify-between"><dt className="text-muted">Already on file, not asked</dt><dd className="font-semibold">{chosenDocs.reduce((n, d) => n + haveCount(d), 0)}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted">Due</dt><dd className="font-semibold">{fmtDate(due)}</dd></div>
              </dl>
            </section>
          </div>
        </div>
      )}

      {step === 1 && (
        <Footer onBack={() => navigate('/requests')} backLabel="Cancel" onNext={() => setStep(2)} nextLabel="Continue to documents →" note={`${selected.length} selected`} disabled={selected.length === 0} />
      )}
      {step === 2 && (
        <Footer onBack={() => setStep(1)} backLabel="← Back" onNext={() => {
            if (!dueTouched) setDue(defaultDue(templateId))
            setStep(3)
          }} nextLabel="Continue to review →" note={`${docIds.length} documents`} disabled={docIds.length === 0} />
      )}
      {step === 3 && (
        <Footer onBack={() => setStep(2)} backLabel="← Back" onNext={send} nextLabel={`Send ${chosenClients.length} ${chosenClients.length === 1 ? 'message' : 'messages'}`} note="Nothing is sent until you press this" disabled={!due} />
      )}
    </div>
  )
}
