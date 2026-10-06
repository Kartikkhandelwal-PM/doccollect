import { Check, Search, Trash2 } from 'lucide-react'
import Page from '../components/Page'
import { useEffect, useMemo, useState } from 'react'
import Avatar from '../components/Avatar'
import ConnectWhatsApp from '../components/ConnectWhatsApp'
import PhoneInput from '../components/PhoneInput'
import FirmLogo from '../components/FirmLogo'
import WhatsAppIcon from '../components/WhatsAppIcon'
import { Link, useSearchParams } from 'react-router-dom'
import Pagination, { usePaging } from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import { messageKind, messageKinds } from '../data/messageTemplates'
import { getClient } from '../data/mock'
import { useInbox } from '../data/inbox'
import { fmtDate, useRequests } from '../data/requests'
import { dayLabel, expiresOn } from '../lib/dates'
import { useSetup } from '../data/setup'
import type { Firm, TeamMember } from '../data/setup'
import { SHARED_NUMBER_NAME } from '../lib/brand'
import { formatMobile, isMobile, mobileDigits } from '../lib/phone'

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

const STATUS_NAME = { sent: 'Sent', delivered: 'Delivered', read: 'Read', failed: 'Failed' } as const
const STATUS_STYLE = { sent: 'bg-canvas text-muted', delivered: 'bg-slate-100 text-slate-600', read: 'bg-[#E3F4FC] text-[#0E7FA8]', failed: 'bg-danger-soft text-danger' } as const
const selectCls = 'h-10 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand'

// Every message sent from the account: when, to whom, from which number, what kind, and how it went.
// A message that was read shows as Read, one that arrived as Delivered. Real delivery and read marks come from the WhatsApp provider with the backend.
function MessageLog() {
  const { conversations } = useInbox()
  const { whatsapp } = useSetup()
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState<'all' | 'own' | 'kdk'>('all')
  const [kind, setKind] = useState('all')
  const [status, setStatus] = useState('all')
  const rows = useMemo(
    () =>
      conversations
        .flatMap((c) => c.msgs.filter((m) => m.from === 'ca' && m.text).map((m) => ({ id: `${c.id}:${m.id}`, c, m, kind: messageKind(m.text!) })))
        .sort((a, b) => `${b.m.day} ${b.m.time}`.localeCompare(`${a.m.day} ${a.m.time}`)),
    [conversations],
  )
  const shown = rows.filter(
    (r) =>
      (from === 'all' || r.c.via === from) &&
      (kind === 'all' || r.kind === kind) &&
      (status === 'all' || (r.m.tick ?? 'sent') === status) &&
      (!query.trim() || `${r.c.title} ${r.c.phone}`.toLowerCase().includes(query.trim().toLowerCase())),
  )
  const paging = usePaging(shown, `${query}|${from}|${kind}|${status}`, [10, 25, 50])
  const grid = 'grid grid-cols-[130px_minmax(0,1fr)_250px_190px_110px] items-center gap-4 px-6'
  return (
    <div className="rounded-[18px] border border-line bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-canvas px-3.5 text-sm text-muted">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client or number" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
        </label>
        <select value={from} onChange={(e) => setFrom(e.target.value as typeof from)} className={selectCls} aria-label="Sent from">
          <option value="all">All numbers</option>
          <option value="own">{whatsapp?.displayName ?? 'Your WhatsApp'}</option>
          <option value="kdk">{SHARED_NUMBER_NAME}</option>
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={selectCls} aria-label="Type">
          <option value="all">All types</option>
          {messageKinds.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Status">
          <option value="all">All statuses</option>
          {Object.entries(STATUS_NAME).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className={`${grid} border-b border-line bg-slate-50 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted`}>
        <span>Date and time</span>
        <span>Client</span>
        <span>Sent from</span>
        <span>Type</span>
        <span>Status</span>
      </div>
      {paging.rows.length === 0 && <p className="px-6 py-10 text-center text-sm text-muted">No messages match.</p>}
      {paging.rows.map(({ id, c, m, kind: k }) => {
        const st = m.tick ?? 'sent'
        return (
          <div key={id} className={`${grid} min-h-[60px] border-b border-line py-2.5 text-sm last:border-b-0`}>
            <span className="tabular-nums">
              <span className="block font-medium">{dayLabel(m.day)}</span>
              <span className="text-xs text-muted">{m.time}</span>
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{c.title}</span>
              <span className="text-xs text-muted">{c.phone}</span>
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{c.via === 'own' ? (whatsapp?.displayName ?? 'Your WhatsApp') : SHARED_NUMBER_NAME}</span>
              <span className="text-xs text-muted">{c.via === 'own' ? (whatsapp?.number ?? '') : 'Shared number'}</span>
            </span>
            <span className="truncate">{k}</span>
            <span>
              <span className={`inline-block rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLE[st]}`}>{STATUS_NAME[st]}</span>
              {st === 'failed' && m.failReason && <span className="mt-0.5 block text-xs text-danger">{m.failReason}</span>}
            </span>
          </div>
        )
      })}
      <Pagination p={paging} noun="messages" />
    </div>
  )
}

// Every document a client has sent: when, who, which file, for which request, how it came, and what happened to it.
function FileLog() {
  const { requests } = useRequests()
  const [query, setQuery] = useState('')
  const [via, setVia] = useState('all')
  const [status, setStatus] = useState('all')
  const rows = useMemo(
    () => requests.flatMap((r) => r.clients.flatMap((c) => c.docs.filter((d) => d.status !== 'pending' && d.status !== 'na').map((d) => ({ id: `${r.id}:${c.clientId}:${d.id}`, r, clientId: c.clientId, d })))),
    [requests],
  )
  const shown = rows.filter(
    (x) =>
      (via === 'all' || x.d.source === via) &&
      (status === 'all' || x.d.status === status) &&
      (!query.trim() || `${getClient(x.clientId)?.name ?? ''} ${x.d.fileName ?? ''} ${x.d.name}`.toLowerCase().includes(query.trim().toLowerCase())),
  )
  const paging = usePaging(shown, `${query}|${via}|${status}`, [10, 25, 50])
  const grid = 'grid grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_150px_110px_130px] items-center gap-4 px-6'
  return (
    <div className="rounded-[18px] border border-line bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-canvas px-3.5 text-sm text-muted">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client or file" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
        </label>
        <select value={via} onChange={(e) => setVia(e.target.value)} className={selectCls} aria-label="Came through">
          <option value="all">WhatsApp and link</option>
          <option value="WhatsApp">WhatsApp chat</option>
          <option value="Link">Upload link</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Status">
          <option value="all">All statuses</option>
          <option value="to_review">To review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Sent back</option>
        </select>
      </div>
      <div className={`${grid} border-b border-line bg-slate-50 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted`}>
        <span>Received</span>
        <span>Client</span>
        <span>File</span>
        <span>Request</span>
        <span>Came through</span>
        <span>Status</span>
      </div>
      {paging.rows.length === 0 && <p className="px-6 py-10 text-center text-sm text-muted">No files match.</p>}
      {paging.rows.map(({ id, r, clientId, d }) => (
        <Link key={id} to={`/requests/${r.id}?doc=${clientId}:${d.id}`} className={`${grid} min-h-[60px] border-b border-line py-2.5 text-sm last:border-b-0 hover:bg-slate-50`}>
          <span className="text-[13px] text-muted">{d.receivedAt}</span>
          <span className="truncate font-semibold">{getClient(clientId)?.name}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{d.fileName}</span>
            <span className="text-xs text-muted">{d.name}</span>
          </span>
          <span className="truncate">
            {r.title} <span className="text-xs text-muted">{r.ref}</span>
          </span>
          <span>{d.source === 'WhatsApp' ? 'WhatsApp chat' : 'Upload link'}</span>
          <StatusBadge status={d.status} />
        </Link>
      ))}
      <Pagination p={paging} noun="files" />
    </div>
  )
}

function Usage() {
  const [part, setPart] = useState<'messages' | 'files'>('messages')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit rounded-xl bg-canvas p-1 text-sm font-semibold">
        {(['messages', 'files'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setPart(k)} className={`h-9 rounded-lg px-5 capitalize ${part === k ? 'bg-white shadow-sm' : 'text-muted'}`}>
            {k}
          </button>
        ))}
      </div>
      {part === 'messages' ? <MessageLog /> : <FileLog />}
      <p className="text-xs text-muted">We keep a record of every message sent from your account.</p>
    </div>
  )
}

export default function Settings() {
  const { firm, saveFirm, team, invite, setRole, removeMember, whatsapp, connectWhatsApp, graceDays, setGraceDays, readReplies, setReadReplies } = useSetup()
  const { requests } = useRequests()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'whatsapp' ? 'whatsapp' : 'firm')
  const [disconnecting, setDisconnecting] = useState(false)
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
            <h2 className="text-base font-bold tracking-tight">Your WhatsApp numbers</h2>
            <p className="mt-0.5 text-sm text-muted">Both numbers work together. You choose the number each time you send a request, and reminders for it go from the same number.</p>

            <div className="mt-4 flex flex-col gap-3">
              <div className={`overflow-hidden rounded-2xl bg-white ${whatsapp ? 'border-2 border-brand' : 'border border-line'}`}>
                <div className="flex w-full items-center gap-4 p-4">
                  <WhatsAppIcon size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold">Your own WhatsApp</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${whatsapp ? 'bg-ok-soft text-ok' : 'bg-canvas text-muted'}`}>{whatsapp ? 'Connected' : 'Not connected'}</span>
                    </span>
                    <span className="block text-[13px] text-muted">{whatsapp ? `Connected through ${whatsapp.provider} · clients can reply in the chat` : 'Clients get the message from your own number, and their files come straight to you.'}</span>
                  </span>
                  {!whatsapp && (
                    <button type="button" onClick={() => setConnecting(true)} className="h-10 shrink-0 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark">
                      Connect your WhatsApp
                    </button>
                  )}
                </div>

                {whatsapp && (
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
                      <button type="button" onClick={() => setDisconnecting(true)} className="h-9 rounded-lg px-3.5 text-[13px] font-semibold text-danger hover:bg-danger-soft">
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex w-full items-center gap-4 rounded-2xl border border-line bg-white p-4">
                <WhatsAppIcon size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold">{SHARED_NUMBER_NAME} number</span>
                    <span className="rounded-md bg-ok-soft px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ok">Always available</span>
                  </span>
                  <span className="block text-[13px] text-muted">Shared number from KDK, sent in your firm’s name · clients upload through the link, replies are not read</span>
                </span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold tracking-tight">Client replies</h2>
            <p className="mt-0.5 text-sm text-muted">What happens to the files clients send you on WhatsApp.</p>
            <div className={`mt-4 rounded-2xl border border-line bg-white ${whatsapp ? '' : 'opacity-60'}`}>
              <button
                type="button"
                role="switch"
                aria-checked={readReplies}
                disabled={!whatsapp}
                onClick={() => {
                  setReadReplies(!readReplies)
                  setToast(readReplies ? 'Replies are off. Clients upload through the link.' : 'Now reading replies to your requests')
                }}
                className="flex w-full items-center gap-4 p-4 text-left disabled:cursor-not-allowed"
              >
                <span className={`relative h-[24px] w-[42px] shrink-0 rounded-full ${readReplies && whatsapp ? 'bg-brand' : 'bg-slate-300'}`}>
                  <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all ${readReplies && whatsapp ? 'left-[21px]' : 'left-[3px]'}`} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">Read client replies on WhatsApp</span>
                  <span className="text-[13px] leading-snug text-muted">
                    {whatsapp ? 'Turn this off and clients can only upload through the link.' : 'Only available when your own WhatsApp is connected.'}
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

      {tab === 'usage' && <Usage />}

      {disconnecting && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Disconnect your WhatsApp">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Disconnect your WhatsApp?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">From now, all communication with your clients will go from the {SHARED_NUMBER_NAME} number.</p>
            <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-slate-700">
              <li>
                {requests.filter((r) => r.via === 'own').length} requests were sent from your WhatsApp. Their reminders will go from the {SHARED_NUMBER_NAME} number, as a link.
              </li>
              <li>Clients can no longer reply in the chat. They upload through the link, and replies to the {SHARED_NUMBER_NAME} number are not read.</li>
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
                  setToast(`WhatsApp disconnected. Messages now go from the ${SHARED_NUMBER_NAME} number.`)
                }}
                className="h-11 rounded-xl bg-danger px-5 text-sm font-semibold text-white"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {connecting && (
        <ConnectWhatsApp
          onClose={() => setConnecting(false)}
          onConnected={(link) => {
            connectWhatsApp(link)
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
