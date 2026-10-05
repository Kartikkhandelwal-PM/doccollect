import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Avatar from './Avatar'
import { clients, getClient } from '../data/mock'
import { fmtDate, useRequests } from '../data/requests'
import type { DocRef } from '../data/requests'
import { serviceColor } from '../lib/status'

// The CA puts a file where it belongs. We sorted it first, so this is only for the ones we got wrong.
export default function MoveDocDialog({ from, onMove, onSendBack, onClose }: { from: DocRef; onMove: (to: DocRef) => void; onSendBack: () => void; onClose: () => void }) {
  const { requests } = useRequests()
  const source = getClient(from.clientId)
  const sourceDoc = requests.find((r) => r.id === from.requestId)?.clients.find((c) => c.clientId === from.clientId)?.docs.find((d) => d.id === from.docId)

  const [query, setQuery] = useState('')
  const [clientId, setClientId] = useState(from.clientId)
  const [requestId, setRequestId] = useState(from.requestId)
  const [docId, setDocId] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // The usual mix-up is between clients on one number, so those come first. Search finds anyone else.
  const sameNumber = useMemo(() => clients.filter((c) => source && c.phone === source.phone), [source])
  const q = query.trim().toLowerCase()
  const shown = q ? clients.filter((c) => `${c.name} ${c.phone} ${c.pan}`.toLowerCase().includes(q)).slice(0, 8) : sameNumber

  const clientRequests = requests.filter((r) => r.clients.some((c) => c.clientId === clientId))
  const request = clientRequests.find((r) => r.id === requestId) ?? clientRequests[0]
  const slots = request?.clients.find((c) => c.clientId === clientId)?.docs ?? []
  const isSelf = (id: string) => request?.id === from.requestId && clientId === from.clientId && id === from.docId
  // A free slot takes the file. A slot with another file that is still to be reviewed swaps places with it. Approved ones stay locked.
  const kind = (id: string, status: string): 'self' | 'free' | 'swap' | 'locked' =>
    isSelf(id) ? 'self' : status === 'pending' || status === 'rejected' ? 'free' : status === 'to_review' ? 'swap' : 'locked'

  const pickClient = (id: string) => {
    setClientId(id)
    const first = requests.filter((r) => r.clients.some((c) => c.clientId === id))
    setRequestId(first.find((r) => r.id === from.requestId)?.id ?? first[0]?.id ?? '')
    setDocId('')
  }

  // Offer the slot with the same name first, so the common case is one click.
  const suggested = slots.find((d) => kind(d.id, d.status) === 'free' && d.name === sourceDoc?.name)?.id
  const chosen = docId || suggested || ''
  const noPlace = slots.length > 0 && slots.every((d) => kind(d.id, d.status) !== 'free' && kind(d.id, d.status) !== 'swap')
  const chosenKind = (() => {
    const d = slots.find((x) => x.id === chosen)
    return d ? kind(d.id, d.status) : null
  })()

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Move document">
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">Move “{sourceDoc?.name}”</h2>
            <p className="mt-1 text-sm text-muted">Put it where it belongs. It leaves its current place.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-canvas">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-faint">Whose is it?</h3>
            <label className="mt-2 flex h-10 items-center gap-2 rounded-xl border border-transparent bg-canvas px-3 text-sm text-muted focus-within:border-brand focus-within:bg-white">
              <Search size={15} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search another client" aria-label="Search client" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
            </label>
            <div className="mt-2 flex flex-col gap-1.5">
              {!q && sameNumber.length > 1 && <p className="text-xs text-muted">These clients use the same number.</p>}
              {shown.length === 0 && <p className="py-2 text-sm text-muted">No client found.</p>}
              {shown.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={clientId === c.id}
                  onClick={() => pickClient(c.id)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left ${clientId === c.id ? 'border-brand bg-brand-soft' : 'border-line hover:bg-canvas'}`}
                >
                  <Avatar name={c.name} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {c.name} <span className={`ml-1 text-xs font-bold ${serviceColor[c.service]}`}>{c.service}</span>
                    </span>
                    <span className="block text-xs text-muted">{c.phone}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-faint">Which request?</h3>
            {clientRequests.length === 0 && <p className="mt-2 text-sm text-muted">This client has no request yet.</p>}
            <div className="mt-2 flex flex-col gap-1.5">
              {clientRequests.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={request?.id === r.id}
                  onClick={() => {
                    setRequestId(r.id)
                    setDocId('')
                  }}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${request?.id === r.id ? 'border-brand bg-brand-soft' : 'border-line hover:bg-canvas'}`}
                >
                  <span className="font-semibold">{r.title}</span>
                  <span className="text-xs text-muted">
                    {r.ref} · due {fmtDate(r.due)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {request && (
            <section>
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-faint">Which document?</h3>
              <div className="mt-2 flex flex-col gap-1.5">
                {slots.map((d) => {
                  const k = kind(d.id, d.status)
                  const open = k === 'free' || k === 'swap'
                  const note = k === 'self' ? 'This file is here now' : k === 'free' ? (d.status === 'rejected' ? 'Sent back, waiting' : 'Not received') : k === 'swap' ? 'Has another file: swap' : d.status === 'na' ? 'Does not apply' : 'Approved, locked'
                  return (
                    <button
                      key={d.id}
                      type="button"
                      role="radio"
                      aria-checked={chosen === d.id}
                      disabled={!open}
                      onClick={() => setDocId(d.id)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${chosen === d.id ? 'border-brand bg-brand-soft' : 'border-line'} ${open ? 'hover:bg-canvas' : 'cursor-not-allowed opacity-50'}`}
                    >
                      <span className="font-semibold">{d.name}</span>
                      <span className={`text-xs ${k === 'swap' ? 'font-semibold text-brand-dark' : 'text-muted'}`}>{note}</span>
                    </button>
                  )
                })}
              </div>
              {chosenKind === 'swap' && <p className="mt-2 text-xs text-muted">The two files change places. Both stay to be reviewed.</p>}
              {noPlace && (
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {clientId === from.clientId
                    ? 'This file is already in the right place. Every other document of this client is approved. If it belongs to someone else, search for that client above.'
                    : 'This client has no free place for it. Every document is approved.'}
                </p>
              )}
            </section>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-slate-50/70 px-6 py-4">
          <button type="button" onClick={onSendBack} className="mr-auto text-[13px] font-semibold text-danger hover:underline">
            Send it back instead
          </button>
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-line bg-white px-5 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="button"
            disabled={!chosen || !request}
            onClick={() => request && onMove({ requestId: request.id, clientId, docId: chosen })}
            className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
          >
            {chosenKind === 'swap' ? 'Swap them' : 'Move here'}
          </button>
        </div>
      </div>
    </div>
  )
}
