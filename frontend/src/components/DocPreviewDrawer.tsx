import { ChevronDown, ChevronLeft, ChevronRight, Check, Download, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { RequestDoc } from '../data/requests'
import type { Client } from '../data/types'
import FileTypeIcon from './FileTypeIcon'
import PaperPreview from './PaperPreview'
import OpenInTab from './OpenInTab'
import StatusBadge from './StatusBadge'
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
  place?: { options: { id: string; label: string; group: string; extra?: boolean }[]; onPlace: (docId: string) => void; onElse?: () => void }
}

export default function DocPreviewDrawer({ client, doc, position, total, onClose, onPrev, onNext, onApprove, onReject, place }: Props) {
  const [picked, setPicked] = useState('')
  const [choosing, setChoosing] = useState(false)
  const [q, setQ] = useState('')
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
            {client.name} · {doc.receivedAt} · {doc.reused ? 'already on file' : `via ${doc.source === 'Link' ? 'upload link' : 'WhatsApp'}`}
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
          {place ? (
            <span className="rounded-md bg-warn-soft px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-warn">Not placed</span>
          ) : (
            <StatusBadge status={doc.status} />
          )}
          <OpenInTab iconOnly href={fileLink({ name: doc.name, fileName: doc.fileName, client: client.name, pan: client.pan, from: doc.receivedAt, moreFiles: doc.moreFiles })} />
          <button type="button" aria-label="Download" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white">
            <Download size={17} />
          </button>
        </div>
      </div>

      {doc.moreFiles && doc.moreFiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-5 py-2.5 text-[13px]">
          <span className="font-semibold text-muted">{doc.moreFiles.length + 1} files:</span>
          {[doc.fileName, ...doc.moreFiles].map((f) => (
            <span key={f} className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2 py-1 font-medium text-slate-700">
              <FileTypeIcon file={f ?? 'file.pdf'} size={16} />
              {f}
            </span>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto bg-[#EDF0F5] px-6 py-8">
        <PaperPreview doc={doc} client={client} />
        <p className="mt-5 text-center text-xs text-muted">Sample preview. The client's real file shows here.</p>
      </div>

      {place ? (
        <div className="relative border-t border-line bg-white px-5 py-4">
          {choosing && <button type="button" aria-label="Close the list" className="fixed inset-0 z-[26] cursor-default" onClick={() => setChoosing(false)} />}
          {choosing && (
            <div role="listbox" aria-label="Documents" className="absolute inset-x-5 bottom-[calc(100%-8px)] z-[27] flex max-h-[min(340px,55vh)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_-12px_32px_rgba(14,27,44,0.18)]">
              {place.options.length > 6 && (
                <label className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-3.5 text-sm text-muted">
                  <Search size={15} />
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents" aria-label="Search documents" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
                </label>
              )}
              <div className="overflow-y-auto py-1">
                {[...new Set(place.options.map((o) => o.group))].map((g) => {
                  const list = place.options.filter((o) => o.group === g && o.label.toLowerCase().includes(q.trim().toLowerCase()))
                  if (list.length === 0) return null
                  return (
                    <div key={g}>
                      <div className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-faint">{g}</div>
                      {list.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          role="option"
                          aria-selected={picked === o.id}
                          onClick={() => {
                            setPicked(o.id)
                            setChoosing(false)
                            setQ('')
                          }}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium hover:bg-canvas ${picked === o.id ? 'bg-brand-soft text-brand-dark' : ''}`}
                        >
                          <span>
                            {o.label}
                            {o.extra && o.group !== 'Add as another file of' && <span className="ml-2 text-xs font-normal text-muted">add as another file</span>}
                          </span>
                          {picked === o.id && <Check size={15} strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  )
                })}
                {place.options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase())).length === 0 && <p className="px-4 py-4 text-sm text-muted">No document found.</p>}
              </div>
            </div>
          )}
          <div className="text-sm font-bold">Which document is this?</div>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={choosing}
            onClick={() => setChoosing((v) => !v)}
            className={`relative z-[27] mt-2 flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3.5 text-left text-sm font-semibold ${picked ? 'border-brand text-ink' : 'border-line text-muted'} hover:border-brand`}
          >
            <span className="truncate">{picked ? (() => { const o = place.options.find((x) => x.id === picked); return o ? (o.group === 'Not received yet' || o.group === 'Add as another file of' ? o.label : `${o.label} · ${o.group}`) : '' })() : 'Choose the document…'}</span>
            <ChevronDown size={16} className={choosing ? 'rotate-180' : ''} />
          </button>
          {picked && (() => { const o = place.options.find((x) => x.id === picked); return o?.extra ?? o?.group === 'Add as another file of' })() && <p className="mt-1.5 text-xs text-muted">It is added as another file of this document, for example the back of a card.</p>}
          <button
            type="button"
            disabled={!picked}
            onClick={() => {
              place.onPlace(picked)
              setPicked('')
            }}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)] disabled:opacity-40 disabled:shadow-none"
          >
            Save here
          </button>
          {place.onElse && (
            <button type="button" onClick={place.onElse} className="mt-2.5 block w-full text-center text-[13px] font-semibold text-muted hover:text-ink hover:underline">
              Not for this request
            </button>
          )}
        </div>
      ) : (
      <div className="border-t border-line bg-white px-5 py-4">
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
        <p className="mt-2.5 text-center text-xs text-muted">
          {decided ? 'You can change your decision any time.' : 'After you decide, the next document opens by itself. Use ← → to move around, Esc to close.'}
        </p>
      </div>
      )}
    </aside>
    </>
  )
}
