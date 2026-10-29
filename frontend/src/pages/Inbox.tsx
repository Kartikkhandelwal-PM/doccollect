import { backdropProps, panelProps, rowIn } from '../lib/motion'
import { motion } from 'framer-motion'
import Toast from '../components/Toast'
import { ArrowLeft, Check, Sparkles, CheckCheck, ChevronDown, ChevronRight, FolderOpen, Trash2, Image as ImageIcon, Info, Lock, PanelRightOpen, Search, Send, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import DocPreviewDrawer from '../components/DocPreviewDrawer'
import AttachPanel from '../components/AttachPanel'
import FilePane, { canPreview } from '../components/FilePane'
import FitBox from '../components/FitBox'
import type { AttachData, AttachRequest, AttachSuggest, FolderChoice } from '../components/AttachPanel'
import OpenInTab from '../components/OpenInTab'
import { fileLink } from '../lib/fileLink'
import WaText from '../components/WaText'
import WhatsAppIcon from '../components/WhatsAppIcon'
import FileTypeIcon from '../components/FileTypeIcon'
import StatusBadge from '../components/StatusBadge'
import { useMessenger } from '../data/messenger'
import { useInbox } from '../data/inbox'
import { findPlacement, isDuplicate, suggestClient } from '../data/docRead'
import type { DocRead } from '../data/docRead'
import type { Conversation, Msg } from '../data/inbox'
import { addContact } from '../data/contacts'
import { book, getBookClient, getClient, parentIdOf, regSuffix } from '../data/mock'
import { autoFolderId, autoFolderLabel, folderIdOf } from '../data/master'
import ApproveSaveDialog from '../components/ApproveSaveDialog'
import type { Approving } from '../components/ApproveSaveDialog'
import FolderPickerDialog from '../components/FolderPickerDialog'
import { createPortal } from 'react-dom'
import { useMasterStore } from '../data/masterStore'
import { lineRef, useRequests } from '../data/requests'
import type { RequestDoc } from '../data/requests'
import { useSetup } from '../data/setup'
import { fillTemplate, sample } from '../lib/template'
import { dayLabel, todayISO } from '../lib/dates'
import { demoOn } from '../lib/demo'
import { SHARED_NUMBER_NAME } from '../lib/brand'

type Filter = 'all' | 'unread' | 'unassigned'

// What the demo sends, one after another. Each shows a different outcome of reading a file.
const ARRIVALS: { phone: string; file: string; size: string; read: DocRead }[] = [
  // The GSTIN is on the file and Priya Karnataka asked for GSTR-2B: placed by itself.
  { phone: '+91 98450 11872', file: 'GSTR2B_092026.pdf', size: '4 pages · 520 KB', read: { kind: 'GSTR-2B', name: 'Priya Textiles Pvt Ltd', idNo: '29AAKCP7788Q1Z9', note: 'Sep 2026' } },
  // Only the name is on a bank statement: a guess the CA confirms.
  { phone: '+91 97222 33442', file: 'HDFC_stmt.pdf', size: '6 pages · 1.2 MB', read: { kind: 'Bank statement', name: 'Priya Textiles Pvt Ltd', idNo: 'A/c XXXX3310', note: 'Apr–Sep 2026' } },
  // Ramesh's PAN, and his income tax request asked for it: placed by itself.
  { phone: '+91 98111 22301', file: 'PAN_Ramesh.jpg', size: '1 page · 210 KB', read: { kind: 'PAN card', name: 'Ramesh Kumar', idNo: 'ABCPK4521F' } },
  // A PAN we do not know, from a number we do not know: Unassigned.
  { phone: '+91 90000 11122', file: 'IMG_7788.jpg', size: '1 page · 190 KB', read: { kind: 'PAN card', name: 'Vinod Patel', idNo: 'ADPPP5521K' } },
]

// The one-line peek shown in the chat list: the first real sentence, not the greeting, and without the bold stars.
function preview(c: Conversation) {
  const m = c.msgs[c.msgs.length - 1]
  if (m.file) return m.file.name
  const lines = (m.text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const line = lines.find((l) => !/^(hello|hi)\b/i.test(l)) ?? lines[0] ?? ''
  return line.replace(/\*/g, '')
}

// The note under a placed file ends with where the document stands ("... · To review"). It is kept up to date from the document itself,
// so when the CA approves or rejects it the chat says so too, and not what it said when the file arrived.
const STAND: Record<string, string> = { to_review: 'To review', approved: 'Approved', rejected: 'Rejected' }
const liveMatched = (text: string, status?: string) => (status && STAND[status] ? text.replace(/(To review|Approved|Rejected)$/, STAND[status]) : text)

const readLine = (r: DocRead) => [r.kind, r.name, r.idNo, r.note].filter(Boolean).join(' · ')

function Ticks({ tick }: { tick?: 'sent' | 'read' }) {
  if (!tick) return null
  return tick === 'read' ? <CheckCheck size={15} className="text-[#53BDEB]" /> : <CheckCheck size={15} className="text-slate-500" />
}

function Bubble({ m, status, onOpen, onPlace, onNot }: { m: Msg; status?: string; onOpen: (m: Msg) => void; onPlace?: () => void; onNot?: () => void }) {
  const mine = m.from === 'ca'
  if (m.from === 'system')
    return (
      <div className="mx-auto my-1 flex max-w-[360px] items-start gap-2 rounded-lg bg-white/80 px-3 py-2 text-center text-xs leading-snug text-[#54656F] shadow-sm">
        <Lock size={12} className="mt-0.5 shrink-0" />
        <span>{m.text}</span>
      </div>
    )
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`flex max-w-[78%] flex-col gap-1 ${mine ? 'items-end self-end' : 'items-start self-start'}`}
    >
      <div
        className={`w-fit max-w-full rounded-[10px] px-2.5 pb-1.5 pt-2 text-[15px] leading-snug shadow-[0_1px_1px_rgba(17,27,33,0.13)] ${
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
        {m.read && (
          <div className="mb-1 flex items-start gap-1.5 rounded-md bg-brand-soft px-2 py-1 text-xs font-semibold text-brand-dark">
            <Sparkles size={12} className="mt-0.5 shrink-0" />
            <span>{readLine(m.read)}</span>
          </div>
        )}
        {m.text && (
          <div className="pr-1">
            <WaText text={m.text} />
          </div>
        )}
        {m.guess ? (
          <div className="mt-1.5 rounded-lg border border-[#F5DFA8] bg-[#FEF6E4] p-2.5 text-xs text-[#7A3B00]">
            <div className="font-bold">Looks like {m.guess.docName}</div>
            <div className="mt-0.5">
              {m.guess.clientName} · {m.guess.place} · {m.guess.requestTitle} <span className="opacity-70">({m.guess.how})</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={onPlace} className="h-7 rounded-md bg-brand px-3 font-semibold text-white hover:bg-brand-dark">
                Place it
              </button>
              <button type="button" onClick={onNot} className="h-7 rounded-md border border-[#E7C98A] bg-white px-3 font-semibold hover:bg-[#FFF9EC]">
                Not this
              </button>
            </div>
          </div>
        ) : (
          m.matched && <div className={`mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${m.matched === 'Not placed yet' ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand-dark'}`}>{liveMatched(m.matched, status)}</div>
        )}
        <div className="flex items-center justify-end gap-1 pt-0.5 text-[12px] text-slate-500">
          {m.time}
          {mine && <Ticks tick={m.tick} />}
        </div>
      </div>
    </motion.div>
  )
}

// Opens a file from the chat, right where it arrived. If it was filed against a request, you can approve it here.
const SEND_BACK_REASONS = ['Blurry or unreadable', 'Wrong document', 'Pages missing', 'Wrong year']

function FileViewer({ msg, who, pan, doc, req, checklist, hide, filedText, onFile, attach, onAttach, onSaveFolder, onClose, onApprove, onSendBack, onMove }: { msg: Msg; who: string; pan: string; doc?: RequestDoc; req?: { title: string; ref: string; got: number; total: number }; checklist: RequestDoc[]; hide?: boolean; filedText?: string | null; onFile?: () => void; attach: AttachData; onAttach: (key: string) => void; onSaveFolder: (folderId: string) => void; onClose: () => void; onApprove: () => void; onSendBack: (reason: string, remark: string) => void; onMove: (toDocId: string | null) => void }) {
  const [rejecting, setRejecting] = useState(false) // the bar asks why, in the same window, so the CA never leaves the chat
  const [moveTo, setMoveTo] = useState<string | null>(null) // a checklist item picked to move this file to ('__none' = take it off the checklist)
  const [windowOpen, setWindowOpen] = useState(false) // the Save-as / Add-to window is open: this preview hides
  const [reason, setReason] = useState('')
  const [remark, setRemark] = useState('')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (moveTo ? setMoveTo(null) : onClose())
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, moveTo])

  // A document can be several files (the front and back of a card, the sheets of a workbook). The chips above the file switch between them.
  const files = doc ? [doc.fileName ?? msg.file!.name, ...(doc.moreFiles ?? [])] : [msg.file!.name]
  const [fi, setFi] = useState(Math.max(0, files.indexOf(msg.file!.name)))
  const current = files[Math.min(fi, files.length - 1)]
  const size = current === msg.file!.name ? msg.file!.size : ''
  const received = msg.time ? (msg.day === todayISO() ? `Today, ${msg.time}` : `${dayLabel(msg.day)}, ${msg.time}`) : ''
  const docName = doc?.name ?? current.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')

  // The file on its own line says who it is from; for a file on a document, also how it came.
  const sub = doc
    ? [who, `came by ${doc.source === 'Link' ? 'upload link' : 'WhatsApp chat'}`, received, size, files.length > 1 ? `file ${fi + 1} of ${files.length}` : undefined].filter(Boolean).join(' · ')
    : [who, size, files.length > 1 ? `file ${fi + 1} of ${files.length}` : undefined, received].filter(Boolean).join(' · ')
  const header = (
    <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
      <FileTypeIcon file={current} size={34} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] font-bold">{current}</div>
        <div className="truncate text-[13px] text-muted">{sub || ' '}</div>
      </div>
      {doc && <StatusBadge status={doc.status} />}
      {canPreview(current) && <OpenInTab iconOnly href={fileLink({ name: docName, fileName: current, client: who, pan, from: msg.time })} />}
      <button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas">
        <X size={20} />
      </button>
    </div>
  )
  const paper = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#EDF0F5]">
      {files.length > 1 && (
        <div className="flex shrink-0 flex-wrap gap-2 border-b border-line bg-white px-5 py-2.5">
          {files.map((f, i) => (
            <button key={f + i} type="button" aria-pressed={i === fi} onClick={() => setFi(i)} className={`flex max-w-[240px] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium ${i === fi ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line hover:border-brand'}`}>
              <FileTypeIcon file={f} size={18} />
              <span className="truncate">{f}</span>
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 p-6">
        <FitBox className="h-full w-full" max={canPreview(current) ? 1.15 : 1}>
          <div className="w-[360px]">
            <FilePane fileName={current} docName={docName} client={{ name: who, pan }} />
          </div>
        </FitBox>
      </div>
    </div>
  )
  const shell = 'flex h-[min(760px,calc(100vh-48px))] max-h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl'

  // A file that is on no document: the file, and under it the bar to add it somewhere.
  if (!doc) {
    return (
      <motion.div {...backdropProps} className={`fixed inset-0 z-30 items-center justify-center bg-ink/40 p-6 ${windowOpen ? 'hidden' : 'flex'}`} role="dialog" aria-modal="true" aria-label={`Preview of ${current}`}>
        <motion.div {...panelProps} className={`${shell} max-w-3xl`}>
          {header}
          {paper}
          <div className="border-t border-line px-6 py-4">
            <AttachPanel {...attach} onWindow={setWindowOpen} onAttach={onAttach} onSave={onSaveFolder} />
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // A file on a document: the file on the left; on the right the whole checklist (this file's item marked, the others can be picked to move it), and the decision at the bottom.
  const tag = (st: string) => (st === 'pending' ? 'Pending' : st === 'rejected' ? 'Rejected' : st === 'to_review' ? 'To review' : st === 'approved' ? 'Approved' : '')
  const dot = (st: string) =>
    st === 'approved' ? 'bg-ok text-white' : st === 'to_review' ? 'bg-warn text-white' : st === 'rejected' ? 'bg-danger text-white' : 'border-[1.5px] border-slate-300 bg-white'
  const moveName = moveTo === '__none' ? '' : (checklist.find((c) => c.id === moveTo)?.name ?? '')
  return (
    <motion.div {...backdropProps} className={`fixed inset-0 z-30 items-center justify-center bg-ink/40 p-6 ${hide ? 'hidden' : 'flex'}`} role="dialog" aria-modal="true" aria-label={`Preview of ${current}`}>
      <motion.div {...panelProps} className={`${shell} max-w-4xl`}>
        {header}
        <div className="flex min-h-0 flex-1">
          {paper}
          <aside className="flex w-[340px] shrink-0 flex-col border-l border-line">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4">
              {rejecting ? (
                <div>
                  <div className="text-sm font-bold">Why is it being rejected?</div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {SEND_BACK_REASONS.map((r) => (
                      <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(r)} className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${reason === r ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line hover:border-brand'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add a note for the client (optional)" className="mt-3 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand" />
                  <p className="mt-2 text-[12px] text-muted">The client is told on WhatsApp.</p>
                </div>
              ) : (
                <div>
                  {/* The checklist of this request: this file's item is marked; pick another to move the file there. */}
                  <div className="mb-2 flex items-center justify-between gap-2 text-[12px] font-semibold text-muted">
                    <span>Checklist</span>
                    {req && (
                      <Link to={`/requests/${msg.link!.requestId}?doc=${msg.link!.clientId}:${msg.link!.docId}`} className="flex min-w-0 items-center gap-0.5 truncate font-medium hover:text-brand-dark hover:underline">
                        {req.title} · {req.ref} · {req.got} of {req.total} <ChevronRight size={13} className="shrink-0" />
                      </Link>
                    )}
                  </div>
                  <div role="radiogroup" aria-label="Checklist item" className="flex flex-col gap-1">
                    {checklist.map((c) => {
                      const here = c.id === doc.id
                      const picked = moveTo === c.id
                      const locked = !here && c.status === 'approved'
                      // One highlight at a time: on this file's item until another is picked, then on the picked one.
                      const marked = moveTo ? picked : here
                      const label = picked ? (c.status === 'to_review' ? 'Swap' : 'Move here') : here ? (moveTo ? 'Now here' : 'This file') : tag(c.status)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="radio"
                          aria-checked={marked}
                          disabled={locked || (here && !moveTo)}
                          onClick={() => setMoveTo(here || picked ? null : c.id)}
                          title={locked ? 'Already approved' : here ? (moveTo ? 'Keep it here' : 'This file is on this item') : picked ? 'Picked: click to undo' : 'Move this file here'}
                          className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-[14px] ${marked ? 'border-brand bg-brand-soft' : 'border-transparent hover:bg-canvas'} ${locked ? 'opacity-60' : ''} disabled:cursor-default`}
                        >
                          <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${dot(c.status)}`}>{c.status === 'approved' || c.status === 'to_review' ? <Check size={11} strokeWidth={3.4} /> : c.status === 'rejected' ? '!' : ''}</span>
                          <span className={`min-w-0 flex-1 leading-snug ${marked ? 'font-semibold text-brand-dark' : c.status === 'pending' ? 'text-muted' : 'font-medium'}`}>{c.name}</span>
                          <span className={`shrink-0 text-[12px] ${marked ? 'font-bold uppercase tracking-wide text-brand-dark' : here ? 'font-semibold text-muted' : 'text-muted'}`}>{label}</span>
                        </button>
                      )
                    })}
                    <button type="button" role="radio" aria-checked={moveTo === '__none'} onClick={() => setMoveTo(moveTo === '__none' ? null : '__none')} className={`mt-1 rounded-lg border px-2.5 py-2 text-left text-[13px] ${moveTo === '__none' ? 'border-brand bg-brand-soft font-semibold text-brand-dark' : 'border-transparent text-muted hover:bg-canvas'}`}>
                      None of these: take it off the checklist and keep the file waiting
                    </button>
                  </div>
                  {files.length > 1 && moveTo && <p className="mt-2 text-[12px] text-muted">All {files.length} files of this document move together.</p>}
                  {doc.status === 'rejected' && doc.reason && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">Rejected: {doc.reason}</p>}
                </div>
              )}
            </div>

            {/* The decision is always at the bottom. */}
            <div className="shrink-0 border-t border-line bg-white px-5 py-4">
              {rejecting ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={() => setRejecting(false)} className="h-12 rounded-xl border border-line text-[15px] font-semibold hover:bg-canvas">
                    Back
                  </button>
                  <button type="button" disabled={!reason} onClick={() => onSendBack(reason, remark.trim())} className="h-12 rounded-xl bg-danger text-[15px] font-semibold text-white disabled:opacity-40">
                    Reject
                  </button>
                </div>
              ) : moveTo ? (
                <div>
                  <div className="mb-2.5 text-[13px] text-muted">{moveTo === '__none' ? 'Take this file off the checklist?' : `Move this file to ${moveName}?`}</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button type="button" onClick={() => setMoveTo(null)} className="h-12 rounded-xl border border-line text-[15px] font-semibold hover:bg-canvas">
                      Cancel
                    </button>
                    <button type="button" onClick={() => onMove(moveTo === '__none' ? null : moveTo)} className="h-12 rounded-xl bg-brand text-[15px] font-semibold text-white">
                      {moveTo === '__none' ? 'Take off' : 'Move'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" disabled={doc.status === 'rejected'} onClick={() => setRejecting(true)} className="h-12 rounded-xl border border-line text-[15px] font-semibold text-danger hover:bg-danger-soft disabled:opacity-40">
                    {doc.status === 'rejected' ? 'Rejected' : 'Reject'}
                  </button>
                  <button type="button" disabled={doc.status === 'approved'} onClick={onApprove} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)] disabled:opacity-40 disabled:shadow-none">
                    <Check size={18} strokeWidth={2.8} />
                    {doc.status === 'approved' ? 'Approved' : 'Approve'}
                  </button>
                </div>
              )}
              {/* Where an approved document is kept in Document Master, and a way to save it there (or change it). */}
              {doc.status === 'approved' && !rejecting && !moveTo && onFile && (
                <div className="mt-3 flex items-center gap-2 text-[13px]">
                  <FolderOpen size={14} className="shrink-0 text-muted" />
                  <span className={`min-w-0 flex-1 truncate ${filedText ? 'text-muted' : 'font-medium text-warn'}`} title={filedText ?? undefined}>
                    {filedText ?? 'Not saved in a folder yet'}
                  </span>
                  <button type="button" onClick={onFile} className="shrink-0 font-semibold text-brand-dark hover:underline">
                    {filedText ? 'Change' : 'Save…'}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Save the number of an unassigned chat as a contact of a client. What this number sends next then goes to that client.
function SaveContact({ phone, guessId, onSave, onClose }: { phone: string; guessId?: string; onSave: (name: string, bookId: string) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [to, setTo] = useState(guessId ?? '')
  const [q, setQ] = useState('')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  // The client we guessed is always first.
  // Nothing typed: only the client we guessed. Once the user types, the matching clients show.
  const typing = q.trim().length > 0
  const shown = typing
    ? book
        .filter((b) => `${b.name} ${b.pan}`.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => Number(b.id === guessId) - Number(a.id === guessId))
        .slice(0, 30)
    : book.filter((b) => b.id === guessId || b.id === to)
  const field = 'mt-1 block h-11 w-full shrink-0 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-brand'
  return (
    <motion.div {...backdropProps} className="fixed inset-0 z-[40] flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Save contact">
      <motion.div {...panelProps} className="flex max-h-full w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-2xl">
        <div className="shrink-0 text-base font-bold">Save contact</div>
        <p className="mt-1 shrink-0 text-[13px] leading-relaxed text-muted">
          {phone} is added as one more contact of the client. The client&apos;s own number stays.
        </p>
        <label className="mt-4 block shrink-0 text-[13px] font-semibold text-muted">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="For example, Ram's wife" className={field} />
        </label>
        <div className="mt-4 shrink-0 text-[13px] font-semibold text-muted">Associate with client</div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name or PAN to find another client" aria-label="Search clients" className={field} />
        {(shown.length > 0 || typing) && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-line">
          {shown.length === 0 && <div className="p-3 text-[13px] text-muted">No client found.</div>}
          {shown.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setTo(b.id)}
              className={`flex w-full items-center justify-between gap-3 border-b border-line px-3 py-2.5 text-left last:border-b-0 ${to === b.id ? 'bg-brand-soft' : 'hover:bg-slate-50'}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{b.name}</span>
                <span className="block truncate text-xs text-muted">
                  PAN {b.pan} · {b.registrations.map((r) => r.type).filter((t, i, a) => a.indexOf(t) === i).join(', ')}
                </span>
              </span>
              {b.id === guessId && <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[12px] font-bold text-brand-dark">Suggested</span>}
              {to === b.id && <Check size={16} className="shrink-0 text-brand-dark" />}
            </button>
          ))}
        </div>
        )}
        <button type="button" disabled={!to} onClick={() => onSave(name.trim(), to)} className="mt-4 h-11 w-full shrink-0 rounded-xl bg-brand text-sm font-semibold text-white disabled:opacity-40">
          Save contact
        </button>
        <button type="button" onClick={onClose} className="mt-3 block w-full shrink-0 text-center text-[13px] font-semibold text-muted hover:underline">
          Cancel
        </button>
      </motion.div>
    </motion.div>
  )
}

// One unread file in Unassigned: what we read, our guess, and its own place to save. Each file is saved on its own.
// One person with two kinds of work (Ramesh Kumar for ITR and for GST) is still one person. Names and chips for telling clients apart
// are only for a number that really belongs to different people or firms.
const differentPeople = (ids: string[]) => new Set(ids.map((id) => getClient(id)?.name)).size > 1

function RightPanel({ conv, onReview, onPreview }: { conv: Conversation; onReview: (id: string) => void; onPreview: (m: Msg) => void }) {
  const { requests, unsorted } = useRequests()
  const { resolveFile, conversations } = useInbox()

  const mine = conv.clientIds.length ? requests.filter((r) => r.clients.some((c) => conv.clientIds.includes(c.clientId))) : []
  const waiting = unsorted.filter((u) => u.phone === conv.phone)

  // A number we do not know: its files wait here. Open one to read it, then add it to a request or save it in a folder, from the preview.
  if (conv.unassigned) {
    const files = conv.msgs.filter((m) => m.file && !m.matched)
    return (
      <div className="flex flex-col gap-3 p-5">
        <div>
          <div className="text-[15px] font-bold">
            {files.length} {files.length === 1 ? 'file' : 'files'} to save
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">Open a file to read it, then choose where it goes.</p>
        </div>
        {files.map((m) => {
          const sug = suggestClient(m.read)
          const dup = isDuplicate(conversations, conv.id, m)
          const who = sug ? getBookClient(sug.clientId)?.name : undefined
          return (
            <div key={m.id} className="group flex items-center gap-1 rounded-xl border border-line pr-1.5 hover:border-brand">
              <button type="button" onClick={() => onPreview(m)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
                <FileTypeIcon file={m.file!.name} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{m.file!.name}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {dup ? 'Already sent before' : m.read ? [m.read.kind, who].filter(Boolean).join(' · ') : 'Could not read clearly'}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-muted" />
              </button>
              <button type="button" aria-label={`Remove ${m.file!.name}`} title="Not a document, remove it" onClick={() => resolveFile(conv.id, m.id, dup ? 'Removed (duplicate)' : 'Removed')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger">
                <Trash2 size={16} />
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col gap-4 bg-canvas p-5">
      {mine.length === 0 && (
        <EmptyState art="requests" align="left" compact title="No open requests" text={`${conv.title} has nothing asked for right now. Send a request to ask for documents.`}>
          <Link to={conv.clientIds[0] ? `/requests/new?client=${conv.clientIds[0]}` : '/requests/new'} className="flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white">
            New request
          </Link>
        </EmptyState>
      )}
      {/* One card for each client in each request. When a number belongs to several clients, the card says whose it is. */}
      {mine
        .flatMap((r) => r.clients.filter((c) => conv.clientIds.includes(c.clientId)).map((c) => ({ r, c })))
        .map(({ r, c }) => {
          const docs = c.docs.filter((d) => d.status !== 'na')
          const got = docs.filter((d) => d.status !== 'pending' && d.status !== 'rejected').length
          const several = differentPeople(conv.clientIds)
          const place = regSuffix(c.clientId).replace(' · ', '')
          return (
            <div key={`${r.id}-${c.clientId}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(14,27,44,0.08)]">
              {/* The card starts with the checklist's name (colour and weight, not size) and its number in plain muted text. No pills: the kind is already in the name.
                  The client is not repeated when the chat is one client's (the chat header says it). It shows only where it tells cards apart:
                  the name when the chat has several clients, the place when a client has several GSTINs or TANs. The whole band opens the request. */}
              <Link to={`/requests/${r.id}?client=${c.clientId}`} title="Open this request" className="group block border-b border-slate-200 bg-[#F4F9F7] px-4 py-3 transition-colors hover:bg-[#E6F2EE]">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-snug text-brand-dark">{r.title}</span>
                  <span className="shrink-0 text-[12px] text-muted">{lineRef(r, c.clientId)}</span>
                  <ChevronRight size={15} className="shrink-0 self-center text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-dark" />
                </div>
                {(several || place) && (
                  <div className="mt-1.5 flex items-center gap-2">
                    {several && <Avatar name={getClient(c.clientId)?.name ?? ''} size={20} />}
                    {several && (
                      <span className="min-w-0 truncate text-[13px] font-medium text-ink" title={`${getClient(c.clientId)?.name}${regSuffix(c.clientId)}`}>
                        {getClient(c.clientId)?.name}
                      </span>
                    )}
                    {place && <span className={`shrink-0 text-[12px] ${several ? 'text-muted' : 'font-medium text-slate-600'}`}>{place}</span>}
                  </div>
                )}
              </Link>
              <div className="p-4">
              <div className="flex items-center gap-3">
                <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{
                      width: `${docs.length ? (got / docs.length) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className="text-[13px] font-semibold tabular-nums">
                  {got} <span className="font-medium text-muted">of {docs.length}</span>
                </span>
              </div>
              {/* The checklist of this request: what has come, what is still to come. */}
              <ul className="mt-3 flex flex-col gap-0.5 border-t border-line pt-2.5">
                {docs.map((d) => {
                  const state = d.status === 'approved' ? 'approved' : d.status === 'to_review' ? 'review' : d.status === 'rejected' ? 'rejected' : 'pending'
                  return (
                    <li key={d.id}>
                      {/* A document that has come can be opened right here, whichever way it came (this chat or the upload link). */}
                      <button
                        type="button"
                        disabled={state === 'pending'}
                        onClick={() =>
                          onPreview({
                            id: `doc-${d.id}`,
                            from: 'client',
                            day: todayISO(),
                            time: '',
                            file: { name: d.fileName ?? `${d.name}.pdf`, size: d.receivedAt ?? '' },
                            link: { requestId: r.id, clientId: c.clientId, docId: d.id },
                          })
                        }
                        className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left text-[13px] ${state === 'pending' ? 'cursor-default' : 'hover:bg-canvas'}`}
                      >
                        <span
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                            state === 'approved' ? 'bg-ok text-white' : state === 'review' ? 'bg-warn text-white' : state === 'rejected' ? 'bg-danger text-white' : 'border-[1.5px] border-slate-300 bg-white'
                          }`}
                          aria-hidden="true"
                        >
                          {state === 'approved' || state === 'review' ? <Check size={11} strokeWidth={3.4} /> : state === 'rejected' ? '!' : ''}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block leading-snug ${state === 'pending' ? 'text-muted' : 'font-medium'}`}>{d.name}</span>
                          {state !== 'pending' && d.source && <span className="block text-[12px] text-muted">via {d.source === 'Link' ? 'upload link' : 'this chat'}</span>}
                        </span>
                        {state === 'review' && <span className="shrink-0 text-[12px] font-semibold text-warn">To review</span>}
                        {state === 'rejected' && <span className="shrink-0 text-[12px] font-semibold text-danger">Rejected</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
              </div>
            </div>
          )
        })}

      {waiting.length > 0 && (
        <div className="rounded-xl border border-[#F5DFA8] bg-[#FEF6E4] p-3.5">
          <div className="text-sm font-bold text-[#7A3B00]">
            {waiting.length} {waiting.length === 1 ? 'file' : 'files'} not placed yet
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-[#7A3B00]">Open a file to read it, then choose where it goes.</p>
          <div className="mt-2.5 flex flex-col gap-1.5">
            {waiting.map((u) => (
              <button key={u.id} type="button" onClick={() => onReview(u.id)} className="flex items-center gap-2.5 rounded-lg border border-[#F5DFA8] bg-white px-3 py-2 text-left hover:border-brand">
                <FileTypeIcon file={u.fileName} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{u.fileName}</span>
                  <span className="block truncate text-[12px] text-muted">{u.receivedAt}</span>
                </span>
                <ChevronRight size={15} className="shrink-0 text-muted" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InboxMain() {
  const { conversations: allConversations, markRead, send, markPlaced, linkChat, arrive, patchMsg } = useInbox()
  const { messageTemplates, firm, readReplies, ownNumber, whatsapp } = useSetup()
  // Each WhatsApp number is shown by its name, with the number under it.
  const accounts = {
    own: whatsapp?.displayName ?? 'Your WhatsApp',
    kdk: SHARED_NUMBER_NAME,
  } as const
  const accountSub = {
    own: whatsapp?.number ?? 'Not connected',
    kdk: 'Shared number',
  } as const
  const { sendRejected } = useMessenger()
  const { requests, setDocStatus, setDocFiled, unsorted, useUnsorted, dropUnsorted, addUnsorted, receiveFile, moveFile } = useRequests()
  // Everything except the first-request message can be dropped into a chat.
  const templates = messageTemplates.filter((m) => m.id !== 'request')
  // ?client=... opens that client's chat (from the client page). Without it, the first chat.
  const [params] = useSearchParams()
  const wanted = params.get('client')
  const wantedChat = params.get('chat')
  // Opens on the chat that was asked for (and the number it is on). Otherwise on the chat with the newest message, so what you just sent is right there.
  const wantedIds = wanted ? (getBookClient(wanted)?.registrations.map((r) => r.id) ?? [wanted]) : []
  const target =
    allConversations.find((c) => c.id === wantedChat) ??
    (wanted
      ? (allConversations.find((c) => c.via === 'own' && c.clientIds.some((x) => wantedIds.includes(x))) ?? allConversations.find((c) => c.clientIds.some((x) => wantedIds.includes(x))))
      : allConversations[0])
  const [mode, setMode] = useState<'own' | 'kdk'>(() => target?.via ?? 'own')
  const [activeId, setActiveId] = useState(() => target?.id ?? '')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [text, setText] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [viewing, setViewing] = useState<Msg | null>(null)
  const [approving, setApproving] = useState<Approving | null>(null) // Approve asks where to keep the document
  const [filing, setFiling] = useState<Approving | null>(null) // an approved document being saved (or moved) in a folder later
  const [reviewing, setReviewing] = useState<string | null>(null)
  const { addUploads, folders: masterFolders } = useMasterStore()
  // A folder the CA made, named in full (Firm documents › Agreements).
  const folderPathName = (id: string) => {
    const out: string[] = []
    let f = masterFolders.find((x) => x.id === id)
    while (f) {
      out.unshift(f.name)
      f = f.parentId ? masterFolders.find((x) => x.id === f!.parentId) : undefined
    }
    return out.length ? out.join(' › ') : null
  }
  const [savingContact, setSavingContact] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  // The side panel sits beside the chat on a wide screen. On a phone or tablet it opens over the chat instead.
  const [showPanel, setShowPanel] = useState(() => window.innerWidth >= 1100)
  // On a phone you see the list of chats, or one chat. Opening a chat from another page goes straight to it.
  const [chatOpen, setChatOpen] = useState(() => !!wantedChat || !!wanted)
  useEffect(() => {
    document.body.toggleAttribute('data-chat-open', chatOpen)
    return () => document.body.removeAttribute('data-chat-open')
  }, [chatOpen])
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
          // The shared CA Connect number is read too, but only for the firm's own clients (chats it cannot place are never shown here).
          const readsHere = reading || mode === 'kdk'
          const msgs = c.msgs.filter((m) => isWork(m) && (readsHere || m.from === 'ca'))
          return readsHere ? { ...c, msgs } : { ...c, msgs, unread: 0 }
        })
        .filter((c) => c.msgs.length > 0)
        // newest message first, like WhatsApp
        .sort((a, b) => {
          // A message made in this session (it has a real time) is newer than any sample message; among those, the later one is first.
          const real = (c: Conversation) => c.msgs[c.msgs.length - 1].sentAt ?? 0
          if (real(a) !== real(b)) return real(b) - real(a)
          const key = (c: Conversation) => `${c.msgs[c.msgs.length - 1].day} ${c.msgs[c.msgs.length - 1].time}`
          return key(b).localeCompare(key(a))
        }),
    [reading, mode, allConversations],
  )
  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]
  const taRef = useRef<HTMLTextAreaElement>(null)

  // A file arrives: read it, find the registration and the document asked for, and put it there when we are sure.
  // When we are not sure it waits for the CA with our guess; when we know nothing it goes to Unassigned.
  const [demoStep, setDemoStep] = useState(0)
  const arrival = () => {
    const sc = ARRIVALS[demoStep % ARRIVALS.length]
    setDemoStep((n) => n + 1)
    const place = findPlacement(sc.read, requests)
    const sure = place?.confidence === 'sure' ? place : undefined
    const msg: Msg = {
      id: `in${Date.now()}`,
      from: 'client',
      day: todayISO(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      sentAt: Date.now(),
      file: { name: sc.file, size: sc.size },
      read: sc.read,
    }
    if (sure) {
      receiveFile(sure.requestId, sure.regId, sure.docId, sc.file)
      msg.matched = `Placed on ${sure.docName} · ${sure.place} · To review`
      msg.link = { requestId: sure.requestId, clientId: sure.regId, docId: sure.docId }
    } else if (place) {
      msg.guess = place
      msg.matched = 'Needs a look'
    }
    const existing = allConversations.find((c) => c.via === 'own' && c.phone === sc.phone)
    const id = existing?.id ?? `c-new-${Date.now()}`
    arrive(sc.phone, msg, id, sure ? { title: sure.clientName, clientIds: [sure.regId] } : undefined)
    setMode('own')
    setFilter('all')
    setActiveId(id)
    setChatOpen(true)
    setToast(sure ? `${sc.file} placed on ${sure.docName} · ${sure.clientName} ${sure.place === 'ITR' ? '' : sure.place}`.trim() : place ? `${sc.file} came in. Please check where it goes.` : `${sc.file} came from a number we do not know.`)
  }

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

  const list = conversations.filter((c) => (filter === 'all' || (filter === 'unread' ? c.unread > 0 : !!c.unassigned)) && `${c.title} ${c.phone}`.toLowerCase().includes(query.toLowerCase()))
  const unread = conversations.filter((c) => c.unread > 0).length
  const unassigned = conversations.filter((c) => c.unassigned).length

  const submit = () => {
    const t = text.trim()
    if (!t || !own) return
    send(active.id, t)
    setText('')
  }

  const client = active.clientIds[0] ? getClient(active.clientIds[0]) : undefined

  // Files in this chat that no document claimed yet, one at a time. Open from the panel or by tapping the file in the chat.
  const waitingList = unsorted.filter((u) => u.phone === active.phone)
  // A file in the chat that is on no document. In a known chat the client is the chat's. From an unknown number the client is what we read from the file (a guess the CA can see and change).
  const looseFile = viewing?.file && !viewing.link ? viewing : null
  const looseSug = looseFile && active.unassigned ? suggestClient(looseFile.read) : undefined
  const attachIds = active.unassigned ? (looseSug?.options ?? []) : active.clientIds
  // Where a loose file of this chat can go: a pending (or rejected) document of this chat's requests, or a folder with no request.
  const attachMap: Record<string, { requestId: string; clientId: string; docId: string; name: string }> = {}
  const attachRequests: AttachRequest[] = []
  for (const r of requests)
    for (const c of r.clients)
      if (attachIds.includes(c.clientId)) {
        const docs: { key: string; name: string; extra?: boolean; multiple?: boolean; status?: string }[] = []
        for (const d of c.docs)
          if (d.status === 'pending' || d.status === 'rejected' || d.status === 'to_review') {
            const key = `${r.id}:${c.clientId}:${d.id}`
            attachMap[key] = { requestId: r.id, clientId: c.clientId, docId: d.id, name: d.name }
            docs.push({ key, name: d.name, extra: d.status === 'to_review', multiple: d.multiple, status: d.status })
          }
        if (docs.some((d) => !d.extra)) attachRequests.push({ key: `${r.id}:${c.clientId}`, requestId: r.id, title: differentPeople(attachIds) ? `${r.title} · ${getBookClient(c.clientId)?.name}` : r.title, ref: r.ref, due: r.due, place: regSuffix(c.clientId).replace(' · ', ''), docs })
      }
  // Folders: the client's own year and compliance folders, then the ones the CA made.
  const folderChoices: (FolderChoice & { regId?: string })[] = [
    ...attachIds.flatMap((id) => {
      const c = getClient(id)
      return c ? [{ id: folderIdOf(parentIdOf(id), 'FY 2025-26', `${c.service}${c.service === 'ITR' ? '' : regSuffix(id)}`), label: `${getBookClient(id)?.name ?? c.name} / FY 2025-26 / ${c.service}${c.service === 'ITR' ? '' : regSuffix(id)}`, regId: id }] : []
    }),
    ...masterFolders.map((f) => ({ id: f.id, label: f.parentId ? `${masterFolders.find((x) => x.id === f.parentId)?.name} / ${f.name}` : f.name })),
  ]
  // What we read from the file picks a request and a folder to start with. The CA can change both.
  const placed = looseFile ? findPlacement(looseFile.read, requests) : undefined
  const placedKey = placed ? `${placed.requestId}:${placed.regId}:${placed.docId}` : ''
  const attachSuggest: AttachSuggest | undefined = placed && attachMap[placedKey] ? { key: placedKey, docName: placed.docName, requestTitle: placed.requestTitle, ref: requests.find((r) => r.id === placed.requestId)?.ref ?? '' } : undefined
  const kindService = (k = '') => (/gst/i.test(k) ? 'GST' : /tds|16a|tan/i.test(k) ? 'TDS' : 'ITR')
  const ownFolders = folderChoices.filter((f) => f.regId)
  const suggestedFolder = (placed ? ownFolders.find((f) => f.regId === placed.regId) : (ownFolders.find((f) => getClient(f.regId as string)?.service === kindService(looseFile?.read?.kind)) ?? ownFolders[0]))?.id
  // In a known chat, the file may be read as another client's (a PAN that is not this chat's). Say so before it is added to the wrong place.
  const readSug = looseFile && !active.unassigned ? suggestClient(looseFile.read) : undefined
  const otherClient = readSug && !active.clientIds.some((id) => parentIdOf(id) === parentIdOf(readSug.clientId)) ? getBookClient(readSug.clientId)?.name : undefined
  const duplicate = looseFile ? isDuplicate(allConversations, active.id, looseFile) : false
  const warn = duplicate ? 'The same document was already sent before. It may be a duplicate.' : otherClient ? `This file looks like ${otherClient}'s (${readSug!.how === 'Name matched' ? 'by name' : 'by number'}), not ${active.title}'s. Check before adding it.` : undefined
  const forClient = looseSug ? { name: getBookClient(looseSug.clientId)?.name ?? '', guess: looseSug.how === 'Name matched' } : undefined
  const reviewIdx = waitingList.findIndex((u) => u.id === reviewing)
  const reviewFile = reviewIdx >= 0 ? waitingList[reviewIdx] : undefined
  const afterOne = (gone: string) => {
    const rest = waitingList.filter((u) => u.id !== gone)
    setReviewing(rest.length > 0 ? rest[Math.min(reviewIdx, rest.length - 1)].id : null)
  }

  return (
    <div className="flex h-full md:min-h-[640px]">
      {/* Chat list */}
      <div className={`flex w-[300px] shrink-0 flex-col border-r border-[#E9EDEF] bg-white max-md:w-full ${chatOpen ? 'max-md:hidden' : ''}`}>
        <div className="shrink-0 px-4 pb-2 pt-6">
          <div className="relative flex items-center gap-2">
            <h1 className="text-[24px] font-bold tracking-tight">Inbox</h1>
            <button
              type="button"
              aria-label="What does the Inbox keep?"
              aria-expanded={showInfo}
              onClick={() => setShowInfo((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656F] hover:bg-[#F0F2F5]"
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
                  <div className="px-3.5 pb-1 pt-2 text-[12px] font-bold uppercase tracking-widest text-faint">Switch account</div>
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
                            {accountSub[k]} · {chats.length} {chats.length === 1 ? 'chat' : 'chats'}
                            {fresh ? ` · ${fresh} unread` : ''}
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
          {reading && demoOn() && (
            <button type="button" onClick={arrival} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#CFE6DE] text-[13px] font-semibold text-brand-dark hover:bg-brand-soft">
              <Sparkles size={14} /> Demo: a file arrives
            </button>
          )}
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
          {list.length === 0 && (
            <EmptyState art={filter === 'unread' ? 'done' : 'search'} compact title={filter === 'unread' ? 'All caught up' : query ? 'No chat found' : 'No chats here'} text={filter === 'unread' ? 'You have read every chat.' : query ? 'Try a name or a number.' : 'Chats of this kind show here.'}>
              {(filter !== 'all' || query) && (
                <button type="button" onClick={() => { setFilter('all'); setQuery('') }} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold hover:border-brand">
                  Show all chats
                </button>
              )}
            </EmptyState>
          )}
          {list.map((c, listIndex) => {
            const last = c.msgs[c.msgs.length - 1]
            return (
              <motion.button
                key={c.id}
                {...rowIn(listIndex)}
                type="button"
                onClick={() => {
                  setActiveId(c.id)
                  setChatOpen(true)
                }}
                className={`flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors ${c.id === active.id ? 'bg-[#F0F2F5]' : 'hover:bg-[#F7F8F8]'}`}
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
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Chat */}
      <div className={`flex min-w-0 flex-1 flex-col bg-[#EFEAE2] bg-[radial-gradient(rgba(17,27,33,0.045)_1.2px,transparent_1.2px)] [background-size:22px_22px] ${chatOpen ? '' : 'max-md:hidden'}`}>
        <div className="flex h-[60px] shrink-0 items-center gap-3 bg-[#F0F2F5] px-3 md:gap-3.5 md:px-4">
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            aria-label="Back to chats"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656F] active:bg-black/5 md:hidden"
          >
            <ArrowLeft size={22} />
          </button>
          {active.unassigned ? <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEE9C9] font-bold text-warn">?</span> : <Avatar name={active.title} size={40} />}
          {active.unassigned ? (
            <button type="button" onClick={() => setSavingContact(true)} title="Save this number as a contact" className="min-w-0 flex-1 rounded-lg text-left hover:bg-black/5">
              <div className="truncate text-base font-semibold leading-tight">{active.title}</div>
              <div className="truncate text-[13px] font-semibold text-brand-dark">Tap to save contact</div>
            </button>
          ) : (
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold leading-tight">{active.title}</div>
              <div className="truncate text-[13px] text-[#54656F]">
                {active.phone}
                {client && ` · ${[...new Set(active.clientIds.map((id) => getClient(id)?.service))].join(' and ')}`}
              </div>
            </div>
          )}
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

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-4 md:px-5 md:py-5">
          {active.msgs.map((m, i) => (
            <Fragment key={m.id}>
              {(i === 0 || active.msgs[i - 1].day !== m.day) && (
                <div className="mx-auto my-2 rounded-lg bg-white px-3 py-1 text-xs font-semibold uppercase text-[#54656F] shadow-sm">{dayLabel(m.day)}</div>
              )}
              <Bubble
                m={m}
                status={m.link ? requests.find((r) => r.id === m.link!.requestId)?.clients.find((c) => c.clientId === m.link!.clientId)?.docs.find((d) => d.id === m.link!.docId)?.status : undefined}
                onPlace={() => {
                  if (!m.guess) return
                  receiveFile(m.guess.requestId, m.guess.regId, m.guess.docId, m.file?.name ?? '')
                  patchMsg(active.id, m.id, { guess: undefined, matched: `Placed on ${m.guess.docName} · ${m.guess.place} · To review`, link: { requestId: m.guess.requestId, clientId: m.guess.regId, docId: m.guess.docId } })
                  setToast(`${m.file?.name} placed on ${m.guess.docName}`)
                }}
                onNot={() => patchMsg(active.id, m.id, { guess: undefined, matched: 'Not placed yet' })}
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
            <b>These messages go from the {SHARED_NUMBER_NAME} number.</b> Files your clients send here are read and added to their request. Only your own clients' chats show here.
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
                    setText(
                      fillTemplate(
                        t.text,
                        {
                          name: active.unassigned ? 'there' : active.title,
                          firm: firm.name,
                          link: sample.link,
                        },
                        false,
                      ),
                    )
                    setShowTemplates(false)
                    taRef.current?.focus()
                  }}
                  className="block w-full px-4 py-2.5 text-left hover:bg-canvas"
                >
                  <div className="text-sm font-semibold">
                    {t.name} <span className="ml-1 text-[12px] font-medium text-faint">{t.group}</span>
                  </div>
                  <div className="line-clamp-2 text-xs text-muted">{fillTemplate(t.text).replace(/\*/g, '').replace(/\s+/g, ' ').replace(/^Hello [^,]+, /, '')}</div>
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
            aria-label="Type a message"
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
            placeholder={own ? 'Type a message' : mode === 'kdk' ? `You cannot type here. Messages go from the ${SHARED_NUMBER_NAME} number` : 'Your WhatsApp is not connected'}
            className="max-h-[168px] min-h-11 flex-1 resize-none rounded-[10px] bg-white px-4 py-[11px] text-[15px] leading-[22px] outline-none placeholder:text-[#667781] disabled:bg-slate-100"
          />
          <button
            type="button"
            onClick={submit}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#008069] text-white disabled:opacity-40"
            disabled={!text.trim() || !own}
          >
            <Send size={19} />
          </button>
        </div>
      </div>

      {reviewFile && client && (
        <DocPreviewDrawer
          client={client}
          doc={{
            id: reviewFile.id,
            name: reviewFile.fileName,
            status: 'to_review',
            source: reviewFile.source,
            receivedAt: reviewFile.receivedAt,
            fileName: reviewFile.fileName,
          }}
          position={reviewIdx + 1}
          total={waitingList.length}
          onClose={() => setReviewing(null)}
          onPrev={() => setReviewing(waitingList[(reviewIdx - 1 + waitingList.length) % waitingList.length].id)}
          onNext={() => setReviewing(waitingList[(reviewIdx + 1) % waitingList.length].id)}
          onApprove={() => undefined}
          onReject={() => undefined}
          attach={{
            data: { requests: attachRequests, folders: folderChoices, suggestedFolder: folderChoices[0]?.id, clientIds: [...new Set(active.clientIds.map(parentIdOf))], fileName: reviewFile.fileName },
            onAttach: (key) => {
              const { requestId, clientId, docId, name } = attachMap[key]
              useUnsorted(reviewFile.id, requestId, clientId, docId)
              markPlaced(active.id, reviewFile.fileName, `Filed as ${name} · To review`, { requestId, clientId, docId })
              setToast(`${reviewFile.fileName} added to ${name}`)
              afterOne(reviewFile.id)
            },
            onRemove: () => {
              dropUnsorted(reviewFile.id)
              markPlaced(active.id, reviewFile.fileName, 'Removed')
              setToast(`${reviewFile.fileName} removed`)
              afterOne(reviewFile.id)
            },
            onSave: (folderId) => {
              addUploads([{ id: `un-${Date.now()}`, folderId, name: reviewFile.fileName.replace(/\.[^.]+$/, ''), fileName: reviewFile.fileName, size: '—', date: 'Just now', from: 'WhatsApp' }])
              dropUnsorted(reviewFile.id)
              markPlaced(active.id, reviewFile.fileName, 'Saved in Document Master')
              setToast(`${reviewFile.fileName} saved in Document Master`)
              afterOne(reviewFile.id)
            },
          }}
        />
      )}

      {savingContact && active.unassigned && (
        <SaveContact
          phone={active.phone}
          guessId={(() => {
            const g = active.msgs.map((m) => suggestClient(m.read)).find(Boolean)
            return g ? getBookClient(g.clientId)?.id : undefined
          })()}
          onClose={() => setSavingContact(false)}
          onSave={(name, bookId) => {
            const b = book.find((x) => x.id === bookId)
            if (!b) return
            const waiting = active.msgs.filter((m) => m.file && !m.matched)
            // The number is added as one more contact. The client's own number stays as it was.
            if (!b.contacts.some((c) => c.phone === active.phone)) addContact(b.id, { id: `ct-${Date.now()}`, name: name || 'WhatsApp contact', email: '', phone: active.phone })
            addUnsorted(waiting.map((m) => ({ id: `ul-${Date.now()}-${m.id}`, phone: active.phone, fileName: m.file!.name, receivedAt: `Today, ${m.time}`, source: 'WhatsApp' as const })))
            linkChat(active.id, b.registrations.map((r) => r.id), name || b.name)
            setSavingContact(false)
            setToast(`${active.phone} saved for ${b.name}`)
          }}
        />
      )}

      {viewing?.file && (
        <FileViewer
          msg={viewing}
          req={viewing.link ? (() => { const r = requests.find((x) => x.id === viewing.link!.requestId); const ds = (r?.clients.find((c) => c.clientId === viewing.link!.clientId)?.docs ?? []).filter((d) => d.status !== 'na'); return r ? { title: r.title, ref: r.ref, got: ds.filter((d) => d.status !== 'pending' && d.status !== 'rejected').length, total: ds.length } : undefined })() : undefined}
          who={forClient?.name ?? active.title}
          pan={looseSug ? (getBookClient(looseSug.clientId)?.pan ?? '—') : (getClient(active.clientIds[0] ?? '')?.pan ?? '—')}
          doc={
            viewing.link
              ? requests
                  .find((r) => r.id === viewing.link!.requestId)
                  ?.clients.find((c) => c.clientId === viewing.link!.clientId)
                  ?.docs.find((d) => d.id === viewing.link!.docId)
              : undefined
          }
          attach={{ requests: attachRequests, suggest: attachSuggest, folders: folderChoices, suggestedFolder, forClient: forClient ?? (active.clientIds.length ? { name: active.title, guess: false, known: true } : undefined), warn, clientIds: [...new Set(attachIds.map(parentIdOf))], fileName: viewing.file.name }}
          onSaveFolder={(folderId) => {
            const m = viewing!
            addUploads([{ id: `un-${Date.now()}-${m.id}`, folderId, name: [m.read?.kind ?? m.file!.name.replace(/\.[^.]+$/, ''), m.read?.idNo].filter(Boolean).join(' · '), fileName: m.file!.name, size: m.file!.size.split(' · ').pop() ?? m.file!.size, date: 'Just now', from: 'WhatsApp' }])
            markPlaced(active.id, m.file!.name, 'Saved in Document Master')
            setToast(`${m.file!.name} saved in Document Master`)
            setViewing(null)
          }}
          onAttach={(key) => {
            const o = attachMap[key]
            receiveFile(o.requestId, o.clientId, o.docId, viewing.file!.name)
            markPlaced(active.id, viewing.file!.name, `Filed as ${o.name} · To review`)
            setToast(`${viewing.file!.name} attached to ${o.name}`)
            setViewing(null)
          }}
          checklist={
            viewing.link
              ? (requests
                  .find((r) => r.id === viewing.link!.requestId)
                  ?.clients.find((c) => c.clientId === viewing.link!.clientId)
                  ?.docs.filter((d) => d.status !== 'na') ?? [])
              : []
          }
          onMove={(toId) => {
            const l = viewing.link!
            const docs = requests.find((r) => r.id === l.requestId)?.clients.find((c) => c.clientId === l.clientId)?.docs ?? []
            const from = docs.find((d) => d.id === l.docId)
            const to = docs.find((d) => d.id === toId)
            const label = (st?: string) => (st ? (STAND[st] ?? 'To review') : 'To review')
            moveFile(l.requestId, l.clientId, l.docId, toId)
            // The chat says where each file is. Moving a file changes that note, and a swap changes the other file's note too.
            active.msgs.forEach((m) => {
              if (!m.link || m.link.requestId !== l.requestId || m.link.clientId !== l.clientId) return
              if (m.link.docId === l.docId) {
                if (to) patchMsg(active.id, m.id, { link: { ...m.link, docId: to.id }, matched: `Filed as ${to.name} · ${label(from?.status)}` })
                else patchMsg(active.id, m.id, { link: undefined, matched: 'Not placed yet' })
              } else if (to && m.link.docId === to.id && to.status !== 'pending') {
                patchMsg(active.id, m.id, { link: { ...m.link, docId: l.docId }, matched: `Filed as ${from?.name} · ${label(to.status)}` })
              }
            })
            if (!toId) {
              // Every file of the document goes back to the waiting list.
              const names = [from?.fileName ?? viewing.file!.name, ...(from?.moreFiles ?? [])]
              addUnsorted(names.map((n, i) => ({ id: `u${Date.now()}-${i}`, phone: active.phone, fileName: n, receivedAt: 'Just now', source: 'WhatsApp' as const })))
              setToast(`${names.length > 1 ? `${names.length} files are` : `${viewing.file!.name} is`} back in the waiting list`)
            } else setToast(`${viewing.file!.name} moved to ${to?.name}`)
            setViewing(null)
          }}
          onClose={() => setViewing(null)}
          hide={!!approving || !!filing}
          filedText={(() => {
            const l = viewing.link
            const r = l && requests.find((x) => x.id === l.requestId)
            const d = r && r.clients.find((c) => c.clientId === l!.clientId)?.docs.find((x) => x.id === l!.docId)
            if (!l || !r || !d || d.status !== 'approved' || d.filedTo === null) return null
            const id = d.filedTo ?? autoFolderId(r.title, l.clientId)
            return autoFolderLabel(id) ?? folderPathName(id)
          })()}
          onFile={() => viewing.link && setFiling(viewing.link)}
          onApprove={() => viewing.link && setApproving(viewing.link)}
          onSendBack={(reason, remark) => {
            const l = viewing.link!
            const docName = requests.find((r) => r.id === l.requestId)?.clients.find((c) => c.clientId === l.clientId)?.docs.find((d) => d.id === l.docId)?.name ?? 'the document'
            setDocStatus(l.requestId, l.clientId, l.docId, 'rejected', remark ? `${reason} · ${remark}` : reason)
            sendRejected(l.requestId, l.clientId, docName, reason, remark)
            setToast(`${docName} rejected. The client has been told.`)
            setViewing(null)
          }}
        />
      )}

      {approving && (() => {
        const r = requests.find((x) => x.id === approving.requestId)
        const d = r?.clients.find((c) => c.clientId === approving.clientId)?.docs.find((x) => x.id === approving.docId)
        if (!r || !d) return null
        return (
          <ApproveSaveDialog
            request={r}
            doc={d}
            clientId={approving.clientId}
            onClose={() => setApproving(null)}
            onApprove={(folderId) => {
              setDocStatus(approving.requestId, approving.clientId, approving.docId, 'approved')
              setDocFiled(approving.requestId, approving.clientId, approving.docId, folderId)
              setToast(folderId ? `${d.name} approved and saved in Document Master` : `${d.name} approved`)
              setApproving(null)
              setViewing(null)
            }}
          />
        )
      })()}

      {filing && (() => {
        const r = requests.find((x) => x.id === filing.requestId)
        const d = r?.clients.find((c) => c.clientId === filing.clientId)?.docs.find((x) => x.id === filing.docId)
        if (!r || !d) return null
        const files = [d.fileName ?? `${d.name}.pdf`, ...(d.moreFiles ?? [])]
        return createPortal(
          <FolderPickerDialog
            fileName={files[0]}
            more={files.slice(1)}
            suggested={typeof d.filedTo === 'string' ? d.filedTo : autoFolderId(r.title, filing.clientId)}
            clientIds={[parentIdOf(filing.clientId)]}
            onClose={() => setFiling(null)}
            onSave={(folderId) => {
              setDocFiled(filing.requestId, filing.clientId, filing.docId, folderId)
              setToast(`${d.name} saved in Document Master`)
              setFiling(null)
            }}
          />,
          document.body,
        )
      })()}

      <Toast message={toast} />

      {/* Info panel: the ✕ closes it, and the button in the chat header opens it again */}
      {showPanel && <button type="button" aria-label="Close panel" onClick={() => setShowPanel(false)} className="fixed inset-0 z-40 bg-ink/40 lg:hidden" />}
      {showPanel && (
        <div className="flex w-[320px] shrink-0 flex-col border-l border-[#E9EDEF] bg-white max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:w-[min(360px,100%)] max-lg:shadow-[-16px_0_48px_rgba(14,27,44,0.22)]">
          <div className="flex h-[60px] shrink-0 items-center gap-3 bg-[#F0F2F5] px-5 text-base font-semibold">
            <button
              type="button"
              onClick={() => setShowPanel(false)}
              aria-label="Close panel"
              title="Close panel"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656F] hover:bg-black/5"
            >
              <X size={18} />
            </button>
            {active.unassigned ? 'Save these files' : 'Requests'}
          </div>
          <div className="flex-1 overflow-y-auto">
            <RightPanel key={active.id} conv={active} onReview={(id) => setReviewing(id)} onPreview={(m) => setViewing(m)} />
          </div>
        </div>
      )}
    </div>
  )
}

// With no chats at all there is nothing to pick from, so the Inbox says what it is for and how a chat starts.
export default function Inbox() {
  const { conversations } = useInbox()
  const { whatsapp } = useSetup()
  if (conversations.length > 0) return <InboxMain />
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState art="inbox" title="No chats yet" text={whatsapp ? 'When you send a request, or a client writes to you, the chat shows here. Files a client sends are read and placed for you.' : 'Chats from your clients show here. Connect your WhatsApp to read their replies, or send a request first.'}>
        <Link to="/requests/new" className="flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white">
          New request
        </Link>
        {!whatsapp && (
          <Link to="/settings?tab=whatsapp" className="flex h-11 items-center rounded-xl border border-line bg-white px-5 text-sm font-semibold hover:border-brand">
            Connect WhatsApp
          </Link>
        )}
      </EmptyState>
    </div>
  )
}
