import { motion } from 'framer-motion'
import { Check, ListChecks, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { backdropProps, panelProps } from '../lib/motion'
import FileTypeIcon from './FileTypeIcon'
import type { AttachRequest } from './AttachPanel'

// A numbered heading for each side, so it reads as two steps: first the request, then the document.
function Step({ n, text, done, off }: { n: number; text: string; done?: boolean; off?: boolean }) {
  return (
    <div className={`flex h-[46px] shrink-0 items-center gap-2.5 border-b border-line px-4 ${off ? 'opacity-50' : ''}`}>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${done ? 'bg-brand text-white' : 'bg-canvas text-muted'}`}>{done ? <Check size={13} strokeWidth={3.4} /> : n}</span>
      <span className="truncate text-sm font-bold">{text}</span>
    </div>
  )
}

// "Which checklist does this file belong to?" Requests on the left, the documents of the chosen request on the right.
// The request and document we think it is are already chosen; the CA clicks another and presses the button.
export default function RequestPickerDialog({ fileName, requests, suggestedKey, onAdd, onClose }: { fileName: string; requests: AttachRequest[]; suggestedKey?: string; onAdd: (docKey: string) => void; onClose: () => void }) {
  const suggestedReq = suggestedKey ? suggestedKey.split(':').slice(0, 2).join(':') : ''
  const [reqKey, setReqKey] = useState(suggestedReq || requests[0]?.key || '')
  const [docKey, setDocKey] = useState(suggestedKey ?? '')
  const req = requests.find((r) => r.key === reqKey)
  const doc = req?.docs.find((d) => d.key === docKey)
  const todo = req?.docs.filter((d) => !d.extra) ?? []
  const extra = req?.docs.filter((d) => d.extra && d.multiple) ?? []
  const replace = req?.docs.filter((d) => d.extra && !d.multiple) ?? []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation() // closes only this window, not the preview under it
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const docRow = (d: { key: string; name: string; status?: string }) => {
    const on = d.key === docKey
    return (
      <button
        key={d.key}
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => setDocKey(d.key)}
        onDoubleClick={() => onAdd(d.key)}
        className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm ${on ? 'bg-brand-soft font-semibold text-brand-dark' : 'hover:bg-white'}`}
      >
        <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${on ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white'}`}>{on && <Check size={11} strokeWidth={3.4} />}</span>
        <span className="min-w-0 flex-1 truncate">{d.name}</span>
        {d.status === 'rejected' && <span className="shrink-0 text-[11px] font-semibold text-danger">Rejected</span>}
        {d.status === 'pending' && <span className="shrink-0 text-[11px] font-semibold text-muted">Pending</span>}
        {d.status === 'to_review' && <span className="shrink-0 text-[11px] font-semibold text-warn">To review</span>}
      </button>
    )
  }

  return (
    <motion.div {...backdropProps} className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Add to a request">
      <motion.div {...panelProps} className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <FileTypeIcon file={fileName} size={32} />
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold">Add to a request</div>
            <div className="truncate text-[13px] text-muted">
              Choose the request, then the document in its checklist that <span className="font-semibold text-ink">{fileName}</span> is.
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas">
            <X size={20} />
          </button>
        </div>

        <div className="flex h-[min(560px,calc(100vh-260px))] min-h-0">
          <div className="flex w-[340px] shrink-0 flex-col border-r border-line">
            <Step n={1} text="Which request?" done={!!req} />
            <div role="radiogroup" aria-label="Request" className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {requests.map((r) => {
                const on = r.key === reqKey
                return (
                  <button
                    key={r.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setReqKey(r.key)
                      setDocKey('')
                    }}
                    className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left ${on ? 'bg-brand-soft' : 'hover:bg-canvas'}`}
                  >
                    <ListChecks size={18} className={`shrink-0 ${on ? 'text-brand-dark' : 'text-muted'}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${on ? 'font-semibold text-brand-dark' : 'font-medium'}`}>
                        {r.title}
                        {r.place ? ` · ${r.place}` : ''}
                      </span>
                      <span className="block text-[12px] text-muted">
                        {r.ref} · Due {r.due}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold text-warn">{r.docs.filter((d) => !d.extra).length} pending</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col bg-canvas/40">
            <Step n={2} text={req ? `Which document in ${req.title} (${req.ref})?` : 'Which document?'} done={!!doc} off={!req} />
            <div role="radiogroup" aria-label="Document" className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {todo.length > 0 && <div className="px-3 pb-1 pt-1 text-[12px] font-semibold text-muted">Pending: the client has not sent these yet</div>}
              {todo.map(docRow)}
              {extra.length > 0 && <div className="px-3 pb-1 pt-3 text-[12px] font-semibold text-muted">Already received: this file will be added as another file of it</div>}
              {extra.map(docRow)}
              {replace.length > 0 && <div className="px-3 pb-1 pt-3 text-[12px] font-semibold text-muted">Already has a file: this file will replace it</div>}
              {replace.map(docRow)}
              {!req && <p className="px-3 py-6 text-center text-sm text-muted">Select a request.</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-line bg-canvas/60 px-5 py-3">
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
            {doc ? (
              <>
                Add to: <span className="font-semibold text-ink">{doc.name}</span> · {req?.title} ({req?.ref})
              </>
            ) : (
              'Select a document'
            )}
          </span>
          <button type="button" onClick={onClose} className="h-11 shrink-0 rounded-xl border border-line bg-white px-5 text-sm font-semibold hover:bg-canvas">
            Cancel
          </button>
          <button type="button" disabled={!doc} onClick={() => doc && onAdd(doc.key)} className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white disabled:opacity-40">
            <Check size={16} strokeWidth={2.8} /> Add here
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
