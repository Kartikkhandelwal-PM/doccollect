import { Check, FileText, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import Page from '../components/Page'
import { useState } from 'react'
import { useSetup } from '../data/setup'

const ALL = '__all'

export default function Documents() {
  const { documents, categories, compliances, addDocument, renameDocument, moveDocument, removeDocument, addCategory, renameCategory, removeCategory } = useSetup()

  const [selected, setSelected] = useState<string>(categories[0] ?? ALL)
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')

  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editGroup, setEditGroup] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const [addingCat, setAddingCat] = useState(false)
  const [catText, setCatText] = useState('')
  const [catError, setCatError] = useState('')
  const [renamingCat, setRenamingCat] = useState<string | null>(null)
  const [confirmCat, setConfirmCat] = useState<string | null>(null)

  const usedIn = (id: string) => compliances.filter((c) => c.docIds.includes(id)).length
  const countOf = (c: string) => documents.filter((d) => d.group === c).length

  const searching = query.trim() !== ''
  const current = selected === ALL || !categories.includes(selected) ? ALL : selected
  const list = documents.filter((d) => (searching ? d.name.toLowerCase().includes(query.toLowerCase()) : current === ALL || d.group === current))
  const showCategoryTag = searching || current === ALL

  const addDoc = () => {
    const n = name.trim()
    if (!n) return
    addDocument(n, current === ALL ? (categories[0] ?? 'Other') : current)
    setName('')
  }

  const saveEdit = (id: string, originalGroup: string) => {
    const n = editText.trim()
    if (n) renameDocument(id, n)
    if (editGroup && editGroup !== originalGroup) moveDocument(id, editGroup)
    setEditId(null)
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
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">Documents list</h1>
          <p className="mt-0.5 text-sm text-muted">
            Every document you ask for. {documents.length} documents in {categories.length} categories.
          </p>
        </div>
        <label className="flex h-11 w-80 shrink-0 items-center gap-2.5 rounded-xl border border-line bg-white px-4 text-sm text-muted">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all documents" className="w-full bg-transparent outline-none placeholder:text-muted" />
          {searching && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="text-muted hover:text-ink">
              <X size={15} />
            </button>
          )}
        </label>
      </div>
      }
      fixed
    >
      <div className="grid h-full min-h-0 grid-cols-12 gap-5">
        {/* Categories */}
        <aside className="col-span-3 min-h-0 overflow-y-auto rounded-[18px] border border-line bg-white p-3">
          <div className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-widest text-faint">Categories</div>
          <button
            type="button"
            onClick={() => {
              setSelected(ALL)
              setQuery('')
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
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${current === c && !searching ? 'bg-brand-soft text-brand-dark' : 'hover:bg-canvas'}`}
                  >
                    <span className="truncate pr-14">{c}</span>
                    <span className="text-xs font-medium text-muted">{countOf(c)}</span>
                  </button>
                  <div className="absolute right-9 top-1/2 hidden -translate-y-1/2 gap-0.5 group-focus-within:flex group-hover:flex">
                    <button type="button" aria-label={`Rename ${c}`} onClick={() => startCategoryForm(c)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-white hover:text-ink">
                      <Pencil size={13} />
                    </button>
                    {countOf(c) === 0 && (
                      <button type="button" aria-label={`Delete ${c}`} onClick={() => setConfirmCat(c)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-white hover:text-danger">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="mt-2 border-t border-line pt-2">
            {addingCat ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  submitCategory()
                }}
                className="p-1"
              >
                <input
                  autoFocus
                  value={catText}
                  onChange={(e) => {
                    setCatText(e.target.value)
                    setCatError('')
                  }}
                  placeholder="Category name"
                  aria-label="Category name"
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                />
                {catError && <p className="mt-1 text-xs font-medium text-danger">{catError}</p>}
                <div className="mt-2 flex gap-2">
                  <button type="submit" className="h-9 flex-1 rounded-lg bg-brand text-[13px] font-semibold text-white">
                    {renamingCat ? 'Rename' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCat(false)
                      setRenamingCat(null)
                    }}
                    className="h-9 rounded-lg border border-line px-3 text-[13px] font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={() => startCategoryForm(null)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-brand hover:bg-canvas">
                <Plus size={15} strokeWidth={2.4} />
                New category
              </button>
            )}
          </div>
        </aside>

        {/* Documents */}
        <section className="col-span-9 flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-line bg-white">
          <div className="shrink-0 border-b border-line px-6 py-4">
            <h2 className="text-lg font-bold">
              {searching ? `Results for “${query.trim()}”` : current === ALL ? 'All documents' : current}
              <span className="ml-2 text-sm font-medium text-muted">{list.length}</span>
            </h2>
            {!searching && (
              <div className="mt-3 flex gap-2.5">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addDoc()}
                  placeholder={current === ALL ? `Add a document to ${categories[0] ?? 'Other'}` : `Add a document to ${current}`}
                  aria-label="New document name"
                  className="h-11 flex-1 rounded-xl border border-line px-3.5 text-[15px] outline-none focus:border-brand"
                />
                <button type="button" onClick={addDoc} disabled={!name.trim()} className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-40">
                  <Plus size={16} strokeWidth={2.4} />
                  Add
                </button>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
          {list.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canvas text-muted">
                <FileText size={22} />
              </span>
              <p className="text-[15px] font-semibold">{searching ? 'No document matches your search' : 'No documents here yet'}</p>
              {!searching && <p className="text-sm text-muted">Type a name above and press Add.</p>}
            </div>
          )}

          {list.map((d) => (
            <div key={d.id} className="flex items-center gap-4 border-b border-line px-6 py-3 last:border-b-0">
              {editId === d.id ? (
                <>
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(d.id, d.group)
                      if (e.key === 'Escape') setEditId(null)
                    }}
                    aria-label="Document name"
                    className="h-10 flex-1 rounded-lg border border-brand px-3 text-sm outline-none"
                  />
                  <select value={editGroup} onChange={(e) => setEditGroup(e.target.value)} aria-label="Category" className="h-10 w-44 rounded-lg border border-line bg-white px-2.5 text-sm outline-none focus:border-brand">
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <button type="button" aria-label="Save" onClick={() => saveEdit(d.id, d.group)} className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white">
                    <Check size={17} />
                  </button>
                  <button type="button" aria-label="Cancel" onClick={() => setEditId(null)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-line">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-canvas text-muted">
                    <FileText size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{d.name}</div>
                    <div className="text-xs text-muted">
                      {showCategoryTag && <span className="mr-1.5 font-semibold text-slate-600">{d.group} ·</span>}
                      {usedIn(d.id) === 0 ? 'Not in any compliance' : `In ${usedIn(d.id)} ${usedIn(d.id) === 1 ? 'compliance' : 'compliances'}`}
                    </div>
                  </div>
                  {confirmId === d.id ? (
                    <div className="flex items-center gap-2 text-[13px] font-semibold">
                      <span className="text-danger">Delete?{usedIn(d.id) > 0 && ` It will leave ${usedIn(d.id)} compliance.`}</span>
                      <button
                        type="button"
                        onClick={() => {
                          removeDocument(d.id)
                          setConfirmId(null)
                        }}
                        className="rounded-lg bg-danger px-3 py-1.5 text-white"
                      >
                        Yes
                      </button>
                      <button type="button" aria-label="Cancel" onClick={() => setConfirmId(null)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-canvas">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label={`Edit ${d.name}`}
                        onClick={() => {
                          setEditId(d.id)
                          setEditText(d.name)
                          setEditGroup(d.group)
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                      >
                        <Pencil size={15} />
                      </button>
                      <button type="button" aria-label={`Delete ${d.name}`} onClick={() => setConfirmId(d.id)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
          </div>
        </section>
      </div>
    </Page>
  )
}
