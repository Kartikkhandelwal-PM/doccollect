import { Archive, ArrowLeft, Check, FileText, Files, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import Page from '../components/Page'
import { useEffect, useState } from 'react'
import Toast from '../components/Toast'
import { archiveFolderId, buildMaster } from '../data/master'
import { useMasterStore } from '../data/masterStore'
import { useRequests } from '../data/requests'
import FilterSelect from '../components/FilterSelect'
import EmptyState from '../components/EmptyState'
import { useSetup } from '../data/setup'

const ALL = '__all'

export default function Documents() {
  const { documents, categories, compliances, addDocument, setDocumentMultiple, setDocumentOnce, setDocumentOptional, renameDocument, moveDocument, removeDocument, addCategory, renameCategory, removeCategory } = useSetup()

  const [selected, setSelected] = useState<string>(categories[0] ?? ALL)
  // On a phone you see the categories, or the documents of one category.
  const [showDocs, setShowDocs] = useState(false)
  const [query, setQuery] = useState('')
  // A document is made or changed in a small window: id null means a new one.
  const [form, setForm] = useState<{ id: string | null; name: string; group: string; multiple: boolean; once: boolean; optional: boolean; sure?: boolean } | null>(null)
  // The row menu is drawn over the page (fixed), so the list can never cut it off. It opens upward near the bottom of the screen.
  const [rowMenu, setRowMenu] = useState<{ id: string; top: number; right: number } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const { requests, reassignDoc } = useRequests()
  const { fileEdits, editFile } = useMasterStore()
  const [delChoice, setDelChoice] = useState<'move' | 'archive'>('archive')
  const [delTarget, setDelTarget] = useState('')
  const [delQuery, setDelQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    setDelChoice('archive')
    setDelTarget('')
    setDelQuery('')
  }, [confirmId])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  // What a document is used by: the files in Document Master, the requests that asked for it, and the checklists it is in.
  const usage = (id: string) => ({
    files: buildMaster(requests).filter((f) => (fileEdits[f.id]?.docId ?? f.docId) === id && !fileEdits[f.id]?.deleted),
    requests: requests.filter((r) => r.clients.some((rc) => rc.docs.some((x) => x.id === id))).length,
    lists: compliances.filter((c) => c.docIds.includes(id)).length,
  })

  const [addingCat, setAddingCat] = useState(false)
  const [catText, setCatText] = useState('')
  const [catError, setCatError] = useState('')
  const [renamingCat, setRenamingCat] = useState<string | null>(null)
  const [confirmCat, setConfirmCat] = useState<string | null>(null)

  const usedBy = (id: string) => compliances.filter((c) => c.docIds.includes(id))
  const usedIn = (id: string) => usedBy(id).length
  const namesOf = (id: string) => {
    const list = usedBy(id).map((c) => c.name)
    return list.length > 4 ? `${list.slice(0, 4).join(', ')} and ${list.length - 4} more` : list.join(', ')
  }
  const countOf = (c: string) => documents.filter((d) => d.group === c).length

  const searching = query.trim() !== ''
  const current = selected === ALL || !categories.includes(selected) ? ALL : selected
  const list = documents.filter((d) => (searching ? d.name.toLowerCase().includes(query.toLowerCase()) : current === ALL || d.group === current))
  const showCategoryTag = searching || current === ALL

  const startNew = () => setForm({ id: null, name: '', group: '', multiple: false, once: false, optional: false })
  const saveForm = () => {
    if (!form) return
    const n = form.name.trim()
    if (!n || !form.group) return
    // A document that sits in checklists is renamed there too, so the CA is asked once.
    const was = form.id ? documents.find((d) => d.id === form.id) : undefined
    if (was && n !== was.name && (usedIn(was.id) > 0 || usage(was.id).files.length > 0 || usage(was.id).requests > 0) && !form.sure) return setForm({ ...form, sure: true })
    if (form.id === null) {
      addDocument(n, form.group, form.multiple, form.once, form.optional)
    } else {
      renameDocument(form.id, n)
      setDocumentMultiple(form.id, form.multiple)
      setDocumentOnce(form.id, form.once)
      setDocumentOptional(form.id, form.optional)
      const was = documents.find((d) => d.id === form.id)
      if (was && was.group !== form.group) moveDocument(form.id, form.group)
    }
    setForm(null)
  }

  const submitCategory = () => {
    const n = catText.trim()
    if (!n) return setCatError('Give it a name.')
    if (categories.some((c) => c.toLowerCase() === n.toLowerCase() && c !== renamingCat)) return setCatError('This category already exists.')
    if (renamingCat) {
      renameCategory(renamingCat, n)
      if (selected === renamingCat) setSelected(n)
    } else {
      addCategory(n)
      setSelected(n)
    }
    setAddingCat(false)
    setRenamingCat(null)
    setCatText('')
    setCatError('')
  }

  const startCategoryForm = (rename: string | null) => {
    setRenamingCat(rename)
    setCatText(rename ?? '')
    setCatError('')
    setAddingCat(true)
  }

  return (
    <Page
      header={
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight">Documents</h1>
            <p className="mt-0.5 text-sm text-muted">
              Every document you ask for. {documents.length} documents in {categories.length} categories.
            </p>
          </div>
          <button type="button" onClick={startNew} className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)]">
            <Plus size={16} strokeWidth={2.3} />
            New document
          </button>
        </div>
      }
      fixed
    >
      <div className="grid h-full min-h-0 grid-cols-1 gap-5 md:grid-cols-[300px_1fr]">
        {/* Categories */}
        <aside className={`flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-line bg-white ${showDocs || searching ? 'max-md:hidden' : ''}`}>
          <div className="shrink-0 px-5 pb-1 pt-4 text-[12px] font-bold uppercase tracking-widest text-faint">Categories</div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          <button
            type="button"
            onClick={() => {
              setSelected(ALL)
              setQuery('')
              setShowDocs(true)
            }}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${current === ALL && !searching ? 'bg-brand-soft text-brand-dark' : 'hover:bg-canvas'}`}
          >
            All documents
            <span className="text-xs font-medium text-muted">{documents.length}</span>
          </button>

          {categories.map((c) => (
            <div key={c} className="group relative">
              {confirmCat === c ? (
                <div className="my-1 rounded-xl bg-danger-soft p-3 text-[13px]">
                  <div className="font-semibold text-danger">Delete “{c}”?</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        removeCategory(c)
                        if (selected === c) setSelected(ALL)
                        setConfirmCat(null)
                      }}
                      className="rounded-lg bg-danger px-3 py-1.5 font-semibold text-white"
                    >
                      Yes, delete
                    </button>
                    <button type="button" onClick={() => setConfirmCat(null)} className="rounded-lg bg-white px-3 py-1.5 font-semibold">
                      Keep
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(c)
                      setQuery('')
                      setShowDocs(true)
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${current === c && !searching ? 'bg-brand-soft text-brand-dark' : 'hover:bg-canvas'}`}
                  >
                    <span className="truncate pr-14">{c}</span>
                    <span className="text-xs font-medium text-muted">{countOf(c)}</span>
                  </button>
                  <div className="absolute right-9 top-1/2 hidden -translate-y-1/2 gap-0.5 group-focus-within:flex group-hover:flex">
                    <button type="button" aria-label={`Rename ${c}`} onClick={() => startCategoryForm(c)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-white hover:text-ink">
                      <Pencil size={13} />
                    </button>
                    {countOf(c) === 0 && (
                      <button type="button" aria-label={`Delete ${c}`} onClick={() => setConfirmCat(c)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-white hover:text-danger">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          </div>
          <div className="shrink-0 border-t border-line p-3">
            <button type="button" onClick={() => startCategoryForm(null)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-brand hover:bg-canvas">
              <Plus size={15} strokeWidth={2.4} />
              New category
            </button>
          </div>
        </aside>

        {/* Documents */}
        <section className={`flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-line bg-white ${showDocs || searching ? '' : 'max-md:hidden'}`}>
          <div className="shrink-0 border-b border-line px-6 py-4">
            <button type="button" onClick={() => { setShowDocs(false); setQuery('') }} className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand md:hidden">
              <ArrowLeft size={16} />
              All categories
            </button>
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold">
                  {searching ? `Results for “${query.trim()}”` : current === ALL ? 'All documents' : current}
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{list.length}</span>
                </h2>
              </div>
              <label className="flex h-10 w-72 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm text-muted focus-within:border-brand">
                <Search size={15} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all documents" className="w-full bg-transparent outline-none placeholder:text-muted" />
                {searching && (
                  <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="text-muted hover:text-ink">
                    <X size={15} />
                  </button>
                )}
              </label>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {showCategoryTag && list.length > 0 && (
              <div className="sticky top-0 z-[1] grid grid-cols-[1fr_180px_150px_48px] gap-4 border-b border-line bg-slate-50 px-6 py-2 text-[12px] font-bold uppercase tracking-wider text-faint max-lg:hidden">
                <span>Document</span>
                <span>Category</span>
                <span>Used in</span>
                <span />
              </div>
            )}
            {list.length === 0 && (
              <EmptyState art={searching ? 'search' : 'files'} title={searching ? 'No document matches' : 'No documents here yet'} text={searching ? 'Try another word, or look in All documents.' : 'A document is one thing you ask a client for, like a PAN card or a bank statement.'}>
                {!searching && (
                  <button type="button" onClick={startNew} className="flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white">
                    <Plus size={16} /> New document
                  </button>
                )}
              </EmptyState>
            )}

            {list.map((d) => {
              const n = usedIn(d.id)
              return (
                <div key={d.id} className={`group grid items-center gap-4 border-b border-line px-6 py-3 last:border-b-0 hover:bg-slate-50/70 ${showCategoryTag ? 'lg:grid-cols-[1fr_180px_150px_48px]' : 'lg:grid-cols-[1fr_150px_48px]'} grid-cols-[1fr_48px]`}>
                  <div className="flex min-w-0 items-center gap-3">
                    {/* The icon says how many files it takes: one page, or a stack of pages. */}
                    <span title={d.multiple ? 'Many files allowed' : 'One file'} aria-label={d.multiple ? 'Many files allowed' : 'One file'} role="img" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${d.multiple ? 'bg-brand-soft text-brand-dark' : 'bg-canvas text-muted'}`}>
                      {d.multiple ? <Files size={17} /> : <FileText size={17} />}
                    </span>
                    <span className="truncate text-[15px] font-semibold">{d.name}</span>
                    {/* Only what is not the usual case is written, so a plain document has no tags. */}
                    <span className="flex shrink-0 items-center gap-1.5">
                      {d.optional && <span title="Client can skip it. The request can finish without it." className="rounded-md border border-dashed border-[#E3B25C] bg-[#FEF6E4] px-1.5 py-0.5 text-[12px] font-semibold text-[#8A4B00]">Optional</span>}
                      {d.once && <span title="Asked one time only, not every year." className="rounded-md bg-[#E8F1FD] px-1.5 py-0.5 text-[12px] font-semibold text-[#174E9C]">One time</span>}
                    </span>
                  </div>
                  {showCategoryTag && <span className="truncate text-[13px] text-slate-600 max-lg:hidden">{d.group}</span>}
                  <span className="max-lg:hidden">
                    {n === 0 ? <span className="text-[13px] text-faint">Not used</span> : <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark">{n} {n === 1 ? 'checklist' : 'checklists'}</span>}
                  </span>
                  <div className="relative justify-self-end">
                    <button
                      type="button"
                      aria-label={`More for ${d.name}`}
                      aria-haspopup="menu"
                      onClick={(e) => {
                        if (rowMenu?.id === d.id) return setRowMenu(null)
                        const r = e.currentTarget.getBoundingClientRect()
                        const menuHeight = 96
                        setRowMenu({ id: d.id, top: r.bottom + menuHeight + 12 > window.innerHeight ? r.top - menuHeight - 4 : r.bottom + 4, right: window.innerWidth - r.right })
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                    >
                      <MoreHorizontal size={17} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
      {rowMenu && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setRowMenu(null)} />
          <div role="menu" style={{ top: rowMenu.top, right: rowMenu.right }} className="fixed z-50 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const d = documents.find((x) => x.id === rowMenu.id)
                setRowMenu(null)
                if (d) setForm({ id: d.id, name: d.name, group: d.group, multiple: !!d.multiple, once: !!d.once, optional: !!d.optional })
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold hover:bg-canvas"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setConfirmId(rowMenu.id)
                setRowMenu(null)
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}

      {addingCat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
          role="dialog"
          aria-modal="true"
          aria-label={renamingCat ? 'Rename category' : 'New category'}
          onClick={() => {
            setAddingCat(false)
            setRenamingCat(null)
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              submitCategory()
            }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="text-base font-bold">{renamingCat ? 'Rename category' : 'New category'}</div>
            <label className="mt-4 block text-[13px] font-semibold text-muted">
              Name
              <input
                autoFocus
                value={catText}
                onChange={(e) => {
                  setCatText(e.target.value)
                  setCatError('')
                }}
                placeholder="For example, Registrations"
                className="mt-1 block h-11 w-full rounded-xl border border-line px-3.5 text-[15px] font-medium text-ink outline-none focus:border-brand"
              />
            </label>
            {catError && <p className="mt-1.5 text-xs font-medium text-danger">{catError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddingCat(false)
                  setRenamingCat(null)
                }}
                className="h-10 rounded-xl border border-line px-4 text-sm font-semibold"
              >
                Cancel
              </button>
              <button type="submit" disabled={!catText.trim()} className="h-10 rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-40">
                {renamingCat ? 'Rename' : 'Add category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label={form.id ? 'Edit document' : 'New document'} onClick={() => setForm(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              saveForm()
            }}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            {form.sure && form.id ? (
              <>
                {(() => {
                  const u = usage(form.id)
                  const was = documents.find((d) => d.id === form.id)
                  return (
                    <>
                      <div className="text-base font-bold">Change the name of a document that is in use?</div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                        “{was?.name}” will be called “{form.name.trim()}” everywhere: {u.files.length} {u.files.length === 1 ? 'file' : 'files'}, {u.requests} {u.requests === 1 ? 'request' : 'requests'} and {u.lists} {u.lists === 1 ? 'checklist' : 'checklists'}.
                      </p>
                      <p className="mt-2 rounded-xl bg-[#FEF0D5] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#6E3B00]">
                        Use this for spelling or a better name. If it is really a different document, cancel and add a new one, so the old files keep their name.
                      </p>
                    </>
                  )
                })()}
              </>
            ) : (
              <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                <FileText size={22} />
              </span>
              <div>
                <div className="text-[18px] font-bold leading-tight">{form.id ? 'Edit document' : 'New document'}</div>
                <div className="text-[13px] text-muted">Set it up once. Every checklist and request can use it.</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1.3fr_1fr]">
              <label className="block text-[13px] font-semibold text-muted">
                Name
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="For example, Rent agreement"
                  className="mt-1 block h-11 w-full rounded-xl border border-line px-3.5 text-[15px] font-medium text-ink outline-none focus:border-brand"
                />
              </label>
              <label className="block text-[13px] font-semibold text-muted">
                Category
                <span className="mt-1 block">
                  <FilterSelect value={form.group} onChange={(v) => setForm({ ...form, group: v })} label="Category" width="w-full">
                    <option value="" disabled>
                      Choose…
                    </option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </FilterSelect>
                </span>
              </label>
            </div>

            {/* Three yes or no questions, each a plain sentence with a switch and an example. Off is the usual case. */}
            <div className="mt-5 divide-y divide-line rounded-2xl border border-line">
              {(
                [
                  { key: 'multiple', title: 'Client can send many files', eg: 'Like Aadhaar front and back, or 3 months of bank statement.', on: form.multiple },
                  { key: 'optional', title: 'Optional', eg: 'Client can skip it. The request can finish without it, and we do not remind.', on: form.optional },
                  { key: 'once', title: 'Send only one time', eg: 'Like PAN card. We do not ask for it again next year.', on: form.once },
                ] as const
              ).map((row) => (
                <div key={row.key} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold">{row.title}</div>
                    <div className="mt-0.5 text-[12px] leading-snug text-muted">{row.eg}</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.on}
                    aria-label={row.title}
                    onClick={() => setForm({ ...form, [row.key]: !row.on })}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${row.on ? 'bg-brand' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${row.on ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
            {/* What the choices add up to, in plain words. */}
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
              <span className="font-semibold text-ink">This document is</span>
              {[
                form.optional ? 'optional' : 'mandatory',
                form.multiple ? 'many files' : '1 file',
                form.once ? 'asked one time only' : 'asked every year',
              ].map((t) => (
                <span key={t} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[12px] font-semibold text-brand-dark">
                  {t}
                </span>
              ))}
            </p>
            {form.id && !!documents.find((d) => d.id === form.id) && !!documents.find((d) => d.id === form.id)?.once !== form.once && usage(form.id).files.length > 0 && (
              <p className="mt-3 rounded-xl bg-[#FEF0D5] px-3.5 py-2.5 text-[12px] leading-snug text-[#6E3B00]">
                It already has {usage(form.id).files.length} {usage(form.id).files.length === 1 ? 'file' : 'files'}. They move too (to the client’s Permanent folder, or back to their years), unless you saved them in a folder yourself.
              </p>
            )}
              </>
            )}
            <div className="mt-6 flex justify-end gap-2">
              {form.sure ? (
                <button type="button" onClick={() => setForm({ ...form, sure: false })} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold">
                  Back
                </button>
              ) : (
                <button type="button" onClick={() => setForm(null)} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold">
                  Cancel
                </button>
              )}
              <button type="submit" disabled={!form.name.trim() || !form.group} className="h-10 rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-40">
                {form.sure ? 'Yes, change it' : form.id ? 'Save' : 'Add document'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmId && (() => {
        const d = documents.find((x) => x.id === confirmId)
        if (!d) return null
        const n = usedIn(d.id)
        const u = usage(d.id)
        const inUse = u.files.length > 0 || u.requests > 0
        const others = documents.filter((x) => x.id !== d.id)
        const target = others.find((x) => x.id === delTarget)
        const close = () => setConfirmId(null)
        const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`
        const confirm = () => {
          if (!inUse) removeDocument(d.id)
          else if (delChoice === 'move' && target) {
            reassignDoc(d.id, { id: target.id, name: target.name })
            u.files.forEach((f) => editFile(f.id, { docId: target.id }))
            removeDocument(d.id, target.id)
            setToast(`“${d.name}” deleted. ${plural(u.files.length, 'file', 'files')} and ${plural(u.requests, 'request', 'requests')} moved to “${target.name}”.`)
          } else {
            // Each file goes to the Archive of its own client (by year), so it stays with the client and can be found there.
            u.files.forEach((f) => editFile(f.id, f.clientId ? { folderId: archiveFolderId(f.clientId, f.period), was: d.group } : { folderId: null, was: d.group }))
            removeDocument(d.id)
            setToast(`“${d.name}” deleted. ${plural(u.files.length, 'file', 'files')} sent to the Archive of their clients.`)
          }
          close()
        }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Delete document" onClick={close}>
            <div className={`w-full rounded-2xl bg-white p-6 shadow-2xl ${inUse ? 'max-w-[520px]' : 'max-w-sm'}`} onClick={(e) => e.stopPropagation()}>
              {inUse ? (
                <>
                  <div className="text-[18px] font-bold">Delete “{d.name}”?</div>
                  <p className="mt-1 text-[13px] text-muted">This document is already in use, so choose what happens to what it holds.</p>
                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    {[
                      [u.files.length, u.files.length === 1 ? 'file' : 'files'],
                      [u.requests, u.requests === 1 ? 'request' : 'requests'],
                      [u.lists, u.lists === 1 ? 'checklist' : 'checklists'],
                    ].map(([k, label]) => (
                      <div key={label} className="rounded-xl border border-line bg-[#FAFBFC] px-3.5 py-3">
                        <div className="text-[22px] font-bold leading-tight">{k}</div>
                        <div className="text-xs text-muted">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-col gap-2.5" role="radiogroup" aria-label="What happens to the files">
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] px-4 py-3.5 ${delChoice === 'archive' ? 'border-brand bg-brand-soft/60' : 'border-line hover:border-slate-300'}`}>
                      <input type="radio" name="del" checked={delChoice === 'archive'} onChange={() => setDelChoice('archive')} className="mt-1 h-[18px] w-[18px] accent-[#0F7B6C]" />
                      <span className="text-sm">
                        <span className="flex items-center gap-2 font-semibold">
                          <Archive size={15} /> Send the files to the client’s Archive
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-muted">Each file goes to the Archive inside its own client’s folder in Document Master (Client › Archive › year), so it stays with the client. You can move it to any folder from there. Old requests keep the name as text. The document is taken out of the checklists.</span>
                      </span>
                    </label>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] px-4 py-3.5 ${delChoice === 'move' ? 'border-brand bg-brand-soft/60' : 'border-line hover:border-slate-300'}`}>
                      <input type="radio" name="del" checked={delChoice === 'move'} onChange={() => setDelChoice('move')} className="mt-1 h-[18px] w-[18px] accent-[#0F7B6C]" />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block font-semibold">Move everything to another document</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-muted">The files, the requests and the checklists use the document you pick.</span>
                        {delChoice === 'move' && (
                          <div className="mt-3" onClick={(e) => e.preventDefault()}>
                            <div className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm text-muted focus-within:border-brand">
                              <Search size={15} />
                              <input autoFocus value={delQuery} onChange={(e) => setDelQuery(e.target.value)} placeholder="Search documents" aria-label="Search documents" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
                            </div>
                            <div role="radiogroup" aria-label="Move to" className="mt-2 max-h-[210px] overflow-y-auto rounded-xl border border-line bg-white">
                              {categories.map((c) => {
                                const inCat = others.filter((x) => x.group === c && (!delQuery.trim() || x.name.toLowerCase().includes(delQuery.trim().toLowerCase())))
                                if (inCat.length === 0) return null
                                return (
                                  <div key={c}>
                                    <div className="sticky top-0 bg-[#FAFBFC] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-faint">{c}</div>
                                    {inCat.map((x) => (
                                      <button key={x.id} type="button" role="radio" aria-checked={delTarget === x.id} onClick={() => setDelTarget(x.id)} className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${delTarget === x.id ? 'bg-brand-soft font-semibold text-brand-dark' : 'hover:bg-canvas'}`}>
                                        {x.name}
                                        {delTarget === x.id && <Check size={15} className="shrink-0" />}
                                      </button>
                                    ))}
                                  </div>
                                )
                              })}
                              {others.every((x) => delQuery.trim() && !x.name.toLowerCase().includes(delQuery.trim().toLowerCase())) && <p className="px-3 py-6 text-center text-[13px] text-muted">No document matches.</p>}
                            </div>
                            <p className="mt-2 text-[13px] text-muted">{target ? <>Moving to <b className="text-ink">{target.name}</b></> : 'Choose the document that takes over.'}</p>
                          </div>
                        )}
                      </span>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-base font-bold">{n > 0 ? `Delete “${d.name}” from ${n} ${n === 1 ? 'checklist' : 'checklists'}?` : `Delete “${d.name}”?`}</div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{n > 0 ? <>It will be taken out of {namesOf(d.id)}, so it will not be asked for in new requests. No file or request uses it.</> : 'No file, request or checklist uses it.'}</p>
                </>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={close} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold">
                  Keep it
                </button>
                <button type="button" disabled={inUse && delChoice === 'move' && !target} onClick={confirm} className="h-10 rounded-xl bg-danger px-4 text-sm font-semibold text-white disabled:opacity-40">
                  {!inUse ? (n > 0 ? `Delete from ${n}` : 'Delete') : delChoice === 'move' ? 'Move and delete' : 'Archive and delete'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      <Toast message={toast} />
    </Page>
  )
}
