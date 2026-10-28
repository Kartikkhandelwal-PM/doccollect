import { ArrowLeft, FileText, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import Page from '../components/Page'
import { useState } from 'react'
import FilterSelect from '../components/FilterSelect'
import { useSetup } from '../data/setup'

const ALL = '__all'

export default function Documents() {
  const { documents, categories, compliances, addDocument, setDocumentMultiple, renameDocument, moveDocument, removeDocument, addCategory, renameCategory, removeCategory } = useSetup()

  const [selected, setSelected] = useState<string>(categories[0] ?? ALL)
  // On a phone you see the categories, or the documents of one category.
  const [showDocs, setShowDocs] = useState(false)
  const [query, setQuery] = useState('')
  // A document is made or changed in a small window: id null means a new one.
  const [form, setForm] = useState<{ id: string | null; name: string; group: string; multiple: boolean; sure?: boolean } | null>(null)
  // The row menu is drawn over the page (fixed), so the list can never cut it off. It opens upward near the bottom of the screen.
  const [rowMenu, setRowMenu] = useState<{ id: string; top: number; right: number } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

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

  const startNew = () => setForm({ id: null, name: '', group: '', multiple: false })
  const saveForm = () => {
    if (!form) return
    const n = form.name.trim()
    if (!n || !form.group) return
    // A document that sits in checklists is renamed there too, so the CA is asked once.
    const was = form.id ? documents.find((d) => d.id === form.id) : undefined
    if (was && n !== was.name && usedIn(was.id) > 0 && !form.sure) return setForm({ ...form, sure: true })
    if (form.id === null) {
      addDocument(n, form.group, form.multiple)
    } else {
      renameDocument(form.id, n)
      setDocumentMultiple(form.id, form.multiple)
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
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canvas text-muted">
                  <FileText size={22} />
                </span>
                <p className="text-[15px] font-semibold">{searching ? 'No document matches your search' : 'No documents here yet'}</p>
                {!searching && (
                  <button type="button" onClick={startNew} className="mt-1 flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white">
                    <Plus size={15} /> New document
                  </button>
                )}
              </div>
            )}

            {list.map((d) => {
              const n = usedIn(d.id)
              return (
                <div key={d.id} className={`group grid items-center gap-4 border-b border-line px-6 py-3 last:border-b-0 hover:bg-slate-50/70 ${showCategoryTag ? 'lg:grid-cols-[1fr_180px_150px_48px]' : 'lg:grid-cols-[1fr_150px_48px]'} grid-cols-[1fr_48px]`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-canvas text-muted">
                      <FileText size={17} />
                    </span>
                    <span className="truncate text-[15px] font-semibold">{d.name}</span>
                    {d.multiple && <span className="shrink-0 rounded-md bg-canvas px-1.5 py-0.5 text-[12px] font-semibold text-muted">Several files</span>}
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
                if (d) setForm({ id: d.id, name: d.name, group: d.group, multiple: !!d.multiple })
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
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            {form.sure && form.id ? (
              <>
                <div className="text-base font-bold">Change the name in {usedIn(form.id)} {usedIn(form.id) === 1 ? 'checklist' : 'checklists'}?</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  “{documents.find((d) => d.id === form.id)?.name}” will be called “{form.name.trim()}” in {namesOf(form.id)}. Requests you already sent are not changed.
                </p>
              </>
            ) : (
              <>
            <div className="text-base font-bold">{form.id ? 'Edit document' : 'New document'}</div>
            {/* Category first, chosen by the user (nothing is pre-selected), then the name. */}
            <label className="mt-4 block text-[13px] font-semibold text-muted">
              Category
              <span className="mt-1 block">
                <FilterSelect value={form.group} onChange={(v) => setForm({ ...form, group: v })} label="Category" width="w-full">
                  <option value="" disabled>
                    Choose a category
                  </option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </FilterSelect>
              </span>
            </label>
            <label className="mt-4 block text-[13px] font-semibold text-muted">
              Name
              <input
                autoFocus={!!form.id}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="For example, Rent agreement"
                className="mt-1 block h-11 w-full rounded-xl border border-line px-3.5 text-[15px] font-medium text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line px-3.5 py-3">
              <input type="checkbox" checked={form.multiple} onChange={(e) => setForm({ ...form, multiple: e.target.checked })} className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#0F7B6C]" />
              <span className="text-sm">
                <span className="block font-semibold text-ink">Allow more than one file</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">For things like the front and back of a card, or a few months of statements. Without this, the client can send only one file for it.</span>
              </span>
            </label>
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
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Delete document" onClick={() => setConfirmId(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="text-base font-bold">{n > 0 ? `Delete “${d.name}” from ${n} ${n === 1 ? 'checklist' : 'checklists'}?` : `Delete “${d.name}”?`}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {n > 0 ? (
                  <>
                    It will be taken out of {namesOf(d.id)}, so it will not be asked for in new requests. Requests you already sent and files you already received are not changed.
                  </>
                ) : (
                  'It is not in any checklist. Requests you already sent are not changed.'
                )}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmId(null)} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold">
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeDocument(d.id)
                    setConfirmId(null)
                  }}
                  className="h-10 rounded-xl bg-danger px-4 text-sm font-semibold text-white"
                >
                  {n > 0 ? `Delete from ${n}` : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </Page>
  )
}
