import { Check, CheckCheck, ChevronDown, Image as ImageIcon, Info, Lock, PanelRightOpen, Search, Send, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import DocPreviewDrawer from '../components/DocPreviewDrawer'
import OpenInTab from '../components/OpenInTab'
import PaperPreview from '../components/PaperPreview'
import { fileLink } from '../lib/fileLink'
import WaText from '../components/WaText'
import WhatsAppIcon from '../components/WhatsAppIcon'
import FileTypeIcon from '../components/FileTypeIcon'
import StatusBadge from '../components/StatusBadge'
import { msgClient, useInbox } from '../data/inbox'
import type { Conversation, Msg } from '../data/inbox'
import { clients, getClient } from '../data/mock'
import { folderIdOf } from '../data/master'
import { useMasterStore } from '../data/masterStore'
import { useRequests } from '../data/requests'
import type { RequestDoc } from '../data/requests'
import { useSetup } from '../data/setup'
import { fillTemplate, sample } from '../lib/template'
import { dayLabel, todayISO } from '../lib/dates'
import { SHARED_NUMBER_NAME } from '../lib/brand'

type Filter = 'all' | 'unread' | 'unassigned'

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

function Bubble({ m, onOpen, who }: { m: Msg; onOpen: (m: Msg) => void; who?: string }) {
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
        {who && <div className="mb-1 text-[12px] font-semibold text-brand-dark">{who}</div>}
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
              {who} · {file.size} · {msg.day === todayISO() ? msg.time : `${dayLabel(msg.day)}, ${msg.time}`}
            </div>
          </div>
          <OpenInTab iconOnly href={fileLink({ name: doc?.name ?? file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), fileName: file.name, client: who, pan, from: msg.time })} />
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

// Where a file goes when it is not part of the request: a folder in Document Master, or nowhere.
function KeepFile({ fileName, clientName, onSave, onRemove, onClose }: { fileName: string; clientName: string; onSave: (folderId: string) => void; onRemove: () => void; onClose: () => void }) {
  const { folders } = useMasterStore()
  const [to, setTo] = useState('')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const label = (id: string) => {
    const f = folders.find((x) => x.id === id)!
    return f.parentId ? `${folders.find((x) => x.id === f.parentId)?.name} / ${f.name}` : f.name
  }
  return (
    <div className="fixed inset-0 z-[40] flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Keep this file elsewhere">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="text-base font-bold">Not for this request</div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {fileName} stays out of {clientName}&apos;s documents. Keep it in a folder, or remove it.
        </p>
        <label className="mt-4 block text-[13px] font-semibold text-muted">
          Save in
          <select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand">
            <option value="">Choose a folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {label(f.id)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" disabled={!to} onClick={() => onSave(to)} className="mt-4 h-11 w-full rounded-xl bg-brand text-sm font-semibold text-white disabled:opacity-40">
          Save in Document Master
        </button>
        <button type="button" onClick={onRemove} className="mt-3 block w-full text-center text-[13px] font-semibold text-danger hover:underline">
          Remove the file
        </button>
        <button type="button" onClick={onClose} className="mt-3 block w-full text-center text-[13px] font-semibold text-muted hover:underline">
          Cancel
        </button>
      </div>
    </div>
  )
}

// One person with two kinds of work (Ramesh Kumar for ITR and for GST) is still one person. Names and chips for telling clients apart
// are only for a number that really belongs to different people or firms.
const differentPeople = (ids: string[]) => new Set(ids.map((id) => getClient(id)?.name)).size > 1

function RightPanel({ conv, onReview }: { conv: Conversation; onReview: () => void }) {
  const { requests, unsorted } = useRequests()
  const { settle } = useInbox()
  const { folders, addUploads } = useMasterStore()
  const [pickFolder, setPickFolder] = useState('')
  const [pickClient, setPickClient] = useState('')

  const mine = conv.clientIds.length
    ? requests.filter((r) => r.clients.some((c) => conv.clientIds.includes(c.clientId)))
    : []
  const waiting = unsorted.filter((u) => u.phone === conv.phone)

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
    <div className="flex flex-col gap-3 p-5">
      {mine.length === 0 && <p className="text-sm text-muted">No open requests for this client.</p>}
      {/* One card for each client in each request. When a number belongs to several clients, the card says whose it is. */}
      {mine
        .flatMap((r) => r.clients.filter((c) => conv.clientIds.includes(c.clientId)).map((c) => ({ r, c })))
        .map(({ r, c }) => {
          const docs = c.docs.filter((d) => d.status !== 'na')
          const got = docs.filter((d) => d.status !== 'pending' && d.status !== 'rejected').length
          const several = differentPeople(conv.clientIds)
          return (
            <Link key={`${r.id}-${c.clientId}`} to={`/requests/${r.id}?client=${c.clientId}`} className="block rounded-xl border border-line p-3.5 hover:border-brand">
              {several && (
                <div className="mb-0.5 text-[13px] font-semibold text-brand-dark">
                  {getClient(c.clientId)?.name} · {getClient(c.clientId)?.service}
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-[15px] font-semibold">{r.title}</span>
                <span className="text-[13px] text-muted">{r.ref}</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${docs.length ? (got / docs.length) * 100 : 0}%` }} />
                </span>
                <span className="text-[13px] font-semibold tabular-nums">
                  {got} <span className="font-medium text-muted">of {docs.length}</span>
                </span>
              </div>
              <div className="mt-2 text-[13px] font-semibold text-brand-dark">Open request</div>
            </Link>
          )
        })}

      {waiting.length > 0 && (
        <div className="rounded-xl border border-[#F5DFA8] bg-[#FEF6E4] p-3.5">
          <div className="text-sm font-bold text-[#7A3B00]">
            {waiting.length} {waiting.length === 1 ? 'file needs' : 'files need'} a place
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#7A3B00]">We could not tell which document {waiting.length === 1 ? 'it is' : 'they are'}. Look at {waiting.length === 1 ? 'it' : 'each one'} and choose where {waiting.length === 1 ? 'it goes' : 'they go'}.</p>
          <button type="button" onClick={onReview} className="mt-3 h-10 w-full rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-dark">
            Review {waiting.length === 1 ? 'the file' : `${waiting.length} files`}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Inbox() {
  const { conversations: allConversations, markRead, send, markPlaced } = useInbox()
  const { messageTemplates, firm, readReplies, ownNumber, whatsapp } = useSetup()
  // Each WhatsApp number is shown by its name, with the number under it.
  const accounts = { own: whatsapp?.displayName ?? 'Your WhatsApp', kdk: SHARED_NUMBER_NAME } as const
  const accountSub = { own: whatsapp?.number ?? 'Not connected', kdk: 'Shared number · link only' } as const
  const { requests, setDocStatus, unsorted, useUnsorted, dropUnsorted } = useRequests()
  // Everything except the first-request message can be dropped into a chat.
  const templates = messageTemplates.filter((m) => m.id !== 'request')
  // ?client=... opens that client's chat (from the client page). Without it, the first chat.
  const [params] = useSearchParams()
  const wanted = params.get('client')
  const wantedChat = params.get('chat')
  // Opens on the chat that was asked for (and the number it is on). Otherwise on the chat with the newest message, so what you just sent is right there.
  const target = allConversations.find((c) => c.id === wantedChat) ?? (wanted ? (allConversations.find((c) => c.via === 'own' && c.clientIds.includes(wanted)) ?? allConversations.find((c) => c.clientIds.includes(wanted))) : allConversations[0])
  const [mode, setMode] = useState<'own' | 'kdk'>(() => target?.via ?? 'own')
  const [activeId, setActiveId] = useState(() => target?.id ?? '')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [text, setText] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [viewing, setViewing] = useState<Msg | null>(null)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const { addUploads } = useMasterStore()
  const [keeping, setKeeping] = useState(false)
  const [only, setOnly] = useState<string | null>(null) // show just one client of a shared number
  const [showInfo, setShowInfo] = useState(false)
  const [showPanel, setShowPanel] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  // The firm's own number can be disconnected. Its old chats stay readable, but nothing can be sent from it.
  const connected = !!ownNumber
  const own = mode === 'own' && connected
  // Are client replies being read at all? Not on the shared number, and not when the switch in Settings is off.
  const reading = own && readReplies
  // Only work shows up here: what the firm sent, and the files a client sends back that look like documents.
  // Text messages, and photos that do not look like documents, are skipped on arrival and never kept.
  const isWork = (m: Msg) => m.from !== 'client' || !!m.file
  const conversations = useMemo(
    () =>
      allConversations
        .filter((c) => c.via === mode)
        .filter((c) => reading || !c.unassigned)
        .map((c) => {
          const msgs = c.msgs.filter((m) => isWork(m) && (reading || m.from === 'ca'))
          return reading ? { ...c, msgs } : { ...c, msgs, unread: 0 }
        })
        .filter((c) => c.msgs.length > 0)
        // newest message first, like WhatsApp
        .sort((a, b) => {
          const key = (c: Conversation) => `${c.msgs[c.msgs.length - 1].day} ${c.msgs[c.msgs.length - 1].time}`
          return key(b).localeCompare(key(a))
        }),
    [reading, mode, allConversations],
  )
  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    markRead(active.id)
  }, [active.id, markRead])

  useEffect(() => setOnly(null), [active.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [active.id, active.msgs.length, only])

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

  // One number can belong to several clients (a father filing for his daughters, one owner with many firms).
  // Each message says whose it is, and you can look at one client at a time.
  const shared = differentPeople(active.clientIds)
  const labelOf = (id: string) => `${getClient(id)?.name} · ${getClient(id)?.service}`
  const shownMsgs = shared && only ? active.msgs.filter((m) => msgClient(m) === only) : active.msgs

  // Files in this chat that no document claimed yet, one at a time. Open from the panel or by tapping the file in the chat.
  const waitingList = unsorted.filter((u) => u.phone === active.phone)
  const reviewIdx = waitingList.findIndex((u) => u.id === reviewing)
  const reviewFile = reviewIdx >= 0 ? waitingList[reviewIdx] : undefined
  const placeable = requests.flatMap((r) => r.clients.filter((c) => active.clientIds.includes(c.clientId)).map((c) => ({ r, c })))
  // With more than one request on this number, the list is split by request: ITR on its own, GST on its own.
  const placeOptions = placeable.flatMap(({ r, c }) => {
    const group = (extra: boolean) => (placeable.length > 1 ? (differentPeople(active.clientIds) ? `${getClient(c.clientId)?.name} · ${r.title}` : r.title) : extra ? 'Add as another file of' : 'Not received yet')
    return [
      ...c.docs.filter((d) => d.status === 'pending' || d.status === 'rejected').map((d) => ({ id: `${r.id}|${c.clientId}|${d.id}`, label: d.name, group: group(false) })),
      ...c.docs.filter((d) => d.status === 'to_review').map((d) => ({ id: `${r.id}|${c.clientId}|${d.id}`, label: d.name, group: group(true), extra: true })),
    ]
  })
  const afterOne = (gone: string) => {
    const rest = waitingList.filter((u) => u.id !== gone)
    setReviewing(rest.length > 0 ? rest[Math.min(reviewIdx, rest.length - 1)].id : null)
  }

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
                <span className="block truncate text-xs text-muted">{accountSub[mode]}</span>
              </span>
              <ChevronDown size={16} className="shrink-0 text-[#54656F]" />
            </button>
            {showAccounts && (
              <>
                <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setShowAccounts(false)} />
                <div role="menu" className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl">
                  <div className="px-3.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-faint">Switch account</div>
                  {(['own', 'kdk'] as const).map((k) => {
                    const chats = allConversations.filter((c) => c.via === k && !c.unassigned)
                    const fresh = k === 'own' && connected && readReplies ? chats.reduce((n, c) => n + (c.unread > 0 ? 1 : 0), 0) : 0
                    return (
                      <button
                        key={k}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMode(k)
                          setActiveId(allConversations.find((c) => c.via === k)?.id ?? '')
                          setFilter('all')
                          setShowAccounts(false)
                        }}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-canvas"
                      >
                        <WhatsAppIcon size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{accounts[k]}</span>
                          <span className="block truncate text-xs text-muted">
                            {accountSub[k]} · {chats.length} {chats.length === 1 ? 'chat' : 'chats'}{fresh ? ` · ${fresh} unread` : ''}
                          </span>
                        </span>
                        {mode === k && <Check size={16} className="shrink-0 text-brand" />}
                      </button>
                    )
                  })}
                  {!connected && (
                    <Link to="/settings?tab=whatsapp" className="mt-1 block border-t border-line px-3.5 py-2.5 text-[13px] font-semibold text-brand hover:bg-canvas">
                      Connect your WhatsApp
                    </Link>
                  )}
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
                    <span className={`ml-2 shrink-0 text-xs ${c.unread ? 'font-semibold text-[#008069]' : 'text-[#54656F]'}`}>{last.day === todayISO() ? last.time : dayLabel(last.day)}</span>
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
              {client && ` · ${[...new Set(active.clientIds.map((id) => getClient(id)?.service))].join(' and ')}`}
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

        {shared && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#E9EDEF] bg-white px-5 py-2.5 text-[13px] font-semibold">
            <span className="text-muted">Show</span>
            {[null, ...active.clientIds].map((id) => (
              <button key={id ?? 'all'} type="button" onClick={() => setOnly(id)} className={`rounded-full px-3.5 py-1.5 ${only === id ? 'bg-[#D9FDD3] text-brand-dark' : 'bg-[#F0F2F5] text-[#54656F]'}`}>
                {id ? labelOf(id) : 'Everyone'}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-5">
          {shownMsgs.map((m, i) => (
            <Fragment key={m.id}>
              {(i === 0 || shownMsgs[i - 1].day !== m.day) && <div className="mx-auto my-2 rounded-lg bg-white px-3 py-1 text-xs font-semibold uppercase text-[#54656F] shadow-sm">{dayLabel(m.day)}</div>}
              <Bubble
                m={m}
                who={shared && m.from !== 'system' && msgClient(m) ? labelOf(msgClient(m)!) : undefined}
                onOpen={(x) => {
                  const u = x.link ? undefined : unsorted.find((f) => f.phone === active.phone && f.fileName === x.file?.name)
                  if (u) setReviewing(u.id)
                  else setViewing(x)
                }}
              />
            </Fragment>
          ))}
          <div ref={endRef} />
        </div>

        {mode === 'kdk' ? (
          <div className="shrink-0 border-t border-[#E9EDEF] bg-[#FFF8E1] px-5 py-3 text-[13px] leading-relaxed text-[#7A3B00]">
            <b>These messages go from the {SHARED_NUMBER_NAME} number.</b> Clients upload through the link, so their replies are not read here. If a client writes to this number anyway, they get an automatic reply asking them to use the link.
          </div>
        ) : !connected ? (
          <div className="shrink-0 border-t border-[#E9EDEF] bg-[#FFF8E1] px-5 py-3 text-[13px] leading-relaxed text-[#7A3B00]">
            <b>Your WhatsApp is not connected.</b> You can read these chats, but nothing can be sent from here. Reminders now go from the {SHARED_NUMBER_NAME} number.{' '}
            <Link to="/settings?tab=whatsapp" className="font-semibold underline">
              Connect again
            </Link>
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
                    setText(fillTemplate(t.text, { name: active.unassigned ? 'there' : active.title, firm: firm.name, link: sample.link }, false))
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
            placeholder={own ? 'Type a message' : mode === 'kdk' ? `Replies are not read on the ${SHARED_NUMBER_NAME} number` : 'Your WhatsApp is not connected'}
            className="max-h-[168px] min-h-11 flex-1 resize-none rounded-[10px] bg-white px-4 py-[11px] text-[15px] leading-[22px] outline-none placeholder:text-[#667781] disabled:bg-slate-100"
          />
          <button type="button" onClick={submit} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#008069] text-white disabled:opacity-40" disabled={!text.trim() || !own}>
            <Send size={19} />
          </button>
        </div>
      </div>

      {reviewFile && client && (
        <DocPreviewDrawer
          key={reviewFile.id}
          client={client}
          doc={{ id: reviewFile.id, name: reviewFile.fileName, status: 'to_review', source: reviewFile.source, receivedAt: reviewFile.receivedAt, fileName: reviewFile.fileName }}
          position={reviewIdx + 1}
          total={waitingList.length}
          onClose={() => setReviewing(null)}
          onPrev={() => setReviewing(waitingList[(reviewIdx - 1 + waitingList.length) % waitingList.length].id)}
          onNext={() => setReviewing(waitingList[(reviewIdx + 1) % waitingList.length].id)}
          onApprove={() => undefined}
          onReject={() => undefined}
          place={{
            options: placeOptions,
            onElse: () => setKeeping(true),
            onPlace: (key) => {
              const [requestId, clientId, docId] = key.split('|')
              const name = requests.find((x) => x.id === requestId)?.clients.find((c) => c.clientId === clientId)?.docs.find((d) => d.id === docId)?.name ?? 'the request'
              useUnsorted(reviewFile.id, requestId, clientId, docId)
              markPlaced(active.id, reviewFile.fileName, `Filed as ${name} · To review`, { requestId, clientId, docId })
              setToast(`${reviewFile.fileName} added to ${name}`)
              afterOne(reviewFile.id)
            },
          }}
        />
      )}

      {keeping && reviewFile && (
        <KeepFile
          fileName={reviewFile.fileName}
          clientName={active.title}
          onClose={() => setKeeping(false)}
          onSave={(folderId) => {
            addUploads([{ id: `un-${Date.now()}`, folderId, name: reviewFile.fileName.replace(/\.[^.]+$/, ''), fileName: reviewFile.fileName, size: '—', date: 'Just now', from: 'WhatsApp' }])
            dropUnsorted(reviewFile.id)
            markPlaced(active.id, reviewFile.fileName, 'Saved in Document Master')
            setToast(`${reviewFile.fileName} saved in Document Master`)
            setKeeping(false)
            afterOne(reviewFile.id)
          }}
          onRemove={() => {
            dropUnsorted(reviewFile.id)
            markPlaced(active.id, reviewFile.fileName, 'Removed')
            setToast(`${reviewFile.fileName} removed`)
            setKeeping(false)
            afterOne(reviewFile.id)
          }}
        />
      )}

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
          {active.unassigned ? 'Save these files' : 'Requests'}
        </div>
        <div className="flex-1 overflow-y-auto">
          <RightPanel key={active.id} conv={active} onReview={() => waitingList[0] && setReviewing(waitingList[0].id)} />
        </div>
      </div>
      )}
    </div>
  )
}
