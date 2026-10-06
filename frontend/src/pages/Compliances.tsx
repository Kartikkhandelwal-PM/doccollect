import { ArrowLeft, Check, ListChecks, Plus, Search, Trash2 } from 'lucide-react'
import Page from '../components/Page'
import { useState } from 'react'
import { useSetup } from '../data/setup'

export default function Compliances() {
  const { compliances, documents, groups, addCompliance, updateCompliance, removeCompliance } = useSetup()
  // On a phone you see the list, or the one you opened.
  const [detail, setDetail] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(compliances[0]?.id ?? '')
  const [confirm, setConfirm] = useState(false)
  const [query, setQuery] = useState('')

  const selected = compliances.find((c) => c.id === selectedId) ?? compliances[0]

  const toggle = (docId: string) => {
    if (!selected) return
    updateCompliance(selected.id, {
      docIds: selected.docIds.includes(docId) ? selected.docIds.filter((x) => x !== docId) : [...selected.docIds, docId],
    })
  }

  return (
    <Page
      header={
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">Compliances</h1>
          <p className="mt-0.5 text-sm text-muted">Saved checklists. Pick one when you make a request and you will not have to choose documents again.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedId(addCompliance())
            setConfirm(false)
            setDetail(true)
          }}
          className="flex h-11 shrink-0 items-center whitespace-nowrap gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)]"
        >
          <Plus size={16} strokeWidth={2.3} />
          New compliance
        </button>
      </div>
      }
      fixed
    >
      <div className="grid h-full min-h-0 grid-cols-1 gap-5 md:grid-cols-12">
        <div className={`flex min-h-0 flex-col gap-2.5 overflow-y-auto pr-1 md:col-span-4 ${detail ? 'max-md:hidden' : ''}`}>
          <label className="sticky top-0 z-10 flex h-11 shrink-0 items-center gap-2.5 rounded-xl border border-line bg-white px-4 text-sm text-muted">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${compliances.length} compliances`} className="w-full bg-transparent outline-none placeholder:text-muted" />
          </label>
          {compliances.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedId(c.id)
                setConfirm(false)
                setDetail(true)
              }}
              className={`flex items-center gap-3.5 rounded-2xl p-4 text-left ${selected?.id === c.id ? 'border-2 border-brand bg-[#EEF8F5]' : 'border border-line bg-white hover:bg-canvas'}`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-dark shadow-sm">
                <ListChecks size={21} />
              </span>
              <span>
                <span className={`block text-[15px] font-semibold ${selected?.id === c.id ? 'text-brand-dark' : ''}`}>{c.name}</span>
                <span className="text-[13px] text-muted">{c.docIds.length} documents</span>
              </span>
            </button>
          ))}
          {compliances.length === 0 && <p className="text-sm text-muted">No compliance yet. Create your first one.</p>}
          {compliances.length > 0 && query && compliances.every((c) => !c.name.toLowerCase().includes(query.toLowerCase())) && <p className="px-1 text-sm text-muted">No compliance matches.</p>}
        </div>

        {selected && (
          <section className={`min-h-0 overflow-y-auto rounded-[18px] border border-line bg-white p-4 md:col-span-8 md:p-6 ${detail ? '' : 'max-md:hidden'}`}>
            <div className="sticky -top-4 z-10 -mx-4 -mt-4 flex flex-wrap items-end gap-4 border-b border-line bg-white px-4 pb-4 pt-4 md:-top-6 md:-mx-6 md:-mt-6 md:flex-nowrap md:px-6 md:pt-6">
              <button type="button" onClick={() => setDetail(false)} className="flex basis-full items-center gap-1.5 text-sm font-semibold text-brand md:hidden">
                <ArrowLeft size={16} />
                All compliances
              </button>
              <label className="flex-1 text-[13px] font-semibold text-muted">
                Name
                <input
                  value={selected.name}
                  onChange={(e) => updateCompliance(selected.id, { name: e.target.value })}
                  className="mt-1 block h-11 w-full rounded-xl border border-line px-3.5 text-[16px] font-semibold text-ink outline-none focus:border-brand"
                />
              </label>
              {confirm ? (
                <div className="flex items-center gap-2 pb-1.5 text-[13px] font-semibold">
                  <span className="text-danger">Delete this compliance?</span>
                  <button
                    type="button"
                    onClick={() => {
                      removeCompliance(selected.id)
                      setConfirm(false)
                      setSelectedId('')
                      setDetail(false)
                    }}
                    className="rounded-lg bg-danger px-3 py-1.5 text-white"
                  >
                    Yes, delete
                  </button>
                  <button type="button" onClick={() => setConfirm(false)} className="rounded-lg border border-line px-3 py-1.5">
                    Keep
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirm(true)} className="flex h-11 shrink-0 items-center whitespace-nowrap gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-danger hover:bg-danger-soft">
                  <Trash2 size={15} />
                  Delete
                </button>
              )}
            </div>

            <div className="mt-5 flex items-baseline justify-between">
              <h2 className="text-base font-bold tracking-tight">
                Documents <span className="ml-1.5 font-medium text-muted">{selected.docIds.length} selected</span>
              </h2>
              <span className="text-xs text-muted">Changes save automatically</span>
            </div>
            {selected.docIds.length > 0 && (
              <div className="mt-3 rounded-xl border border-[#CFE6DE] bg-[#F1F9F6] p-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-brand-dark">In this compliance ({selected.docIds.length})</div>
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {selected.docIds.map((id) => (
                    <span key={id} className="flex items-center gap-1.5 rounded-full bg-white py-1 pl-3 pr-1.5 text-[13px] font-medium shadow-sm">
                      {documents.find((d) => d.id === id)?.name ?? id}
                      <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${documents.find((d) => d.id === id)?.name ?? id}`} className="flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 columns-2 gap-x-8">
              {groups.map((g) => (
                <div key={g.title} className="mb-5 break-inside-avoid">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-faint">{g.title}</div>
                  <div className="flex flex-col gap-1.5">
                    {g.docs.map((d) => {
                      const on = selected.docIds.includes(d.id)
                      return (
                        <button
                          key={d.id}
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => toggle(d.id)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${on ? 'bg-[#EEF8F5]' : 'border border-line hover:bg-canvas'}`}
                        >
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${on ? 'bg-brand text-white' : 'border-[1.5px] border-slate-300 bg-white'}`}>
                            {on && <Check size={13} strokeWidth={3.4} />}
                          </span>
                          {d.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Page>
  )
}
