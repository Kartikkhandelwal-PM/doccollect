import { Bell, X } from 'lucide-react'
import { useEffect } from 'react'
import Avatar from './Avatar'
import WaText from './WaText'
import { getClient } from '../data/mock'

export interface ReminderTarget {
  requestId: string
  clientId: string
}

// One place to chase many clients. It shows exactly what goes out, and who gets it, before anything is sent.
export default function ReminderDialog({ targets, text, update, onSend, onClose }: { targets: ReminderTarget[]; text: string; update?: boolean; onSend: () => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const names = targets.map((t) => getClient(t.clientId)?.name).filter(Boolean) as string[]
  const n = targets.length

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Send reminders">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 className="text-lg font-bold">
              {update ? 'Send update to' : 'Remind'} {n} {n === 1 ? 'client' : 'clients'}?
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">Each client gets a WhatsApp message with their own approved and pending documents. It also appears in their Inbox chat.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-canvas">
            <X size={18} />
          </button>
        </div>

        <div className="mx-6 mt-4 rounded-2xl bg-[#EFEAE2] p-4">
          <div className="ml-auto w-fit max-w-[94%] rounded-[10px] rounded-tr-none bg-[#D9FDD3] px-3 py-2 text-[14px] leading-snug shadow-[0_1px_1px_rgba(17,27,33,0.13)]">
            <WaText text={text} />
          </div>
        </div>
        <p className="mx-6 mt-2 text-xs text-muted">This is the message for {names[0] ?? 'the first client'}. Other clients get their own names, documents and link.</p>

        <div className="mx-6 mt-4 flex items-center gap-3">
          <div className="flex -space-x-2">
            {names.slice(0, 5).map((nm, i) => (
              <span key={i} className="rounded-full ring-2 ring-white">
                <Avatar name={nm} size={30} />
              </span>
            ))}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
            {names.slice(0, 2).join(', ')}
            {n > 2 && ` and ${n - 2} more`}
          </span>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-line bg-slate-50/70 px-6 py-4">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-line bg-white px-5 text-sm font-semibold">
            Cancel
          </button>
          <button type="button" onClick={onSend} className="flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark">
            <Bell size={16} />
            Send {n} {n === 1 ? (update ? 'update' : 'reminder') : update ? 'updates' : 'reminders'}
          </button>
        </div>
      </div>
    </div>
  )
}
