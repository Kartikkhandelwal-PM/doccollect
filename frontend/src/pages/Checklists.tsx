import { ArrowLeft, Check, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react'
import Page from '../components/Page'
import { useState } from 'react'
import { useSetup } from '../data/setup'
import type { Service } from '../data/types'
import { serviceColor } from '../lib/status'

const kindName: Record<Service, string> = { ITR: 'Income tax', GST: 'GST', TDS: 'TDS' }
// Where a document typed in here goes in the Documents list, by what the checklist is used for.
// A soft colour behind the title, by what the checklist is used for.
const tint: Record<Service, string> = { ITR: 'from-violet-50 to-white', GST: 'from-blue-50 to-white', TDS: 'from-amber-50 to-white' }
const groupOfKind: Record<Service, string> = { ITR: 'Income', GST: 'GST', TDS: 'TDS' }

function Box({ on }: { on: boolean }) {
  return (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${on ? 'bg-brand text-white' : 'border-[1.5px] border-slate-300 bg-white'}`} aria-hidden="true">
      {on && <Check size={13} strokeWidth={3.4} />}
    </span>
  )
}

export default function Checklists() {
  const { compliances, documents, groups, addCompliance, updateCompliance, removeCompliance, addDocument } = useSetup()
  // On a phone you see the list, or the one you opened.
  const [detail, setDetail] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(compliances[0]?.id ?? '')
  const [confirm, setConfirm] = useState(false)
  const [menu, setMenu] = useState(false)
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<'All' | Service>('All')
  const [docQuery, setDocQuery] = useState('')

  const selected = compliances.find((c) => c.id === selectedId) ?? compliances[0]
  const nameOf = (id: string) => documents.find((d) => d.id === id)?.name ?? id

  const toggle = (docId: string) => {
    if (!selected) return
    updateCompliance(selected.id, {
      docIds: selected.docIds.includes(docId) ? selected.docIds.filter((x) => x !== docId) : [...selected.docIds, docId],
    })
  }

  const q = query.trim().toLowerCase()
  const shown = compliances.filter((c) => (kindFilter === 'All' || c.kind === kindFilter) && c.name.toLowerCase().includes(q))
  const count = (k: 'All' | Service) => (k === 'All' ? compliances.length : compliances.filter((c) => c.kind === k).length)

  const dq = docQuery.trim().toLowerCase()
  const shownGroups = groups
    .map((g) => ({ ...g, docs: g.docs.filter((d) => dq === '' || d.name.toLowerCase().includes(dq)) }))
    .filter((g) => g.docs.length > 0)
    // The group of this checklist's kind (GST or TDS) comes first.
    .sort((a, b) => Number(b.title === selected?.kind) - Number(a.title === selected?.kind))
  const canAddTyped = dq !== '' && !documents.some((d) => d.name.toLowerCase() === dq)
  const addTyped = () => {
    if (!selected || !canAddTyped) return
    const id = addDocument(docQuery.trim(), groupOfKind[selected.kind])
    updateCompliance(selected.id, { docIds: [...selected.docIds, id] })
    setDocQuery('')
  }

  return (
    <Page
      header={
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight">Checklists</h1>
            <p className="mt-0.5 text-sm text-muted">Saved lists of documents. Pick one when you make a request and you will not have to choose documents again.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedId(addCompliance())
              setConfirm(false)
              setDetail(true)
              setKindFilter('All')
              setQuery('')
            }}
            className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)]"
          >
            <Plus size={16} strokeWidth={2.3} />
            New checklist
          </button>
        </div>
      }
      fixed
    >
      <div className="grid h-full min-h-0 grid-cols-1 gap-5 md:grid-cols-[360px_1fr]">
        {/* ---- The list of checklists ---- */}
        <div className={`flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-line bg-white ${detail ? 'max-md:hidden' : ''}`}>
          <div className="shrink-0 border-b border-line p-3">
            <label className="flex h-10 items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 text-sm text-muted focus-within:border-brand">
              <Search size={15} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${compliances.length} checklists`} className="w-full bg-transparent outline-none placeholder:text-muted" />
            </label>
            <div className="mt-2.5 flex w-full gap-0.5 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Income tax, GST or TDS">
              {(['All', 'ITR', 'GST', 'TDS'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={kindFilter === k}
                  onClick={() => setKindFilter(k)}
                  className={`flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition-colors ${kindFilter === k ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-600 hover:text-ink'}`}
                >
                  {k === 'All' ? 'All' : k === 'ITR' ? 'Income tax' : k}
                  <span className={kindFilter === k ? 'text-brand-dark/70' : 'text-faint'}>{count(k)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {shown.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedId(c.id)
                  setConfirm(false)
                  setDocQuery('')
                  setDetail(true)
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${selected?.id === c.id ? 'bg-[#EEF8F5] ring-1 ring-inset ring-brand' : 'hover:bg-canvas'}`}
              >
                <span className={`w-9 shrink-0 rounded-md bg-slate-100 py-0.5 text-center text-[10.5px] font-bold ${serviceColor[c.kind]}`}>{c.kind}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[14px] ${selected?.id === c.id ? 'font-bold text-brand-dark' : 'font-semibold'}`}>{c.name}</span>
                  <span className="block text-xs text-muted">{c.docIds.length} documents</span>
                </span>
              </button>
            ))}
            {compliances.length === 0 && <p className="p-3 text-sm text-muted">No checklist yet. Create your first one.</p>}
            {compliances.length > 0 && shown.length === 0 && <p className="p-3 text-sm text-muted">No checklist matches.</p>}
          </div>
        </div>

        {/* ---- The chosen checklist ---- */}
        {selected && (
          <section className={`flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-line bg-white ${detail ? '' : 'max-md:hidden'}`}>
            <div className={`flex shrink-0 items-start gap-4 border-b border-line bg-gradient-to-r px-6 py-5 ${tint[selected.kind]}`}>
              <button type="button" onClick={() => setDetail(false)} className="flex items-center gap-1.5 text-sm font-semibold text-brand md:hidden">
                <ArrowLeft size={16} />
                All checklists
              </button>
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[14px] font-extrabold shadow-sm ring-1 ring-black/5 ${serviceColor[selected.kind]}`}>{selected.kind}</span>
              <div className="min-w-0 flex-1 self-center">
                <h2 className="truncate text-[24px] font-bold tracking-tight text-ink">{selected.name || 'Untitled checklist'}</h2>
                <p className="text-[13px] text-slate-600">
                  {kindName[selected.kind]} · {selected.docIds.length} {selected.docIds.length === 1 ? 'document' : 'documents'}
                </p>
              </div>
              {/* Delete is out of the way: behind a menu, then a clear question. */}
              <div className="relative shrink-0">
                <button type="button" aria-label="More" aria-haspopup="menu" onClick={() => setMenu((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-muted hover:bg-canvas">
                  <MoreHorizontal size={18} />
                </button>
                {menu && (
                  <>
                    <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
                    <div role="menu" className="absolute right-0 z-20 mt-1.5 w-72 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
                      <div className="flex flex-col gap-3 p-4">
                        <label className="text-[12px] font-bold uppercase tracking-widest text-faint">
                          Name
                          <input
                            value={selected.name}
                            onChange={(e) => updateCompliance(selected.id, { name: e.target.value })}
                            autoFocus
                            className="mt-1.5 block h-10 w-full rounded-lg border border-line px-3 text-sm font-semibold normal-case tracking-normal text-ink outline-none focus:border-brand"
                          />
                        </label>
                        <label className="text-[12px] font-bold uppercase tracking-widest text-faint">
                          Used for
                          <select
                            value={selected.kind}
                            onChange={(e) => updateCompliance(selected.id, { kind: e.target.value as Service })}
                            className="mt-1.5 block h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-semibold normal-case tracking-normal text-ink outline-none focus:border-brand"
                          >
                            {(['ITR', 'GST', 'TDS'] as const).map((k) => (
                              <option key={k} value={k}>
                                {kindName[k]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="border-t border-line py-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenu(false)
                            setConfirm(true)
                          }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
                        >
                          <Trash2 size={15} />
                          Delete checklist
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Two columns: every document on the left (tick to add), what is in the checklist on the right. Each scrolls on its own. */}
            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
              <div className="flex min-h-0 flex-col border-r border-line">
                <div className="shrink-0 px-5 pb-3 pt-4">
                  <h2 className="text-[13px] font-bold">All documents</h2>
                  <p className="text-xs text-muted">Tick to add to this checklist.</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm text-muted focus-within:border-brand">
                      <Search size={15} />
                      <input
                        value={docQuery}
                        onChange={(e) => setDocQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTyped()}
                        placeholder="Search, or type a new one"
                        className="w-full bg-transparent outline-none placeholder:text-muted"
                      />
                    </label>
                    {canAddTyped && (
                      <button type="button" onClick={addTyped} className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-dark">
                        <Plus size={14} /> Add
                      </button>
                    )}
                  </div>
                  {canAddTyped && <p className="mt-1.5 text-xs text-muted">Add "{docQuery.trim()}" as a new document in this checklist.</p>}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                  {shownGroups.length === 0 && <p className="px-2 py-4 text-sm text-muted">No document matches.</p>}
                  {shownGroups.map((g) => (
                    <div key={g.title} className="mb-4">
                      <div className="mb-1 px-2 text-[11px] font-bold uppercase tracking-widest text-faint">{g.title}</div>
                      {g.docs.map((d) => {
                        const on = selected.docIds.includes(d.id)
                        return (
                          <button
                            key={d.id}
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => toggle(d.id)}
                            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] ${on ? 'bg-[#EEF8F5] font-semibold' : 'font-medium hover:bg-canvas'}`}
                          >
                            <Box on={on} />
                            {d.name}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex min-h-0 flex-col bg-[#FAFCFB]">
                <div className="flex shrink-0 items-start justify-between px-5 pb-3 pt-4">
                  <div>
                    <h2 className="text-[13px] font-bold">
                      In this checklist <span className="ml-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-dark">{selected.docIds.length}</span>
                    </h2>
                    <p className="text-xs text-muted">What clients are asked for.</p>
                  </div>
                  {selected.docIds.length > 0 && (
                    <button type="button" onClick={() => updateCompliance(selected.id, { docIds: [] })} className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-muted hover:text-danger">
                      Clear all
                    </button>
                  )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                  {selected.docIds.length === 0 && (
                    <div className="mx-2 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-muted">Nothing here yet. Tick documents on the left.</div>
                  )}
                  {selected.docIds.map((id, i) => (
                    <div key={id} className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium hover:bg-white">
                      <span className="w-5 shrink-0 text-right text-xs text-faint">{i + 1}</span>
                      <span className="min-w-0 flex-1">{nameOf(id)}</span>
                      <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${nameOf(id)}`} className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-danger-soft hover:text-danger">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
      {confirm && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Delete checklist" onClick={() => setConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-bold">Delete "{selected.name}"?</div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">This removes the saved checklist. Requests you already sent are not changed, and your documents stay in the Documents list.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirm(false)} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold">
                Keep it
              </button>
              <button
                type="button"
                onClick={() => {
                  removeCompliance(selected.id)
                  setConfirm(false)
                  setSelectedId('')
                  setDetail(false)
                }}
                className="h-10 rounded-xl bg-danger px-4 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
