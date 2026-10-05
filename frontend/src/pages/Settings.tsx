import { Check, Trash2 } from 'lucide-react'
import Page from '../components/Page'
import { useEffect, useState } from 'react'
import Avatar from '../components/Avatar'
import ConnectWhatsApp from '../components/ConnectWhatsApp'
import FirmLogo from '../components/FirmLogo'
import WhatsAppIcon from '../components/WhatsAppIcon'
import { useInbox } from '../data/inbox'
import { fmtDate } from '../data/requests'
import { expiresOn } from '../lib/dates'
import { useSetup } from '../data/setup'
import type { Firm, TeamMember } from '../data/setup'
import { SHARED_NUMBER_NAME } from '../lib/brand'

type Tab = 'firm' | 'whatsapp' | 'links' | 'team' | 'usage'
const tabs: { key: Tab; label: string }[] = [
  { key: 'firm', label: 'Firm profile' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'links', label: 'Upload links' },
  { key: 'team', label: 'Team' },
  { key: 'usage', label: 'Usage' },
]
const roles: TeamMember['role'][] = ['Owner', 'Admin', 'Staff']

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-[13px] font-semibold text-muted">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 block h-11 w-full rounded-xl border border-line px-3.5 text-[15px] font-medium text-ink outline-none focus:border-brand" />
    </label>
  )
}

export default function Settings() {
  const { firm, saveFirm, team, invite, setRole, removeMember, whatsapp, connectWhatsApp, graceDays, setGraceDays, readReplies, setReadReplies } = useSetup()
  const { mode, setMode } = useInbox()
  const [tab, setTab] = useState<Tab>('firm')
  const [draft, setDraft] = useState<Firm>(firm)
  const [toast, setToast] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('Staff')
  const [connecting, setConnecting] = useState(false)

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
        <p className="mt-0.5 text-sm text-muted">Your firm, WhatsApp, team and usage.</p>
      </div>
      }
      tabs={
      <div className="flex gap-7 border-b border-line text-sm font-semibold text-muted">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`h-11 border-b-[3px] ${tab === t.key ? 'border-brand text-brand-dark' : 'border-transparent hover:text-ink'}`}>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Firm name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
            </div>
            <Field label="Email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} />
            <Field label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
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
              disabled={!dirty || !draft.name.trim()}
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
            <h2 className="text-base font-bold tracking-tight">Send messages from</h2>
            <p className="mt-0.5 text-sm text-muted">Choose the number your clients get messages from.</p>

            <div className="mt-4 flex flex-col gap-3" role="radiogroup" aria-label="Send messages from">
              {/* Your own WhatsApp. Its details open inside the card once it is the one in use. */}
              <div className={`overflow-hidden rounded-2xl bg-white ${mode === 'own' && whatsapp ? 'border-2 border-brand' : 'border border-line'}`}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === 'own' && !!whatsapp}
                  onClick={() => {
                    if (!whatsapp) return setConnecting(true)
                    setMode('own')
                    setToast('Now sending from your WhatsApp')
                  }}
                  className="flex w-full items-center gap-4 p-4 text-left hover:bg-canvas/60"
                >
                  <WhatsAppIcon size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold">Your own WhatsApp</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${whatsapp ? 'bg-ok-soft text-ok' : 'bg-canvas text-muted'}`}>{whatsapp ? 'Connected' : 'Not connected'}</span>
                    </span>
                    <span className="block text-[13px] text-muted">{whatsapp ? `Connected through ${whatsapp.provider}` : 'Use your own number. You connect it once.'}</span>
                  </span>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${mode === 'own' && whatsapp ? 'bg-brand text-white' : 'border-2 border-slate-300'}`} aria-hidden="true">
                    {mode === 'own' && whatsapp && <Check size={12} strokeWidth={3.5} />}
                  </span>
                </button>

                {!whatsapp && (
                  <div className="flex items-center justify-between gap-4 border-t border-line bg-slate-50/70 px-4 py-3.5">
                    <p className="text-[13px] leading-snug text-muted">Clients get the message from your own number, and their files come straight to you.</p>
                    <button type="button" onClick={() => setConnecting(true)} className="h-10 shrink-0 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark">
                      Connect your WhatsApp
                    </button>
                  </div>
                )}

                {whatsapp && mode === 'own' && (
                  <div className="border-t border-line bg-slate-50/70 px-4 py-4">
                    <dl className="grid grid-cols-3 gap-x-6 text-sm">
                      <div className="min-w-0">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-faint">WhatsApp number</dt>
                        <dd className="mt-0.5 truncate font-medium">{whatsapp.number}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-faint">Name clients see</dt>
                        <dd className="mt-0.5 truncate font-medium">{whatsapp.displayName}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-faint">Channel ID</dt>
                        <dd className="mt-0.5 truncate font-mono text-[13px] font-medium">{whatsapp.channelId}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex items-center gap-2 border-t border-line pt-3.5">
                      <button type="button" onClick={() => setConnecting(true)} className="h-9 rounded-lg border border-line bg-white px-3.5 text-[13px] font-semibold hover:bg-canvas">
                        Connect a different number
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          connectWhatsApp(null)
                          setMode('kdk')
                          setToast(`WhatsApp disconnected. Using the ${SHARED_NUMBER_NAME} number.`)
                        }}
                        className="h-9 rounded-lg px-3.5 text-[13px] font-semibold text-danger hover:bg-danger-soft"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* The shared number. Nothing to set up. */}
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'kdk'}
                onClick={() => {
                  setMode('kdk')
                  setToast(`Now sending from the ${SHARED_NUMBER_NAME} number`)
                }}
                className={`flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left hover:bg-canvas/60 ${mode === 'kdk' ? 'border-2 border-brand' : 'border border-line'}`}
              >
                <WhatsAppIcon size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold">{SHARED_NUMBER_NAME} number</span>
                    <span className="rounded-md bg-canvas px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted">No setup</span>
                  </span>
                  <span className="block text-[13px] text-muted">Shared number from KDK, sent in your firm’s name · clients upload through the link</span>
                </span>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${mode === 'kdk' ? 'bg-brand text-white' : 'border-2 border-slate-300'}`} aria-hidden="true">
                  {mode === 'kdk' && <Check size={12} strokeWidth={3.5} />}
                </span>
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold tracking-tight">Client replies</h2>
            <p className="mt-0.5 text-sm text-muted">What happens to the files clients send you on WhatsApp.</p>
            <div className={`mt-4 rounded-2xl border border-line bg-white ${whatsapp && mode === 'own' ? '' : 'opacity-60'}`}>
              <button
                type="button"
                role="switch"
                aria-checked={readReplies}
                disabled={!whatsapp || mode !== 'own'}
                onClick={() => {
                  setReadReplies(!readReplies)
                  setToast(readReplies ? 'Replies are off. Clients upload through the link.' : 'Now reading replies to your requests')
                }}
                className="flex w-full items-center gap-4 p-4 text-left disabled:cursor-not-allowed"
              >
                <span className={`relative h-[24px] w-[42px] shrink-0 rounded-full ${readReplies && whatsapp && mode === 'own' ? 'bg-brand' : 'bg-slate-300'}`}>
                  <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all ${readReplies && whatsapp && mode === 'own' ? 'left-[21px]' : 'left-[3px]'}`} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">Read client replies on WhatsApp</span>
                  <span className="text-[13px] leading-snug text-muted">
                    {whatsapp && mode === 'own' ? 'Turn this off and clients can only upload through the link.' : 'Only available when you send from your own WhatsApp.'}
                  </span>
                </span>
              </button>
              <div className="border-t border-line bg-slate-50/70 px-4 py-3.5 text-[13px] leading-relaxed text-slate-600">
                <b className="text-ink">Use a number only for work, never your personal number.</b> We check each file and keep only the ones that look like documents, for clients who have an open request. Chats and personal photos are skipped and never saved.
              </div>
            </div>
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
          {team.map((m) => (
            <div key={m.id} className="flex items-center gap-3.5 border-b border-line py-3.5 last:border-b-0">
              <Avatar name={m.name} size={42} />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold capitalize">{m.name}</div>
                <div className="truncate text-[13px] text-muted">{m.email}</div>
              </div>
              <select
                value={m.role}
                disabled={m.role === 'Owner'}
                onChange={(e) => setRole(m.id, e.target.value as TeamMember['role'])}
                aria-label={`Role of ${m.name}`}
                className="h-10 rounded-xl border border-line bg-white px-3 text-sm font-medium outline-none focus:border-brand disabled:bg-canvas"
              >
                {roles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <button
                type="button"
                aria-label={`Remove ${m.name}`}
                disabled={m.role === 'Owner'}
                onClick={() => {
                  removeMember(m.id)
                  setToast(`${m.name} removed`)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-30"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <div className="mt-4 flex items-end gap-3 rounded-2xl bg-canvas p-4">
            <label className="flex-1 text-[13px] font-semibold text-muted">
              Invite by email
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@firm.com" className="mt-1 block h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] font-medium text-ink outline-none focus:border-brand" />
            </label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])} aria-label="Role for the invite" className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-medium outline-none">
              {roles.filter((r) => r !== 'Owner').map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!/^\S+@\S+\.\S+$/.test(inviteEmail)}
              onClick={() => {
                invite(inviteEmail, inviteRole)
                setToast(`Invite sent to ${inviteEmail}`)
                setInviteEmail('')
              }}
              className="h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Send invite
            </button>
          </div>
        </section>
      )}

      {tab === 'usage' && (
        <section className="max-w-2xl">
          <div className="grid grid-cols-3 gap-4">
            {[
              ['312', 'Messages sent this month'],
              ['298', 'Delivered'],
              ['187', 'Files received'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl border border-line bg-white p-5">
                <div className="text-[30px] font-bold leading-none tracking-tight">{n}</div>
                <div className="mt-1.5 text-[13px] font-medium text-muted">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-[18px] border border-line bg-white">
            <div className="grid grid-cols-3 bg-slate-50 px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <span>Month</span>
              <span>Messages sent</span>
              <span>Files received</span>
            </div>
            {[
              ['September 2026', '312', '187'],
              ['August 2026', '274', '161'],
              ['July 2026', '198', '120'],
            ].map(([m, a, b]) => (
              <div key={m} className="grid grid-cols-3 border-t border-line px-6 py-3.5 text-sm">
                <span className="font-semibold">{m}</span>
                <span>{a}</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">We keep a record of every message sent from your account.</p>
        </section>
      )}

      {connecting && (
        <ConnectWhatsApp
          onClose={() => setConnecting(false)}
          onConnected={(link) => {
            connectWhatsApp(link)
            setMode('own')
            setConnecting(false)
            setToast(`WhatsApp connected through ${link.provider}`)
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl" role="status">
          <Check size={16} className="text-emerald-300" />
          {toast}
        </div>
      )}
    </Page>
  )
}
