import type { RequestDoc } from '../data/requests'
import type { Client } from '../data/types'

// A stand-in for the real file. Real previews (PDF / image viewer) plug in here later.
export default function PaperPreview({ doc, client }: { doc: Pick<RequestDoc, "name">; client: Pick<Client, "name" | "pan"> }) {
  return (
    <div className="mx-auto w-[360px] rounded-sm bg-white px-8 py-9 shadow-[0_2px_18px_rgba(14,27,44,0.16)]">
      <div className="text-center text-[15px] font-bold tracking-widest">{doc.name.toUpperCase()}</div>
      <div className="mt-1 text-center text-[12px] text-muted">Sample page</div>
      <div className="my-4 h-px bg-line" />
      <div className="flex justify-between text-[12px] text-slate-600">
        <span>{client.name}</span>
        {client.pan && client.pan !== '—' && <span>PAN: {client.pan}</span>}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {[92, 70, 84, 60, 88].map((w, i) => (
          <div key={i} className="h-2 rounded-sm bg-slate-100" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="my-4 h-px bg-line" />
      <div className="flex flex-col gap-2">
        {[64, 80, 52, 72].map((w, i) => (
          <div key={i} className="h-2 rounded-sm bg-slate-100" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-2">
        {[76, 90, 58].map((w, i) => (
          <div key={i} className="h-2 rounded-sm bg-slate-100" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}
