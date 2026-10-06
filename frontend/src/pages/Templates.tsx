import { ArrowLeft, BadgeCheck } from 'lucide-react'
import { useState } from 'react'
import Page from '../components/Page'
import { useSetup } from '../data/setup'
import WaText from '../components/WaText'
import { fillTemplate, sample, variables } from '../lib/template'
import { SHARED_NUMBER_NAME } from '../lib/brand'

// Phase 1: read-only. Every message is approved by WhatsApp once, so firms use them as they are.
export default function Templates() {
  const { messageTemplates, ownNumber } = useSetup()
  // Which number the messages are for: your own WhatsApp ("we") or the shared number (names the firm).
  const [voice, setVoice] = useState<'own' | 'kdk'>(ownNumber ? 'own' : 'kdk')
  // On a phone you see the list of messages, or the one you opened.
  const [detail, setDetail] = useState(false)
  const [selectedId, setSelectedId] = useState(messageTemplates[0].id)
  const selected = messageTemplates.find((m) => m.id === selectedId) ?? messageTemplates[0]

  // Which variables this message fills in, in the order they appear.
  const body = voice === 'kdk' ? selected.onBehalf : selected.text
  const used = variables.filter((v) => body.includes(`{${v.key}}`))

  return (
    <Page
      fixed
      header={
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold tracking-tight">Message templates</h1>
            <p className="mt-0.5 text-sm text-muted">{messageTemplates.length} ready messages, already approved by WhatsApp.</p>
          </div>
          <div className="flex shrink-0 rounded-xl bg-[#E9EEF5] p-1 text-[13px] font-semibold text-slate-600 max-md:w-full" role="group" aria-label="Which number the messages are sent from">
            <button type="button" onClick={() => setVoice('own')} className={`rounded-[9px] px-4 py-1.5 max-md:flex-1 ${voice === 'own' ? 'bg-white text-ink shadow-sm' : ''}`}>
              From your WhatsApp
            </button>
            <button type="button" onClick={() => setVoice('kdk')} className={`rounded-[9px] px-4 py-1.5 max-md:flex-1 ${voice === 'kdk' ? 'bg-white text-ink shadow-sm' : ''}`}>
              From {SHARED_NUMBER_NAME} number
            </button>
          </div>
        </div>
      }
    >
      <div className="grid h-full min-h-0 grid-cols-1 gap-5 md:grid-cols-12">
        <div className={`flex min-h-0 flex-col gap-2 overflow-y-auto pr-1 md:col-span-3 ${detail ? 'max-md:hidden' : ''}`}>
          {[...new Set(messageTemplates.map((m) => m.group))].map((g) => (
            <div key={g} className="flex flex-col gap-1.5">
              <div className="px-1 pt-1 text-[11px] font-bold uppercase tracking-widest text-faint">{g}</div>
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
                      <BadgeCheck size={17} className="mt-0.5 shrink-0 text-ok" aria-label="Approved by WhatsApp" />
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
              <span className="flex items-center gap-1.5 rounded-md bg-ok-soft px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ok">
                <BadgeCheck size={13} /> Approved
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{selected.hint}.</p>

            <div className="mt-4 rounded-2xl bg-[#EFEAE2] bg-[radial-gradient(rgba(17,27,33,0.045)_1.2px,transparent_1.2px)] p-4 [background-size:22px_22px]">
              <div className="ml-auto w-fit max-w-[94%] rounded-[10px] rounded-tr-none bg-[#D9FDD3] px-3 py-2 text-[14.5px] leading-snug shadow-[0_1px_1px_rgba(17,27,33,0.13)]">
                <WaText text={fillTemplate(body)} />
                <div className="pt-0.5 text-right text-[11px] text-slate-500">09:10</div>
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
                  <dd className="max-w-[45%] whitespace-pre-line text-right text-slate-600">{sample[v.key]}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 rounded-xl bg-canvas p-3.5 text-[13px] leading-relaxed text-slate-600">
              <b className="text-ink">Why can't I edit these?</b>
              <br />
              WhatsApp only lets us send business messages that it has approved. We have already got these approved for you, so you never have to wait.
            </div>
          </section>
        </div>
      </div>
    </Page>
  )
}
