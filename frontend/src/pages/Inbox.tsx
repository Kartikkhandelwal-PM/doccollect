import { Check, CheckCheck, ChevronDown, Image as ImageIcon, Info, Lock, PanelRightOpen, Search, Send, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import PaperPreview from '../components/PaperPreview'
import WaText from '../components/WaText'
import WhatsAppIcon from '../components/WhatsAppIcon'
import FileTypeIcon from '../components/FileTypeIcon'
import StatusBadge from '../components/StatusBadge'
import { useInbox } from '../data/inbox'
import type { Conversation, Msg } from '../data/inbox'
import { clients, getClient } from '../data/mock'
import { folderIdOf } from '../data/master'
import { useMasterStore } from '../data/masterStore'
import { useRequests } from '../data/requests'
import type { RequestDoc } from '../data/requests'
import { useSetup } from '../data/setup'
import { fillTemplate, sample } from '../lib/template'
import type { Status } from '../data/types'
import { serviceColor } from '../lib/status'
import { SHARED_NUMBER_NAME } from '../lib/brand'

type Filter = 'all' | 'unread' | 'unassigned'
const reviewOptions: Status[] = ['to_review', 'approved', 'rejected']

// The one-line peek shown in the chat list: the first real sentence, not the greeting, and without the bold stars.
function preview(c: Conversation) {
  const m = c.msgs[c.msgs.length - 1]
  if (m.file) return m.file.name
  const lines = (m.text ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
  const line = lines.find((l) => !/^(hello|hi)\b/i.test(l)) ?? lines[0] ?? ''
  return line.replace(/\*/g, '')
}

function Ticks({ tick }: { tick?: 'sent' | 'read' }) {
  if (!tick) return null
  return tick === 'read' ? <CheckCheck size={15} className="text-[#53BDEB]" /> : <CheckCheck size={15} className="text-slate-400" />
}

function Bubble({ m, onOpen }: { m: Msg; onOpen: (m: Msg) => void }) {
  const mine = m.from === 'ca'
  if (m.from === 'system')
    return (
      <div className="mx-auto my-1 flex max-w-[360px] items-start gap-2 rounded-lg bg-white/80 px-3 py-2 text-center text-xs leading-snug text-[#54656F] shadow-sm">
        <Lock size={12} className="mt-0.5 shrink-0" />
        <span>{m.text}</span>
      </div>
    )
  return (
    <div className={`flex max-w-[78%] flex-col gap-1 ${mine ? 'items-end self-end' : 'items-start self-start'}`}>
      <div
        className={`w-fit max-w-full rounded-[10px] px-2.5 pb-1.5 pt-2 text-[14.5px] leading-snug shadow-[0_1px_1px_rgba(17,27,33,0.13)] ${
          mine ? 'rounded-tr-none bg-[#D9FDD3]' : 'rounded-tl-none bg-white'
        }`}
      >
        {m.file &&
          (m.photo ? (
            <button
              type="button"
              onClick={() => onOpen(m)}
              aria-label={`Open ${m.file.name}`}
              className="mb-1 flex h-36 w-64 items-center justify-center gap-2 rounded-md bg-gradient-to-br from-slate-200 to-slate-100 text-[13px] text-slate-500 hover:brightness-95"
            >
              <ImageIcon size={18} />
              {m.file.name}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(m)}
              aria-label={`Open ${m.file.name}`}
              className="mb-1 flex w-full items-center gap-3 rounded-md bg-slate-100 p-2.5 text-left hover:bg-slate-200/70"
            >
              <FileTypeIcon file={m.file.name} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{m.file.name}</div>
                <div className="text-xs text-slate-500">{m.file.size} · tap to open</div>
              </div>
            </button>
          ))}
        {m.text && (
          <div className="pr-1">
            <WaText text={m.text} />
          </div>
        )}
        {m.matched && <div className="mt-1 inline-block rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-dark">{m.matched}</div>}
        <div className="flex items-center justify-end gap-1 pt-0.5 text-[11px] text-slate-500">
          {m.time}
          {mine && <Ticks tick={m.tick} />}
        </div>
      </div>
    </div>
  )
}

// Opens a file from the chat, right where it arrived. If it was filed against a request, you can approve it here.
function FileViewer({
  msg,
  who,
  pan,
  doc,
  onClose,
  onApprove,
}: {
  msg: Msg
  who: string
  pan: string
  doc?: RequestDoc
  onClose: () => void
  onApprove: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const file = msg.file!
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label={`Preview of ${file.name}`}>
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <FileTypeIcon file={file.name} size={34} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold">{file.name}</div>
            <div className="truncate text-[13px] text-muted">
              {who} · {file.size} · {msg.time}
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto bg-[#EDF0F5] px-6 py-7">
          <PaperPreview doc={{ name: doc?.name ?? file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') }} client={{ name: who, pan }} />
        </div>
        <div className="flex items-center gap-3 border-t border-line px-5 py-3.5">
          {doc ? (
            <>
              <StatusBadge status={doc.status} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted">Filed as {doc.name}</span>
              <Link to={`/requests/${msg.link!.requestId}?doc=${msg.link!.clientId}:${msg.link!.docId}`} className="h-11 shrink-0 whitespace-nowrap rounded-xl border border-line px-4 text-sm font-semibold leading-[44px] hover:bg-canvas">
                Open in request
              </Link>
              <button
                type="button"
                disabled={doc.status === 'approved'}
                onClick={onApprove}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Check size={16} strokeWidth={2.8} />
                {doc.status === 'approved' ? 'Approved' : 'Approve'}
              </button>
            </>
          ) : (
            <p className="flex-1 text-[13px] leading-snug text-muted">This file is not filed against a document yet. Match it from the panel on the right.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function RightPanel({ conv }: { conv: Conversation }) {
  const { requests, setDocStatus } = useRequests()
  const { settle, notifyRejected } = useInbox()
  const { folders, addUploads } = useMasterStore()
  const [pickFolder, setPickFolder] = useState('')
  const [pickClient, setPickClient] = useState('')

  const mine = conv.clientIds.length
    ? requests.filter((r) => r.clients.some((c) => conv.clientIds.includes(c.clientId)))
    : []

  if (conv.unassigned) {
    const files = conv.msgs.filter((m) => m.file)
    const client = pickClient ? getClient(pickClient) : undefined
    const firmFolders = folders.map((f) => ({ id: f.id, label: f.parentId ? `${folders.find((x) => x.id === f.parentId)?.name} / ${f.name}` : f.name }))
    const masterTo = pickFolder === 'client' ? (client ? folderIdOf(client.id, 'FY 2025-26', client.service) : '') : pickFolder
    const field = 'mt-1 block h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand'
    return (
      <div className="flex flex-col gap-4 p-5">
        <div className="rounded-xl bg-[#FEF1DC] p-3.5 text-[13.5px] leading-relaxed text-warn">
          <b>
            {files.length} {files.length === 1 ? 'file is' : 'files are'} not saved anywhere yet.
          </b>
          <br />
          Open {files.length === 1 ? 'it' : 'them'} in the chat, then choose where to save.
        </div>

        <label className="text-[13px] font-semibold text-muted">
          Save in
          <select value={pickFolder} onChange={(e) => setPickFolder(e.target.value)} className={field}>
            <option value="">Choose a folder</option>
            <optgroup label="Firm documents">
              {firmFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </optgroup>
            <option value="client">A client&apos;s folder</option>
          </select>
        </label>
        {pickFolder === 'client' && (
          <label className="text-[13px] font-semibold text-muted">
            Client
            <select value={pickClient} onChange={(e) => setPickClient(e.target.value)} className={field}>
              <option value="">Choose a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.service}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          disabled={!masterTo}
          onClick={() => {
            addUploads(
              files.map((m, i) => ({
                id: `un-${Date.now()}-${i}`,
                folderId: masterTo,
                name: m.file!.name.replace(/\.[^.]+$/, ''),
                fileName: m.file!.name,
                size: m.file!.size.split(' · ').pop() ?? m.file!.size,
                date: 'Just now',
                from: 'WhatsApp',
              })),
            )
            settle(conv.id, 'Saved in Document Master', true)
            setPickFolder('')
            setPickClient('')
          }}
          className="h-11 rounded-xl bg-brand text-sm font-semibold text-white disabled:opacity-40"
        >
          Save in Document Master
        </button>
        <button type="button" onClick={() => settle(conv.id, 'Removed', false)} className="self-center text-[13px] font-semibold text-danger hover:underline">
          Not a document, remove {files.length === 1 ? 'it' : 'them'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      {mine.length === 0 && <p className="text-sm text-muted">No open requests for this client.</p>}
      {mine.map((r) => (
        <div key={r.id}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-[15px] font-semibold">{r.title}</span>
            <span className="text-[13px] text-muted">{r.ref}</span>
          </div>
          {r.clients
            .filter((c) => conv.clientIds.includes(c.clientId))
            .flatMap((c) => c.docs.map((d) => ({ c, d })))
            .map(({ c, d }) => (
              <div key={`${c.clientId}-${d.id}`} className="flex items-center gap-3 border-b border-line py-2.5 text-sm last:border-b-0">
                <span className={`flex-1 ${d.status === 'pending' ? 'text-muted' : ''}`}>{d.name}</span>
                {d.status === 'pending' ? (
                  <StatusBadge status="pending" />
                ) : (
                  <StatusBadge
                    status={d.status}
                    options={reviewOptions}
                    onChange={(s) => {
                      if (s === 'rejected') {
                        setDocStatus(r.id, c.clientId, d.id, 'rejected', 'Please send it again')
                        notifyRejected(conv.id, d.name, 'please send it again')
                      } else setDocStatus(r.id, c.clientId, d.id, s)
                    }}
                  />
                )}
              </div>
            ))}
        </div>
      ))}

      {conv.clientIds.length > 1 && (
        <div className="rounded-xl border border-[#F5DFA8] bg-[#FEF6E4] p-3 text-[12.5px] leading-relaxed text-[#7A3B00]">
          This number belongs to {conv.clientIds.map((id) => getClient(id)?.service).join(' and ')} clients. We sort the files for you by what they are, for example a Form 16 goes to ITR. If one lands in the wrong place, you can move it when you review.
        </div>
      )}
    </div>
  )
}

export default function Inbox() {
  const { conversations: allConversations, mode, setMode, markRead, send } = useInbox()
  const { messageTemplates, firm, readReplies, ownNumber } = useSetup()
  const accounts = { own: ownNumber ?? 'Your WhatsApp', kdk: SHARED_NUMBER_NAME } as const
  const { requests, setDocStatus } = useRequests()
  // Everything except the first-request message can be dropped into a chat.
  const templates = messageTemplates.filter((m) => m.id !== 'request')
  // ?client=... opens that client's chat (from the client page). Without it, the first chat.
  const [params] = useSearchParams()
  const wanted = params.get('client')
  const wantedChat = params.get('chat')
  const [activeId, setActiveId] = useState(() => allConversations.find((c) => c.id === wantedChat)?.id ?? allConversations.find((c) => wanted && c.clientIds.includes(wanted))?.id ?? 'c-ramesh')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [text, setText] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [viewing, setViewing] = useState<Msg | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [showPanel, setShowPanel] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const own = mode === 'own'
  // Are client replies being read at all? Not on the shared number, and not when the switch in Settings is off.
  const reading = own && readReplies
  // Only work shows up here: what the firm sent, and the files a client sends back that look like documents.
  // Text messages, and photos that do not look like documents, are skipped on arrival and never kept.
  const isWork = (m: Msg) => m.from !== 'client' || !!m.file
  const conversations = useMemo(
    () =>
      allConversations
        .filter((c) => reading || !c.unassigned)
        .map((c) => {
          const msgs = c.msgs.filter((m) => isWork(m) && (reading || m.from === 'ca'))
          return reading ? { ...c, msgs } : { ...c, msgs, unread: 0 }
        })
        .filter((c) => c.msgs.length > 0),
    [reading, allConversations],
  )
  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    markRead(active.id)
  }, [active.id, markRead])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [active.id, active.msgs.length])

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`
  }, [text])

  const list = conversations.filter(
    (c) =>
      (filter === 'all' || (filter === 'unread' ? c.unread > 0 : !!c.unassigned)) &&
      `${c.title} ${c.phone}`.toLowerCase().includes(query.toLowerCase()),
  )
  const unread = conversations.filter((c) => c.unread > 0).length
  const unassigned = conversations.filter((c) => c.unassigned).length

  const submit = () => {
    const t = text.trim()
    if (!t || !own) return
    send(active.id, t)
    setText('')
  }

  const client = active.clientIds[0] ? getClient(active.clientIds[0]) : undefined

  return (
    <div className="flex h-full min-h-[640px]">
      {/* Chat list */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-[#E9EDEF] bg-white">
        <div className="shrink-0 px-4 pb-2 pt-6">
          <div className="relative flex items-center gap-2">
            <h1 className="text-[24px] font-bold tracking-tight">Inbox</h1>
            <button
              type="button"
              aria-label="What does the Inbox keep?"
              aria-expanded={showInfo}
              onClick={() => setShowInfo((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#54656F] hover:bg-[#F0F2F5]"
            >
              <Info size={17} />
            </button>
            {showInfo && (
              <>
                <button type="button" aria-label="Close" className="fixed inset-0 z-10 cursor-default" onClick={() => setShowInfo(false)} />
                <div role="note" className="absolute left-0 top-9 z-20 w-72 rounded-xl border border-line bg-white p-3.5 text-[13px] leading-relaxed text-slate-600 shadow-xl">
                  <div className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
                    <Lock size={13} />
                    What is kept here
                  </div>
                  Only files that look like documents are kept, for clients with an open request. Chats and personal photos are skipped and never saved.
                </div>
              </>
            )}
          </div>
          <div className="relative mt-3">
            <button
              type="button"
              onClick={() => setShowAccounts((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={showAccounts}
              className="flex w-full items-center gap-3 rounded-xl border border-[#E9EDEF] bg-white px-3 py-2.5 text-left hover:bg-[#F7F8F8]"
            >
              <WhatsAppIcon size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{accounts[mode]}</span>
              </span>
              <ChevronDown size={16} className="shrink-0 text-[#54656F]" />
            </button>
            {showAccounts && (
              <>
                <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setShowAccounts(false)} />
                <div role="menu" className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl">
                  <div className="px-3.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-faint">Switch account</div>
                  {(['own', 'kdk'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMode(k)
                        setShowAccounts(false)
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-canvas"
                    >
                      <WhatsAppIcon size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{accounts[k]}</span>
                      </span>
                      {mode === k && <Check size={16} className="shrink-0 text-brand" />}
                    </button>
                  ))}
                  <div className="mt-1 border-t border-line px-3.5 py-2.5 text-[13px] font-semibold text-brand">+ Connect another number</div>
                </div>
              </>
            )}
          </div>
          <label className="mt-3 flex h-10 items-center gap-3 rounded-[10px] bg-[#F0F2F5] px-3.5 text-sm text-[#54656F]">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats" className="w-full bg-transparent outline-none placeholder:text-[#54656F]" />
          </label>
          <div className={`mt-3 gap-2 text-[13px] font-semibold ${reading ? 'flex' : 'hidden'}`}>
            {(
              [
                ['all', 'All'],
                ['unread', `Unread ${unread}`],
                ['unassigned', `Unassigned ${unassigned}`],
              ] as [Filter, string][]
            ).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full px-3.5 py-1.5 ${filter === k ? 'bg-[#D9FDD3] text-brand-dark' : 'bg-[#F0F2F5] text-[#54656F]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.length === 0 && <p className="p-5 text-sm text-muted">No chats here.</p>}
          {list.map((c) => {
            const last = c.msgs[c.msgs.length - 1]
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`flex w-full items-center gap-3.5 px-4 py-3 text-left ${c.id === active.id ? 'bg-[#F0F2F5]' : 'hover:bg-[#F7F8F8]'}`}
              >
                {c.unassigned ? (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FEE9C9] text-lg font-bold text-warn">?</span>
                ) : (
                  <Avatar name={c.title} size={48} />
                )}
                <div className="min-w-0 flex-1 border-b border-[#F0F2F5] pb-3 pt-0.5">
                  <div className="flex items-baseline justify-between">
                    <span className="truncate text-base font-semibold">{c.title}</span>
                    <span className={`ml-2 shrink-0 text-xs ${c.unread ? 'font-semibold text-[#008069]' : 'text-[#54656F]'}`}>{last.time}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1 truncate text-sm text-[#54656F]">
                      {last.from === 'ca' && <Check size={14} className="shrink-0" />}
                      <span className="truncate">{preview(c)}</span>
                    </span>
                    {c.unread > 0 && <span className="shrink-0 rounded-full bg-[#008069] px-1.5 py-px text-xs font-bold text-white">{c.unread}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#EFEAE2] bg-[radial-gradient(rgba(17,27,33,0.045)_1.2px,transparent_1.2px)] [background-size:22px_22px]">
        <div className="flex h-[60px] shrink-0 items-center gap-3.5 bg-[#F0F2F5] px-4">
          {active.unassigned ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEE9C9] font-bold text-warn">?</span>
          ) : (
            <Avatar name={active.title} size={40} />
          )}
          <div className="flex-1">
            <div className="text-base font-semibold leading-tight">{active.title}</div>
            <div className="text-[13px] text-[#54656F]">
              {active.phone}
              {client && ` · ${active.clientIds.length > 1 ? 'ITR and GST' : client.service}`}
            </div>
          </div>
          {!showPanel && (
            <button
              type="button"
              onClick={() => setShowPanel(true)}
              aria-label="Show requests and documents"
              title="Show requests and documents"
              className="flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold text-[#54656F] hover:bg-black/5"
            >
              <PanelRightOpen size={18} />
              Details
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-5">
          <div className="mx-auto mb-2 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-[#54656F] shadow-sm">TODAY</div>
          {active.msgs.map((m) => (
            <Bubble key={m.id} m={m} onOpen={setViewing} />
          ))}
          <div ref={endRef} />
        </div>

        {!own ? (
          <div className="shrink-0 border-t border-[#E9EDEF] bg-[#FFF8E1] px-5 py-3 text-[13px] leading-relaxed text-[#7A3B00]">
            <b>You are sending from the {SHARED_NUMBER_NAME} number.</b> Clients reply through the upload link, so their messages are not read here. Files they upload show up directly in the request.
          </div>
        ) : !readReplies ? (
          <div className="shrink-0 border-t border-[#E9EDEF] bg-[#FFF8E1] px-5 py-3 text-[13px] leading-relaxed text-[#7A3B00]">
            <b>Reading replies is turned off.</b> Clients upload through the link. You can turn this on in Settings.
          </div>
        ) : null}
        <div className="relative flex shrink-0 items-end gap-3 bg-[#F0F2F5] px-4 py-3">
          {showTemplates && own && (
            <div className="absolute bottom-[68px] left-4 z-10 max-h-[360px] w-80 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-xl">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setText(fillTemplate(t.text, { name: active.unassigned ? 'there' : active.title.split(' ')[0], firm: firm.name, link: sample.link }, false))
                    setShowTemplates(false)
                    taRef.current?.focus()
                  }}
                  className="block w-full px-4 py-2.5 text-left hover:bg-canvas"
                >
                  <div className="text-sm font-semibold">
                    {t.name} <span className="ml-1 text-[11px] font-medium text-faint">{t.group}</span>
                  </div>
                  <div className="line-clamp-2 whitespace-pre-line text-xs text-muted">{fillTemplate(t.text)}</div>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={!own}
            onClick={() => setShowTemplates((v) => !v)}
            className="h-11 shrink-0 rounded-full border border-[#D1D7DB] bg-white px-4 text-[13px] font-semibold text-[#008069] disabled:opacity-40"
          >
            Templates
          </button>
          <textarea
            ref={taRef}
            rows={1}
            value={text}
            disabled={!own}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={own ? 'Type a message' : `Replies are not read on the ${SHARED_NUMBER_NAME} number`}
            className="max-h-[168px] min-h-11 flex-1 resize-none rounded-[10px] bg-white px-4 py-[11px] text-[15px] leading-[22px] outline-none placeholder:text-[#667781] disabled:bg-slate-100"
          />
          <button type="button" onClick={submit} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#008069] text-white disabled:opacity-40" disabled={!text.trim() || !own}>
            <Send size={19} />
          </button>
        </div>
      </div>

      {viewing?.file && (
        <FileViewer
          msg={viewing}
          who={active.title}
          pan={getClient(active.clientIds[0] ?? '')?.pan ?? '—'}
          doc={viewing.link ? requests.find((r) => r.id === viewing.link!.requestId)?.clients.find((c) => c.clientId === viewing.link!.clientId)?.docs.find((d) => d.id === viewing.link!.docId) : undefined}
          onClose={() => setViewing(null)}
          onApprove={() => {
            const l = viewing.link!
            setDocStatus(l.requestId, l.clientId, l.docId, 'approved')
            setToast(`${viewing.file!.name} approved`)
            setViewing(null)
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl" role="status">
          <Check size={16} className="text-emerald-300" />
          {toast}
        </div>
      )}

      {/* Info panel: the ✕ closes it, and the button in the chat header opens it again */}
      {showPanel && (
      <div className="flex w-[320px] shrink-0 flex-col border-l border-[#E9EDEF] bg-white">
        <div className="flex h-[60px] shrink-0 items-center gap-3 bg-[#F0F2F5] px-5 text-base font-semibold">
          <button type="button" onClick={() => setShowPanel(false)} aria-label="Close panel" title="Close panel" className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656F] hover:bg-black/5">
            <X size={18} />
          </button>
          {active.unassigned ? 'Save these files' : 'Requests and documents'}
        </div>
        <div className="flex-1 overflow-y-auto">
          <RightPanel key={active.id} conv={active} />
        </div>
        {client && !active.unassigned && (
          <div className="shrink-0 border-t border-line px-5 py-3 text-xs text-muted">
            <span className={`font-bold ${serviceColor[client.service]}`}>{client.service}</span> · {client.name}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
