import type { RequestDoc } from '../data/requests'
import type { Client } from '../data/types'

// A stand-in for the real file. Real previews (PDF / image viewer) plug in here later.
export default function PaperPreview({ doc, client }: { doc: Pick<RequestDoc, "name">; client: Pick<Client, "name" | "pan"> }) {
  return (
    <div className="mx-auto w-[360px] rounded-sm bg-white px-8 py-9 shadow-[0_2px_18px_rgba(14,27,44,0.16)]">
      <div className="text-center text-[15px] font-bold tracking-widest">{doc.name.toUpperCase()}</div>
      <div className="mt-1 text-center text-[10px] text-muted">Financial year 2025-26</div>
      <div className="my-4 h-px bg-line" />
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>Name: {client.name}</span>
        <span>PAN: {client.pan}</span>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {[92, 70, 84, 60, 88].map((w, i) => (
          <div key={i} className="h-2 rounded-sm bg-slate-100" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="my-4 h-px bg-line" />
      <div className="grid grid-cols-[2fr_1fr] gap-x-3 gap-y-2 text-[10px] text-slate-600">
        <span>Amount of income</span>
        <span className="text-right">₹ 9,85,000</span>
        <span>Deductions</span>
        <span className="text-right">₹ 1,50,000</span>
        <span>Tax paid</span>
        <span className="text-right">₹ 62,400</span>
      </div>
      <div className="mt-5 flex flex-col gap-2">
        {[76, 90, 58].map((w, i) => (
          <div key={i} className="h-2 rounded-sm bg-slate-100" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}
