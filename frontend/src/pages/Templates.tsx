import { ArrowLeft, BadgeCheck, Clock } from 'lucide-react'
import { useState } from 'react'
import Page from '../components/Page'
import { useSetup } from '../data/setup'
import WaText from '../components/WaText'
import { fillTemplate, sample, variables } from '../lib/template'

// Phase 1: read-only. Every message is approved by WhatsApp once, so firms use them as they are.
export default function Templates() {
  const { messageTemplates, ownNumber, templateState } = useSetup()
  // A message can go from your number only after WhatsApp has approved it. The sample firm connected long ago, so all are approved; a number just connected has none yet.
  const isApproved = (id: string) => templateState(id) === 'approved'
  const approvedCount = messageTemplates.filter((m) => isApproved(m.id)).length
  // On a phone you see the list of messages, or the one you opened.
  const [detail, setDetail] = useState(false)
  const [selectedId, setSelectedId] = useState(messageTemplates[0].id)
  const selected = messageTemplates.find((m) => m.id === selectedId) ?? messageTemplates[0]

  // Which variables this message fills in, in the order they appear.
  const body = selected.text
  const used = variables.filter((v) => body.includes(`{${v.key}}`))

  return (
    <Page
      fixed
      header={
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold tracking-tight">Message templates</h1>
            <p className="mt-0.5 text-sm text-muted">{messageTemplates.length} ready messages. {!ownNumber ? 'Connect your WhatsApp and WhatsApp will review them.' : approvedCount === messageTemplates.length ? 'All approved by WhatsApp.' : approvedCount === 0 ? 'Waiting for WhatsApp to approve them.' : `${approvedCount} approved by WhatsApp, the rest are waiting.`}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 max-md:flex-col max-md:items-stretch">
          </div>
        </div>
      }
    >
      <div className="grid h-full min-h-0 grid-cols-1 gap-5 md:grid-cols-12">
        <div className={`flex min-h-0 flex-col gap-2 overflow-y-auto pr-1 md:col-span-3 ${detail ? 'max-md:hidden' : ''}`}>
          {[...new Set(messageTemplates.map((m) => m.group))].map((g) => (
            <div key={g} className="flex flex-col gap-1.5">
              <div className="px-1 pt-1 text-[12px] font-bold uppercase tracking-widest text-faint">{g}</div>
              {messageTemplates
                .filter((m) => m.group === g)
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(m.id)
                      setDetail(true)
                    }}
                    className={`rounded-xl px-3.5 py-2.5 text-left ${selected.id === m.id ? 'border-2 border-brand bg-[#EEF8F5]' : 'border border-line bg-white hover:bg-canvas'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`text-sm font-semibold ${selected.id === m.id ? 'text-brand-dark' : ''}`}>{m.name}</div>
                      {isApproved(m.id) ? <BadgeCheck size={17} className="mt-0.5 shrink-0 text-ok" aria-label="Approved by WhatsApp" /> : <Clock size={17} className="mt-0.5 shrink-0 text-warn" aria-label="Waiting for approval" />}
                    </div>
                    <div className="truncate text-xs text-muted">{m.hint}</div>
                  </button>
                ))}
            </div>
          ))}
        </div>

        <div className={`grid min-h-0 grid-cols-1 content-start gap-5 overflow-y-auto md:col-span-9 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] ${detail ? '' : 'max-md:hidden'}`}>
          <button type="button" onClick={() => setDetail(false)} className="flex items-center gap-1.5 text-sm font-semibold text-brand md:hidden">
            <ArrowLeft size={16} />
            All messages
          </button>
          <section className="rounded-[18px] border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight">{selected.name}</h2>
              {isApproved(selected.id) ? (
                <span className="flex items-center gap-1.5 rounded-md bg-ok-soft px-2 py-1 text-[12px] font-semibold uppercase tracking-wide text-ok">
                  <BadgeCheck size={13} /> Approved
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-md bg-warn-soft px-2 py-1 text-[12px] font-semibold uppercase tracking-wide text-warn">
                  <Clock size={13} /> {ownNumber ? 'Pending' : 'Not connected'}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">{selected.hint}.</p>

            <div className="mt-4 rounded-2xl bg-[#EFEAE2] bg-[radial-gradient(rgba(17,27,33,0.045)_1.2px,transparent_1.2px)] p-4 [background-size:22px_22px]">
              <div className="ml-auto w-fit max-w-[94%] rounded-[10px] rounded-tr-none bg-[#D9FDD3] px-3 py-2 text-[15px] leading-snug shadow-[0_1px_1px_rgba(17,27,33,0.13)]">
                <WaText text={fillTemplate(body)} />
                <div className="pt-0.5 text-right text-[12px] text-slate-500">09:10</div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">Sample details are shown here. The real name, dates and link fill in when you send.</p>

          </section>

          <section className="rounded-[18px] border border-line bg-white p-5">
            <h2 className="text-base font-bold tracking-tight">Filled in automatically</h2>
            <p className="mt-1 text-sm text-muted">You do not type these. We add them for each client.</p>
            <dl className="mt-3 flex flex-col">
              {used.map((v) => (
                <div key={v.key} className="flex items-start justify-between gap-4 border-b border-line py-2.5 text-sm last:border-b-0">
                  <dt className="font-medium">
                    {v.label}
                    <span className="ml-2 rounded-md bg-canvas px-1.5 py-0.5 text-xs text-muted">{`{${v.key}}`}</span>
                  </dt>
                  <dd className="max-w-[45%] whitespace-pre-line text-right text-slate-600">{sample[v.key].replace(/\*/g, '')}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 rounded-xl bg-canvas p-3.5 text-[13px] leading-relaxed text-slate-600">
              <b className="text-ink">Why can't I edit these?</b>
              <br />
              WhatsApp only lets us send business messages that it has approved. After you connect your number, WhatsApp reviews these messages. You can see the status of each one here and in Settings, under WhatsApp.
            </div>
          </section>
        </div>
      </div>
    </Page>
  )
}
