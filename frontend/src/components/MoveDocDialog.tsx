import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { clients, getClient } from '../data/mock'
import { fmtDate, useRequests } from '../data/requests'
import type { DocRef } from '../data/requests'
import { serviceColor } from '../lib/status'

interface Place extends DocRef {
  key: string
  doc: string
  who: string
  service: keyof typeof serviceColor
  request: string
  swap: boolean
}

// One list of the places this file can go. Pick one. Nothing else to decide.
export default function MoveDocDialog({ from, onMove, onSendBack, onClose }: { from: DocRef; onMove: (to: DocRef) => void; onSendBack: () => void; onClose: () => void }) {
  const { requests } = useRequests()
  const source = getClient(from.clientId)
  const sourceDoc = requests.find((r) => r.id === from.requestId)?.clients.find((c) => c.clientId === from.clientId)?.docs.find((d) => d.id === from.docId)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Without a search: this client and anyone on the same number. With a search: whoever matches.
  const q = query.trim().toLowerCase()
  const people = useMemo(
    () => (q ? clients.filter((c) => `${c.name} ${c.phone} ${c.pan}`.toLowerCase().includes(q)).slice(0, 8) : clients.filter((c) => source && c.phone === source.phone)),
    [q, source],
  )

  const places = useMemo<Place[]>(
    () =>
      people.flatMap((c) =>
        requests.flatMap((r) =>
          r.clients
            .filter((rc) => rc.clientId === c.id)
            .flatMap((rc) =>
              rc.docs
                .filter((d) => !(r.id === from.requestId && c.id === from.clientId && d.id === from.docId))
                .filter((d) => d.status === 'pending' || d.status === 'rejected' || d.status === 'to_review')
                .map((d) => ({
                  key: `${r.id}:${c.id}:${d.id}`,
                  requestId: r.id,
                  clientId: c.id,
                  docId: d.id,
                  doc: d.name,
                  who: c.name,
                  service: c.service,
                  request: `${r.title} · due ${fmtDate(r.due)}`,
                  swap: d.status === 'to_review',
                })),
            ),
        ),
      ),
    [people, requests, from],
  )
  const chosen = places.find((x) => x.key === picked)
  const ordered = [...places].sort((a, b) => Number(a.swap) - Number(b.swap)) // empty places first

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Move document">
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">Where should “{sourceDoc?.name}” go?</h2>
            <p className="mt-1 text-sm text-muted">Pick the document it belongs to.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-canvas">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto px-6 py-5">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-transparent bg-canvas px-3 text-sm text-muted focus-within:border-brand focus-within:bg-white">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search another client" aria-label="Search client" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
          </label>

          {places.length === 0 ? (
            <p className="py-3 text-sm leading-relaxed text-muted">
              {q ? 'No open document found for that client.' : 'There is no free place for this file. Search for another client, or send it back.'}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Places">
              {ordered.map((x) => (
                <button
                  key={x.key}
                  type="button"
                  role="radio"
                  aria-checked={picked === x.key}
                  onClick={() => setPicked(x.key)}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left ${picked === x.key ? 'border-brand bg-brand-soft' : 'border-line hover:bg-canvas'}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{x.doc}</span>
                    <span className="block truncate text-xs text-muted">
                      {x.who} <span className={`font-bold ${serviceColor[x.service]}`}>{x.service}</span> · {x.request}
                    </span>
                  </span>
                  <span className={`shrink-0 text-xs font-semibold ${x.swap ? 'text-brand-dark' : 'text-muted'}`}>{x.swap ? 'Swap' : 'Empty'}</span>
                </button>
              ))}
            </div>
          )}
          {chosen?.swap && <p className="text-xs text-muted">It already has a file waiting for review. The two files change places.</p>}
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
            disabled={!chosen}
            onClick={() => chosen && onMove({ requestId: chosen.requestId, clientId: chosen.clientId, docId: chosen.docId })}
            className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
          >
            {chosen?.swap ? 'Swap' : 'Move here'}
          </button>
        </div>
      </div>
    </div>
  )
}
