import { backdropProps, panelProps } from '../lib/motion'
import { motion } from 'framer-motion'
import Toast from '../components/Toast'
import { Check, Clock, ExternalLink } from 'lucide-react'
import Page from '../components/Page'
import { useEffect, useState } from 'react'
import Avatar from '../components/Avatar'
import PhoneInput from '../components/PhoneInput'
import { useWaitingFiles } from '../data/waiting'
import FirmLogo from '../components/FirmLogo'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useInbox } from '../data/inbox'
import { fmtDate, useRequests } from '../data/requests'
import { addDays, expiresOn, todayISO } from '../lib/dates'
import { useSetup } from '../data/setup'
import type { Firm } from '../data/setup'
import { RAMWIN_CONNECT_URL, SHARED_NUMBER_NAME } from '../lib/brand'
import { demoOn } from '../lib/demo'
import { formatMobile, isMobile, mobileDigits } from '../lib/phone'

type Tab = 'firm' | 'whatsapp' | 'links' | 'team' | 'usage'
const tabs: { key: Tab; label: string }[] = [
  { key: 'firm', label: 'Firm profile' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'links', label: 'Upload links' },
  { key: 'team', label: 'Team' },
  // { key: 'usage', label: 'Usage' }, // parked: the usage numbers come with the backend
]

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-[13px] font-semibold text-muted">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 block h-11 w-full rounded-xl border border-line px-3.5 text-[15px] font-medium text-ink outline-none focus:border-brand" />
    </label>
  )
}

// A short summary of the last 30 days, counted from what the app really holds. Delivered and read counts need the WhatsApp provider, so they come with the backend.
export function Usage() {
  const { conversations } = useInbox()
  const { requests } = useRequests()
  const waiting = useWaitingFiles()
  const since = addDays(todayISO(), -30)
  const sent = conversations.flatMap((c) => c.msgs.filter((m) => m.from === 'ca' && m.day >= since).map(() => c))
  const byNumber = { own: sent.filter((c) => c.via === 'own').length, kdk: sent.filter((c) => c.via === 'kdk').length }
  const messaged = new Set(conversations.flatMap((c) => (c.msgs.some((m) => m.from === 'ca' && m.day >= since) ? c.clientIds : [])))
  const docs = requests.flatMap((r) => r.clients.flatMap((c) => c.docs.map((d) => ({ ...d, clientId: c.clientId }))))
  const got = docs.filter((d) => d.status !== 'pending' && d.status !== 'na')
  const count = (st: string) => docs.filter((d) => d.status === st).length
  // Of the clients messaged, how many have sent something.
  const sentFiles = new Set(got.map((d) => d.clientId))
  const replied = [...messaged].filter((id) => sentFiles.has(id)).length

  const Card = ({ n, label, note }: { n: number; label: string; note?: string }) => (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="text-[30px] font-bold leading-none tracking-tight tabular-nums">{n}</div>
      <div className="mt-1.5 text-[13px] font-medium text-muted">{label}</div>
      {note && <div className="mt-0.5 text-xs text-faint">{note}</div>}
    </div>
  )
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section>
        <h2 className="text-base font-bold tracking-tight">Messages</h2>
        <p className="mt-0.5 text-sm text-muted">Last 30 days</p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <Card n={sent.length} label="Messages sent" />
          <Card n={byNumber.own} label="From your WhatsApp" />
          <Card n={byNumber.kdk} label={`From the ${SHARED_NUMBER_NAME} number`} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <Card n={messaged.size} label="Clients messaged" />
          <Card n={replied} label="Of them, sent files" />
          <Card n={messaged.size - replied} label="Not replied yet" />
        </div>
      </section>
      <section>
        <h2 className="text-base font-bold tracking-tight">Files</h2>
        <p className="mt-0.5 text-sm text-muted">Across all your requests</p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <Card n={got.length} label="Files received" />
          <Card n={count('approved')} label="Approved" />
          <Card n={count('to_review')} label="Waiting for review" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <Card n={count('rejected')} label="Rejected" />
          <Card n={waiting.total} label="Not placed yet" />
        </div>
      </section>
      <p className="text-xs text-muted">We keep a record of every message sent from your account.</p>
    </div>
  )
}

export default function Settings() {
  const { firm, saveFirm, team, whatsapp, connectWhatsApp, approvedTemplates, approveTemplates, connectionLost, loseConnection, messageTemplates, graceDays, setGraceDays } = useSetup()
  const { requests } = useRequests()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'whatsapp' ? 'whatsapp' : 'firm')
  const [disconnecting, setDisconnecting] = useState(false)
  const [draft, setDraft] = useState<Firm>(firm)
  const [toast, setToast] = useState<string | null>(null)
  const navigate = useNavigate()
  const goToRamwin = () => {
    // The real flow leaves for Ramwin's page; the demo uses our own stand-in screen.
    if (/^https?:/.test(RAMWIN_CONNECT_URL)) window.location.assign(RAMWIN_CONNECT_URL)
    else navigate(RAMWIN_CONNECT_URL)
  }

  useEffect(() => {
    if (params.get('connected') === '1') setToast('WhatsApp connected. A message goes from your number once WhatsApp approves its template.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const dirty = JSON.stringify(draft) !== JSON.stringify(firm)

  return (
    <Page
      header={
      <div>
        <h1 className="text-[24px] font-bold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted">Your firm, WhatsApp, upload links and team.</p>
      </div>
      }
      tabs={
      <div className="flex gap-7 overflow-x-auto border-b border-line text-sm font-semibold text-muted">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`h-11 shrink-0 whitespace-nowrap border-b-[3px] ${tab === t.key ? 'border-brand text-brand-dark' : 'border-transparent hover:text-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>
      }
    >
      {tab === 'firm' && (
        <section className="max-w-2xl rounded-[18px] border border-line bg-white p-6">
          <div className="mb-5 flex items-center gap-4 border-b border-line pb-5">
            <FirmLogo name={draft.name} logo={draft.logo} size={72} />
            <div className="flex-1">
              <div className="text-sm font-semibold">Firm logo</div>
              <p className="text-[13px] text-muted">Your clients see this on the upload page. A square image works best.</p>
              <div className="mt-2 flex gap-2">
                <label className="flex h-9 cursor-pointer items-center rounded-lg border border-line px-3.5 text-[13px] font-semibold hover:bg-canvas">
                  {draft.logo ? 'Change logo' : 'Upload logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label="Upload logo"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      const r = new FileReader()
                      r.onload = () => setDraft((d) => ({ ...d, logo: String(r.result) }))
                      r.readAsDataURL(f)
                    }}
                  />
                </label>
                {draft.logo && (
                  <button type="button" onClick={() => setDraft({ ...draft, logo: '' })} className="h-9 rounded-lg px-3 text-[13px] font-semibold text-danger hover:bg-danger-soft">
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-2">
              <Field label="Firm name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
            </div>
            <Field label="Email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} />
            <PhoneInput label="Phone" value={draft.phone} onChange={(d) => setDraft({ ...draft, phone: formatMobile(d) })} />
            <div className="col-span-2">
              <Field label="Address" value={draft.address} onChange={(v) => setDraft({ ...draft, address: v })} />
            </div>
            <Field label="GSTIN" value={draft.gstin} onChange={(v) => setDraft({ ...draft, gstin: v })} />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" disabled={!dirty} onClick={() => setDraft(firm)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold disabled:opacity-40">
              Undo changes
            </button>
            <button
              type="button"
              disabled={!dirty || !draft.name.trim() || !isMobile(mobileDigits(draft.phone))}
              onClick={() => {
                saveFirm(draft)
                setToast('Firm details saved')
              }}
              className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </section>
      )}

      {tab === 'whatsapp' && (
        <div className="flex max-w-3xl flex-col gap-8">
          <section>
            <h2 className="text-base font-bold tracking-tight">Your WhatsApp</h2>
            <p className="mt-0.5 text-sm text-muted">Your requests and reminders go to clients from your own WhatsApp number. Connect it once, and clients can reply in the chat.</p>

            {/* Your own number, not connected yet: one button. */}
            {!whatsapp && (
              <div className="mt-4 rounded-2xl border border-line bg-white p-5">
                <h3 className="text-[15px] font-bold">Connect your own WhatsApp</h3>
                <ol className="mt-3 flex flex-col gap-2.5 text-sm text-slate-700">
                  {[
                    ['Press the button below.', 'A new window opens.'],
                    ['Link your number there.', 'It takes about two minutes.'],
                    ['Come back here.', 'We get the connection details automatically. You do not copy or paste anything.'],
                  ].map(([t, d], i) => (
                    <li key={t} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand-dark">{i + 1}</span>
                      <span>
                        <span className="font-semibold">{t}</span> <span className="text-muted">{d}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                  <button type="button" onClick={goToRamwin} className="flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark">
                    Connect your own WhatsApp <ExternalLink size={16} />
                  </button>
                  <span className="text-[13px] text-muted">Until you connect, you cannot send requests or reminders.</span>
                </div>
              </div>
            )}

            {/* Your own number, connected. */}
            {whatsapp && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
                <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
                  <span className="text-[15px] font-bold">Your connection</span>
                  {connectionLost ? (
                    <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-wide text-danger">Disconnected</span>
                  ) : (
                    <span className="rounded-md bg-ok-soft px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-wide text-ok">Connected</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2">
                  {connectionLost && (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft/60 px-4 py-3 md:col-span-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-danger">WhatsApp logged this number out</div>
                        <div className="text-[13px] leading-snug text-muted">Nothing can be sent until you connect it again. Your requests, chats and documents are safe.</div>
                      </div>
                      <button type="button" onClick={goToRamwin} className="h-10 shrink-0 rounded-lg bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-dark">
                        Connect again
                      </button>
                    </div>
                  )}
                  {[
                    ['WhatsApp number', formatMobile(mobileDigits(whatsapp.number))],
                    ['Name clients see', whatsapp.displayName],
                  ].map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <div className="text-[13px] font-semibold text-muted">{k}</div>
                      <div className="mt-1 flex h-11 items-center truncate rounded-xl border border-line bg-slate-50 px-3.5 text-[15px] font-medium text-ink" title={v}>
                        {v}
                      </div>
                    </div>
                  ))}

                  {/* WhatsApp approves each message before it can go from your own number. Until then, that message goes from the shared number. */}
                  {(() => {
                    const total = messageTemplates.length
                    const done = approvedTemplates.length
                    const all = done >= total
                    return (
                      <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 md:col-span-2 ${all ? 'border-ok/30 bg-ok-soft/50' : 'border-warn/30 bg-warn-soft/60'}`}>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${all ? 'bg-ok text-white' : 'bg-warn text-white'}`}>{all ? <Check size={18} strokeWidth={3} /> : <Clock size={18} />}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">{done === 0 ? 'Message templates: waiting for approval' : all ? 'Message templates: all approved' : `Message templates: ${done} of ${total} approved`}</div>
                          <div className="text-[13px] leading-snug text-muted">
                            {done === 0
                              ? 'You can send requests and reminders once WhatsApp approves your messages. This usually takes a short while.'
                              : all
                                ? 'You can send requests and reminders.'
                                : 'You can send now. A few messages are still waiting for approval.'}
                          </div>
                        </div>
                        {!all && (
                          <button type="button" onClick={() => (approveTemplates(), setToast(done === 0 ? 'WhatsApp has approved some templates.' : 'WhatsApp has approved more templates.'))} className="h-10 shrink-0 rounded-lg border border-line bg-white px-4 text-[13px] font-semibold hover:border-brand">
                            Check status
                          </button>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-line bg-slate-50/70 px-5 py-3">
                  <button type="button" onClick={() => setDisconnecting(true)} className="h-10 rounded-lg px-4 text-[13px] font-semibold text-danger hover:bg-danger-soft">
                    Disconnect
                  </button>
                  {demoOn() && !connectionLost && (
                    <button type="button" onClick={() => (loseConnection(), setToast('Demo: WhatsApp logged your number out.'))} className="h-10 rounded-lg px-4 text-[13px] font-semibold text-muted hover:bg-canvas">
                      Demo: connection lost
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'links' && (
        <section className="max-w-2xl rounded-[18px] border border-line bg-white p-6">
          <h2 className="text-base font-bold tracking-tight">How long an upload link stays open</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            A link works until the last date of the request plus a few extra days. This lets a client who is a little late still upload. After that, the link shows “expired” and you can send a new one.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {[3, 7, 14, 30].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={graceDays === n}
                onClick={() => {
                  setGraceDays(n)
                  setToast(`Links stay open ${n} days after the last date`)
                }}
                className={`rounded-xl border px-5 py-3 text-left ${graceDays === n ? 'border-2 border-brand bg-[#EEF8F5]' : 'border-line hover:bg-canvas'}`}
              >
                <div className={`text-[15px] font-semibold ${graceDays === n ? 'text-brand-dark' : ''}`}>{n} days</div>
                <div className="text-xs text-muted">after the last date</div>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-canvas p-3.5 text-[13px] leading-relaxed text-slate-600">
            <b className="text-ink">Example:</b> last date 5 Oct and {graceDays} days means the link works till <b>{fmtDate(expiresOn('2026-10-05', graceDays))}</b>. If you change the last date, the link moves with it.
          </div>
        </section>
      )}

      {tab === 'team' && (
        <section className="max-w-2xl rounded-[18px] border border-line bg-white p-6">
          <h2 className="text-base font-bold tracking-tight">Team members</h2>
          <p className="mt-0.5 text-[13px] text-muted">The people who work in this account, and what each one can do.</p>
          <div className="mt-2">
            {team.map((m) => (
              <div key={m.id} className="flex items-center gap-3.5 border-b border-line py-3.5 last:border-b-0">
                <Avatar name={m.name} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold capitalize">{m.name}</div>
                  <div className="truncate text-[13px] text-muted">{m.email}</div>
                </div>
                <span className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${m.role === 'Owner' ? 'bg-brand-soft text-brand-dark' : m.role === 'Admin' ? 'bg-info-soft text-info' : 'bg-slate-100 text-slate-600'}`}>{m.role}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* {tab === 'usage' && <Usage />} */}

      {disconnecting && (
        <motion.div {...backdropProps} className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Disconnect your WhatsApp">
          <motion.div {...panelProps} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Disconnect your WhatsApp?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">You will not be able to send requests or reminders until you connect a WhatsApp number again.</p>
            <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-slate-700">
              <li>
                {requests.filter((r) => r.via === 'own').length} requests were sent from your WhatsApp. Their reminders will wait until you connect again.
              </li>
              <li>Clients who already have an upload link can still use it.</li>
              <li>Your old chats stay in the Inbox to read.</li>
            </ul>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDisconnecting(false)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold hover:bg-canvas">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  connectWhatsApp(null)
                  setDisconnecting(false)
                  setToast('WhatsApp disconnected. Connect it again to send messages.')
                }}
                className="h-11 rounded-xl bg-danger px-5 text-sm font-semibold text-white"
              >
                Disconnect
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <Toast message={toast} />
    </Page>
  )
}
