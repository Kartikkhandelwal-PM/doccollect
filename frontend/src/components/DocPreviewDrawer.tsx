import { ChevronLeft, ChevronRight, Check, Download, FolderInput, X } from 'lucide-react'
import { useEffect } from 'react'
import type { RequestDoc } from '../data/requests'
import type { Client } from '../data/types'
import FileTypeIcon from './FileTypeIcon'
import PaperPreview from './PaperPreview'
import StatusBadge from './StatusBadge'

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
  onMove: () => void
}

export default function DocPreviewDrawer({ client, doc, position, total, onClose, onPrev, onNext, onApprove, onReject, onMove }: Props) {
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
    <>
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
          <StatusBadge status={doc.status} />
          <button type="button" aria-label="Download" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white">
            <Download size={17} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#EDF0F5] px-6 py-8">
        <PaperPreview doc={doc} client={client} />
        <p className="mt-5 text-center text-xs text-muted">Sample preview. The client's real file shows here.</p>
      </div>

      <div className="border-t border-line bg-white px-5 py-4">
        {doc.check && (
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn">
            <span className="flex-1">
              <b>Please check:</b> {doc.check}
            </span>
            <button type="button" onClick={onMove} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-ink shadow-sm hover:bg-canvas">
              <FolderInput size={15} />
              Move
            </button>
          </div>
        )}
        {doc.status === 'rejected' && doc.reason && (
          <div className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">Sent back: {doc.reason}</div>
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
        {doc.status === 'to_review' && (
          <button
            type="button"
            onClick={onMove}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm font-semibold text-ink hover:border-brand hover:bg-brand-soft/40"
          >
            <FolderInput size={17} />
            Move to another document
          </button>
        )}
        <p className="mt-2.5 text-center text-xs text-muted">
          {decided ? 'You can change your decision any time.' : 'After you decide, the next document opens by itself. Use ← → to move around, Esc to close.'}
        </p>
      </div>
    </aside>
    </>
  )
}
