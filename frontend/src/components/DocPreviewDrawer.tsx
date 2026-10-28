import { ChevronLeft, ChevronRight, Check, Download, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { RequestDoc } from '../data/requests'
import type { Client } from '../data/types'
import FileTypeIcon from './FileTypeIcon'
import FilePane from './FilePane'
import OpenInTab from './OpenInTab'
import StatusBadge from './StatusBadge'
import AttachPanel from './AttachPanel'
import type { AttachData } from './AttachPanel'
import { fileLink } from '../lib/fileLink'

interface Props {
  client: Client
  doc: RequestDoc
  position: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onApprove: () => void
  onReject: () => void
  // For a file we could not match: the documents it can be, and what to do when the CA picks one.
  // For a file waiting in the Inbox: put it on a request's checklist, or keep it in a folder. Takes the place of `place`.
  hide?: boolean // another window (the approve and save one) is open on top: the drawer hides
  attach?: { data: AttachData; onAttach: (key: string) => void; onSave: (folderId: string) => void; onRemove?: () => void }
}

export default function DocPreviewDrawer({ client, doc, position, total, onClose, onPrev, onNext, onApprove, onReject, hide, attach }: Props) {
  const [windowOpen, setWindowOpen] = useState(false) // the Save-as / Add-to window is open: the drawer hides
  const [fi, setFi] = useState(0) // which file of the document is shown, when it has more than one
  // Moving to another file keeps the drawer where it is (no slide again); only what was picked for the old file is cleared.
  useEffect(() => {
    setFi(0)
  }, [doc.id])
  // Esc closes; arrow keys move between documents. Ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  const decided = doc.status === 'approved' || doc.status === 'rejected'

  return (
    <div className={windowOpen || hide ? 'hidden' : undefined}>
      <button type="button" aria-label="Close preview" onClick={onClose} className="fixed inset-0 z-[24] cursor-default bg-ink/40 animate-[dc-fade_200ms_ease-out]" />
    <aside
      className="fixed right-0 top-0 z-[25] flex h-full w-[520px] max-w-full flex-col border-l border-line bg-white shadow-[-16px_0_48px_rgba(14,27,44,0.22)] animate-[dc-slide_240ms_cubic-bezier(0.2,0.8,0.2,1)]"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${doc.name}`}
    >
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <FileTypeIcon file={doc.fileName ?? 'file.pdf'} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold">{doc.name}</div>
          <div className="truncate text-[13px] text-muted">
            {client.name} · {doc.receivedAt} · via {doc.source === 'Link' ? 'upload link' : 'WhatsApp'}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close preview" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas">
          <X size={20} />
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-line bg-slate-50 px-5 py-2.5">
        <div className="flex items-center gap-1">
          <button type="button" onClick={onPrev} aria-label="Previous document" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white">
            <ChevronLeft size={18} />
          </button>
          <span className="w-24 text-center text-[13px] font-semibold text-slate-600">
            {position} of {total}
          </span>
          <button type="button" onClick={onNext} aria-label="Next document" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {attach ? (
            <span className="rounded-md bg-warn-soft px-2 py-1 text-[12px] font-bold uppercase tracking-wide text-warn">Not placed</span>
          ) : (
            <StatusBadge status={doc.status} />
          )}
          <OpenInTab iconOnly href={fileLink({ name: doc.name, fileName: doc.fileName, client: client.name, pan: client.pan, from: doc.receivedAt, moreFiles: doc.moreFiles })} />
          <button type="button" aria-label="Download" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white">
            <Download size={17} />
          </button>
          {attach?.onRemove && (
            <button type="button" aria-label="Remove this file" title="Not a client document, remove it" onClick={attach.onRemove} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger">
              <Trash2 size={17} />
            </button>
          )}
        </div>
      </div>

      {doc.moreFiles && doc.moreFiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-5 py-2.5 text-[13px]">
          <span className="font-semibold text-muted">{doc.moreFiles.length + 1} files:</span>
          {[doc.fileName ?? 'file.pdf', ...doc.moreFiles].map((f, i) => (
            <button key={f + i} type="button" aria-pressed={i === fi} onClick={() => setFi(i)} className={`inline-flex max-w-[210px] items-center gap-1.5 rounded-lg border px-2 py-1 font-medium ${i === fi ? 'border-brand bg-brand-soft text-brand-dark' : 'border-transparent bg-canvas text-slate-700 hover:border-brand'}`}>
              <FileTypeIcon file={f} size={16} />
              <span className="truncate">{f}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto bg-[#EDF0F5] px-6 py-8">
        <FilePane fileName={[doc.fileName ?? 'file.pdf', ...(doc.moreFiles ?? [])][fi] ?? 'file.pdf'} docName={doc.name} client={client} />
      </div>

      {attach ? (
        <div className="border-t border-line bg-white px-5 pb-5 pt-4 shadow-[0_-8px_20px_rgba(14,27,44,0.06)]">
          <AttachPanel key={doc.id} {...attach.data} onWindow={setWindowOpen} onAttach={attach.onAttach} onSave={attach.onSave} />
        </div>
      ) : (
      <div className="border-t border-line bg-white px-5 py-4">
        {doc.status === 'rejected' && doc.reason && (
          <div className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">Rejected: {doc.reason}</div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onApprove}
            disabled={doc.status === 'approved'}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)] disabled:opacity-40 disabled:shadow-none"
          >
            <Check size={18} strokeWidth={2.8} />
            {doc.status === 'approved' ? 'Approved' : 'Approve'}
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#F1B5AE] bg-white text-[15px] font-semibold text-danger hover:bg-danger-soft"
          >
            <X size={18} strokeWidth={2.6} />
            {doc.status === 'rejected' ? 'Reject again' : 'Reject'}
          </button>
        </div>
        <p className="mt-2.5 text-center text-xs text-muted">
          {decided ? 'You can change your decision any time.' : 'After you decide, the next document opens by itself. Use ← → to move around, Esc to close.'}
        </p>
      </div>
      )}
    </aside>
    </div>
  )
}
