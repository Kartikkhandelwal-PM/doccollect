import { CalendarDays, Check, Clock, FileCheck2, Lock, Phone, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import FirmLogo from '../components/FirmLogo'
import { getClient } from '../data/mock'
import { fmtDate, useRequests } from '../data/requests'
import type { RequestDoc } from '../data/requests'
import { useSetup } from '../data/setup'
import { expiresOn, isExpired } from '../lib/dates'

// The page a client opens from the WhatsApp link. It has one job: collect the documents.
export default function ClientUpload() {
  const { requestId, clientId } = useParams()
  const [params] = useSearchParams()
  const preview = params.get('preview') === '1'
  const { getRequest, clientUpload, clientAddFile, markNotApplicable, resetClient, clientRemove } = useRequests()
  const { firm, graceDays } = useSetup()
  const [sent, setSent] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const request = requestId ? getRequest(requestId) : undefined
  const rc = request?.clients.find((c) => c.clientId === clientId)
  const client = clientId ? getClient(clientId) : undefined

  if (!request || !rc || !client) {
    return (
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-canvas text-muted">
          <Lock size={24} />
        </span>
        <h1 className="text-xl font-bold">This link is not valid</h1>
        <p className="text-sm text-muted">It may have expired. Please ask {firm.name} to send you a new one.</p>
      </div>
    )
  }

  const first = client.name.split(' ')[0]
  const total = rc.docs.length
  const done = rc.docs.filter((d) => d.status !== 'pending' && d.status !== 'rejected').length
  const left = total - done
  const pct = total ? Math.round((done / total) * 100) : 0
  const callable = firm.phone.replace(/\D/g, '')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((new Date(`${request.due}T00:00:00`).getTime() - today.getTime()) / 86400000)
  const dueText = daysLeft < 0 ? `Overdue by ${-daysLeft} ${daysLeft === -1 ? 'day' : 'days'}` : daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft} days`
  const dueTone = daysLeft < 0 ? 'text-danger' : daysLeft <= 2 ? 'text-warn' : 'text-muted'

  // Things the client still has to do come first: sent back, then not sent yet, then the rest.
  const rank = (d: RequestDoc) => (d.status === 'rejected' ? 0 : d.status === 'pending' ? 1 : 2)
  const docs = [...rc.docs].sort((a, b) => rank(a) - rank(b))

  // A document can be several files: the front and back of a card, or more than one sheet.
  const addMore = (d: RequestDoc, files: FileList | null) => {
    if (!files) return
    for (const f of Array.from(files)) clientAddFile(request.id, rc.clientId, d.id, f.name)
  }
  const pick = (d: RequestDoc, files: FileList | null) => {
    const list = files ? Array.from(files) : []
    if (list.length === 0) return
    clientUpload(request.id, rc.clientId, d.id, list[0].name)
    list.slice(1).forEach((f) => clientAddFile(request.id, rc.clientId, d.id, f.name))
  }

  const banner = preview && (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-ink px-4 py-2.5 text-[13px] font-medium text-white">
      <span>You are previewing what {first} sees</span>
      <span className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => {
            resetClient(request.id, rc.clientId)
            setSent(false)
          }}
          className="rounded-lg bg-white/15 px-3 py-1.5 font-semibold hover:bg-white/25"
        >
          Start over
        </button>
        <Link to={`/requests/${request.id}`} className="rounded-lg bg-white/15 px-3 py-1.5 font-semibold hover:bg-white/25">
          ← Back to request
        </Link>
      </span>
    </div>
  )

  // An old link (replaced by a new one), or one past its last date plus the extra days, no longer works.
  const token = params.get('t')
  const oldLink = token !== null && token !== `v${rc.linkVersion ?? 1}`
  if (oldLink || isExpired(request.due, graceDays)) {
    return (
      <div className="min-h-full bg-canvas">
        {banner}
        <div className="mx-auto flex min-h-[80vh] max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
          <FirmLogo name={firm.name} logo={firm.logo} size={56} />
          <h1 className="text-[22px] font-bold tracking-tight">This link has expired</h1>
          <p className="text-[15px] leading-relaxed text-slate-600">Please ask {firm.name} to send you a new link on WhatsApp.</p>
          <a href={`tel:+${callable}`} className="mt-1 flex items-center gap-2 text-sm font-semibold text-brand">
            <Phone size={14} />
            {firm.phone}
          </a>
        </div>
      </div>
    )
  }

  // Everything is approved, so there is nothing left to upload.
  if (total > 0 && rc.docs.every((d) => d.status === 'approved' || d.status === 'na')) {
    return (
      <div className="min-h-full bg-canvas">
        {banner}
        <div className="mx-auto flex min-h-[80vh] max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_26px_rgba(11,122,107,0.3)]">
            <Check size={34} strokeWidth={2.8} />
          </span>
          <h1 className="text-[24px] font-bold tracking-tight">All done, {first}</h1>
          <p className="text-[15px] leading-relaxed text-slate-600">{firm.name} has approved all your documents. Thank you!</p>
        </div>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="min-h-full bg-canvas">
        {banner}
        <div className="mx-auto flex min-h-[80vh] max-w-[480px] flex-col items-center justify-center gap-5 px-6 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_26px_rgba(11,122,107,0.3)]">
            <Check size={34} strokeWidth={2.8} />
          </span>
          <div>
            <h1 className="text-[26px] font-bold tracking-tight">Thank you, {first}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{firm.name} will check your documents. If anything is missing or unclear, you will get a message on WhatsApp.</p>
          </div>
          {left > 0 && (
            <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
              {left} {left === 1 ? 'document is' : 'documents are'} still pending. You can open this link again until {fmtDate(expiresOn(request.due, graceDays))} to add {left === 1 ? 'it' : 'them'}.
            </p>
          )}
          <button type="button" onClick={() => setSent(false)} className="h-12 rounded-xl border border-line bg-white px-6 text-sm font-semibold">
            Back to documents
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-canvas">
      {banner}
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col bg-canvas">
        <header className="bg-gradient-to-br from-[#DDF3EC] via-[#E7F4F6] to-[#E6EEFC] px-5 pb-14 pt-5">
          <div className="flex items-center gap-3">
            <FirmLogo name={firm.name} logo={firm.logo} size={40} />
            <div className="min-w-0 flex-1 truncate text-[15px] font-bold">{firm.name}</div>
            <span className="shrink-0 rounded-md bg-white/80 px-2 py-1 text-[11px] font-semibold text-slate-600">Ref {request.ref}</span>
          </div>
          <p className="mt-6 text-sm font-medium text-slate-600">Hi {first}</p>
          <h1 className="mt-0.5 text-[26px] font-bold leading-tight tracking-tight">Documents for {request.title}</h1>
          <p className="mt-2 text-[15px] leading-snug text-slate-700">
            {firm.name} needs {total} {total === 1 ? 'document' : 'documents'} from you.
          </p>
        </header>

        <section className="relative z-10 -mt-9 mx-4 grid grid-cols-2 divide-x divide-line rounded-2xl border border-line bg-white shadow-[0_8px_24px_rgba(14,27,44,0.08)]">
          <div className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <CalendarDays size={14} />
              Send by
            </div>
            <div className="mt-1 text-2xl font-bold leading-none tracking-tight">{fmtDate(request.due)}</div>
            <div className={`mt-1.5 text-xs font-semibold ${dueTone}`}>{dueText}</div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <FileCheck2 size={14} />
              Sent
            </div>
            <div className="mt-1 text-2xl font-bold leading-none tracking-tight">
              {done}
              <span className="text-base font-semibold text-muted"> of {total}</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-1.5 rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </section>

        <main className="flex flex-1 flex-col gap-2.5 px-4 pb-36 pt-5">
          <p className="px-1 text-[13px] text-muted">Upload a clear photo or PDF for each document.</p>
          {docs.map((d) => {
            const upload = (
              <label className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-soft text-sm font-semibold text-brand-dark active:bg-[#D3EDE6]">
                <Upload size={16} />
                {d.status === 'rejected' ? 'Upload again' : 'Upload'}
                <input type="file" multiple className="sr-only" aria-label={`Upload ${d.name}`} onChange={(e) => pick(d, e.target.files)} />
              </label>
            )

            if (d.status === 'rejected')
              return (
                <div key={d.id} className="rounded-2xl border-[1.5px] border-[#F3C4BE] bg-white p-3.5">
                  <div className="text-[15px] font-semibold">{d.name}</div>
                  <p className="mt-1.5 rounded-lg bg-[#FDF1EF] px-3 py-2 text-[13px] leading-relaxed text-[#7A271A]">Please send again: {d.reason ?? 'the file could not be used'}</p>
                  <div className="mt-2.5 flex">{upload}</div>
                </div>
              )

            if (d.status === 'pending')
              return (
                <div key={d.id} className="rounded-2xl border border-line bg-white p-3.5">
                  <div className="text-[15px] font-semibold">{d.name}</div>
                  <div className="mt-2.5 flex gap-2">
                    {upload}
                    <button type="button" onClick={() => markNotApplicable(request.id, rc.clientId, d.id, true)} className="h-11 shrink-0 rounded-xl bg-canvas px-4 text-[13px] font-semibold text-slate-600">
                      I don't have it
                    </button>
                  </div>
                </div>
              )

            if (d.status === 'na')
              return (
                <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-muted">
                    <Clock size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-muted">{d.name}</div>
                    <div className="text-xs text-muted">Marked as not available</div>
                  </div>
                  <button type="button" onClick={() => markNotApplicable(request.id, rc.clientId, d.id, false)} className="rounded-lg px-3 py-2 text-[13px] font-semibold text-brand">
                    Undo
                  </button>
                </div>
              )

            // sent: waiting for the CA, or already approved
            return (
              <div key={d.id} className="rounded-2xl border border-line bg-white p-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
                    <Check size={17} strokeWidth={2.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">{d.name}</div>
                    <div className="text-xs font-semibold text-ok">{d.status === 'approved' ? 'Approved' : 'Received'}</div>
                  </div>
                </div>
                {d.status === 'to_review' && (
                  <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-canvas px-3 py-2">
                    <span className="min-w-0 flex-1 text-[13px] text-slate-600">
                      {[d.fileName, ...(d.moreFiles ?? [])].map((f) => (
                        <span key={f} className="block truncate">
                          {f}
                        </span>
                      ))}
                    </span>
                    {confirmId === d.id ? (
                      <>
                        <span className="text-xs font-semibold text-danger">Remove?</span>
                        <button
                          type="button"
                          onClick={() => {
                            clientRemove(request.id, rc.clientId, d.id)
                            setConfirmId(null)
                          }}
                          className="rounded-lg bg-danger px-3 py-1.5 text-[13px] font-semibold text-white"
                        >
                          Yes
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className="rounded-lg px-2 py-1.5 text-[13px] font-semibold text-slate-600">
                          No
                        </button>
                      </>
                    ) : (
                      <>
                        <label className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-brand hover:bg-white">
                          Add another
                          <input type="file" multiple className="sr-only" aria-label={`Add another file to ${d.name}`} onChange={(e) => addMore(d, e.target.files)} />
                        </label>
                        <label className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-brand hover:bg-white">
                          Replace
                          <input type="file" className="sr-only" aria-label={`Replace ${d.name}`} onChange={(e) => pick(d, e.target.files)} />
                        </label>
                        <button type="button" onClick={() => setConfirmId(d.id)} className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-danger hover:bg-white">
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <a href={`tel:+${callable}`} className="mt-2 flex items-center justify-center gap-2 text-[13px] text-muted">
            <Phone size={13} />
            Questions? Call {firm.phone}
          </a>
        </main>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white px-4 pb-4 pt-3">
          <div className="mx-auto max-w-[480px]">
            <button
              type="button"
              disabled={done === 0}
              onClick={() => setSent(true)}
              className="h-[52px] w-full rounded-2xl bg-brand text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)] disabled:opacity-40 disabled:shadow-none"
            >
              {left === 0 ? 'Submit' : `Done for now (${done} sent)`}
            </button>
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
              <Lock size={11} />
              Files save as you upload and are shared only with {firm.name}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
