import { motion } from 'framer-motion'
import { Building2, Check, ChevronRight, Folder, FolderOpen, FolderPlus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { backdropProps, panelProps } from '../lib/motion'
import { buildMaster, clientFolderInfo } from '../data/master'
import { FIRM_FOLDER, useMasterStore } from '../data/masterStore'
import { getBookClient } from '../data/mock'
import { useRequests } from '../data/requests'
import Avatar from './Avatar'
import FileTypeIcon from './FileTypeIcon'

const OTHERS = '__others'

interface Node {
  id: string
  name: string
  parentId: string | null
}

// "Save as" for Document Master: the folders as a tree, the way a computer asks where to save a file.
// The folder we think it belongs to is open and selected. The CA picks another one, or makes a new folder, and saves.
export default function FolderPickerDialog({ fileName, suggested, clientIds, step, title, more, saveLabel, alt, onSave, onClose }: { fileName: string; suggested?: string; step?: string; clientIds: string[]; title?: string; more?: string[]; saveLabel?: string; alt?: { label: string; onClick: () => void }; onSave: (folderId: string) => void; onClose: () => void }) {
  const { requests } = useRequests()
  const { folders, uploads, folderNames, fileEdits, addFolder } = useMasterStore()
  const [selected, setSelected] = useState<string | null>(suggested ?? null)
  const [open, setOpen] = useState<Set<string>>(() => {
    const s = new Set<string>()
    // Nothing to guess from (an unknown number, no client): show the firm folders and the client list open, so the user can see and choose.
    if (clientIds.length === 0) [FIRM_FOLDER, '__others'].forEach((x) => s.add(x))
    // open the path down to the suggested folder
    const m = suggested?.match(/^(c:[^/]+)\/([^/]+)\/(.+)$/)
    if (m) [m[1], `${m[1]}/${m[2]}`].forEach((x) => s.add(x))
    return s
  })
  const [q, setQ] = useState('')
  const [making, setMaking] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation() // closes only this window, not the preview under it
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  // Folders made by approvals (client > year > compliance) plus the ones the CA made, like the Document Master tree.
  const nodes = useMemo<Node[]>(() => {
    const map = new Map<string, Node>()
    const addAuto = (folderId: string) => {
      const m = folderId.match(/^c:([^/]+)\/([^/]+)\/(.+)$/)
      if (!m) return
      const [, clientId, fy, comp] = m
      const c = `c:${clientId}`
      const y = `${c}/${fy}`
      map.set(c, { id: c, name: getBookClient(clientId)?.name ?? clientId, parentId: null })
      map.set(y, { id: y, name: folderNames[y] ?? fy, parentId: c })
      map.set(folderId, { id: folderId, name: folderNames[folderId] ?? comp, parentId: y })
    }
    ;[...buildMaster(requests), ...uploads].forEach((f) => f.folderId && addAuto(f.folderId))
    if (suggested) addAuto(suggested)
    return [...map.values(), ...folders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId }))]
  }, [requests, uploads, folders, folderNames, suggested])

  // The files, exactly as Document Master lists them (with its renames, moves and deletes).
  const files = useMemo(
    () =>
      [...buildMaster(requests), ...uploads]
        .filter((f) => !fileEdits[f.id]?.deleted)
        .map((f) => {
          const e = fileEdits[f.id]
          return e ? { ...f, name: e.name ?? f.name, folderId: e.folderId !== undefined ? e.folderId : f.folderId } : f
        }),
    [requests, uploads, fileEdits],
  )

  const kids = (id: string | null) => nodes.filter((n) => n.parentId === id)
  // How many files are in a folder, counting the folders inside it.
  const countOf = (id: string) => {
    const ids = new Set<string | null>([id])
    const walk = (p: string) => kids(p).forEach((k) => (ids.add(k.id), walk(k.id)))
    walk(id)
    return files.filter((f) => ids.has(f.folderId)).length
  }
  const mine = new Set(clientIds.map((id) => `c:${id}`))
  // This chat's own client comes first and is open. Every other client sits inside one closed group, so a file is not saved in the wrong client by a slip.
  const byName = (a: Node, b: Node) => a.name.localeCompare(b.name)
  const query = q.trim().toLowerCase()
  const own = kids(null).filter((n) => mine.has(n.id)).sort(byName)
  const others = kids(null).filter((n) => n.id.startsWith('c:') && !mine.has(n.id)).sort(byName)
  const firm = kids(null).filter((n) => !n.id.startsWith('c:')).sort(byName)
  const shownOthers = query ? others.filter((n) => n.name.toLowerCase().includes(query)) : others
  const othersOpen = open.has(OTHERS) || !!query

  const pathOf = (id: string | null) => {
    const out: string[] = []
    let n = nodes.find((x) => x.id === id)
    while (n) {
      out.unshift(n.name)
      n = nodes.find((x) => x.id === n!.parentId)
    }
    return out
  }
  const path = pathOf(selected)
  const inside = files.filter((f) => f.folderId === selected)
  // Nothing chosen yet: the right side asks for a choice. It does not list every client, which would undo the closed client list.
  const subfolders = selected ? kids(selected).sort((a, b) => a.name.localeCompare(b.name)) : []

  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const create = () => {
    const name = newName.trim()
    if (!name || !selected) return
    const id = addFolder(selected, name)
    setOpen((s) => new Set(s).add(selected))
    setSelected(id)
    setMaking(false)
    setNewName('')
  }

  const row = (n: Node, depth: number) => {
    const sub = kids(n.id).sort((a, b) => a.name.localeCompare(b.name))
    const isOpen = open.has(n.id) || !!query
    const on = selected === n.id
    const isClient = depth === 0 && n.id.startsWith('c:')
    return (
      <div key={n.id}>
        <div
          role="treeitem"
          aria-selected={on}
          aria-expanded={sub.length ? isOpen : undefined}
          onClick={() => setSelected(n.id)}
          onDoubleClick={() => sub.length && toggle(n.id)}
          style={{ paddingLeft: 10 + depth * 20 }}
          className={`flex ${isClient ? 'h-12' : 'h-10'} cursor-pointer items-center gap-1.5 rounded-lg pr-3 text-sm ${on ? 'bg-brand-soft font-semibold text-brand-dark' : 'hover:bg-canvas'}`}
        >
          <button
            type="button"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
            onClick={(e) => {
              e.stopPropagation()
              toggle(n.id)
            }}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted hover:bg-white ${sub.length ? '' : 'invisible'}`}
          >
            <ChevronRight size={15} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>
          {isClient ? <Avatar name={n.name} size={26} /> : n.id === FIRM_FOLDER ? <Building2 size={17} className="shrink-0 text-muted" /> : on || isOpen ? <FolderOpen size={18} className="shrink-0 text-brand-dark" /> : <Folder size={18} className="shrink-0 text-muted" />}
          {isClient ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate leading-tight">{n.name}</span>
              <span className="block truncate font-mono text-[11px] font-normal leading-tight text-muted">{clientFolderInfo(n.id.slice(2))?.pan}</span>
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate">{n.name}</span>
          )}
          <span className="shrink-0 pl-2 text-[12px] font-normal tabular-nums text-muted" title={`${countOf(n.id)} files`}>
            {countOf(n.id)}
          </span>
        </div>
        {isOpen && sub.map((c) => row(c, depth + 1))}
      </div>
    )
  }

  return (
    <motion.div {...backdropProps} className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Save to Document Master">
      <motion.div {...panelProps} className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <FileTypeIcon file={fileName} size={32} />
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold">{title ?? 'Save to Document Master'}</div>
            <div className="truncate text-[13px] text-muted" title={[fileName, ...(more ?? [])].join(', ')}>
              {step ? `${step} · ` : ''}
              {fileName}
              {more && more.length > 0 ? ` and ${more.length} more ${more.length === 1 ? 'file' : 'files'}` : ''}
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas">
            <X size={20} />
          </button>
        </div>

        <div className="flex h-[min(560px,calc(100vh-260px))] min-h-0">
          <div className="flex w-[340px] shrink-0 flex-col border-r border-line">
            <div className="border-b border-line px-3 py-2.5">
              <label className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm text-muted focus-within:border-brand">
                <Search size={14} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients" aria-label="Search clients" className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
              </label>
            </div>
            <div role="tree" aria-label="Folders" className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {firm.length > 0 && <div className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-widest text-faint">Firm</div>}
              {firm.map((r) => row(r, 0))}
              {(own.length > 0 || others.length > 0) && <div className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-widest text-faint">Clients</div>}
              {own.map((r) => row(r, 0))}
              {others.length > 0 && (
                <>
                  <button
                    type="button"
                    aria-expanded={othersOpen}
                    onClick={() => toggle(OTHERS)}
                    className="mt-2 flex h-10 w-full items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 text-left text-sm font-semibold text-muted hover:border-brand hover:text-ink"
                  >
                    <ChevronRight size={15} className={`shrink-0 transition-transform ${othersOpen ? 'rotate-90' : ''}`} />
                    Client list ({others.length})
                  </button>
                  {othersOpen && (
                    <div className="mt-1">
                      {shownOthers.map((r) => row(r, 0))}
                      {shownOthers.length === 0 && <p className="px-3 py-3 text-sm text-muted">No client found.</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col bg-canvas/40">
            <div className="flex h-[53px] shrink-0 items-center border-b border-line px-4 text-[13px] font-semibold text-muted">
              <span className="truncate">{path.length ? path[path.length - 1] : 'Select a folder'}</span>
              {selected && (
                <span className="ml-auto shrink-0 font-normal">
                  {subfolders.length} {subfolders.length === 1 ? 'folder' : 'folders'} · {inside.length} {inside.length === 1 ? 'file' : 'files'}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {(subfolders.length > 0 || inside.length > 0) && (
                <div className="flex items-center gap-2.5 px-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-faint">
                  <span className="min-w-0 flex-1 pl-[30px]">Name</span>
                  <span className="w-20 shrink-0 text-right">Size</span>
                  <span className="w-24 shrink-0 text-right">Added</span>
                </div>
              )}
              {subfolders.map((n) => (
                <button key={n.id} type="button" onClick={() => (setSelected(n.id), setOpen((s) => new Set(s).add(selected as string)))} className="flex h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm hover:bg-white">
                  <Folder size={20} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate font-medium">{n.name}</span>
                  <span className="w-20 shrink-0" />
                  <span className="w-24 shrink-0" />
                </button>
              ))}
              {inside.map((f) => (
                <div key={f.id} className="flex h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink/80">
                  <FileTypeIcon file={f.fileName} size={22} />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="w-20 shrink-0 text-right text-[12.5px] text-muted">{f.size}</span>
                  <span className="w-24 shrink-0 text-right text-[12.5px] text-muted">{f.date}</span>
                </div>
              ))}
              {!selected && <p className="px-3 py-10 text-center text-sm text-muted">Choose a folder on the left. Its files show here.</p>}
              {selected && subfolders.length + inside.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">This folder is empty.</p>}
            </div>
          </div>
        </div>

        {making && (
          <div className="flex items-center gap-2 border-t border-line px-5 py-3">
            <FolderPlus size={18} className="shrink-0 text-muted" />
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder={`New folder inside ${path[path.length - 1] ?? 'the selected folder'}`}
              aria-label="New folder name"
              className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
            />
            <button type="button" onClick={() => setMaking(false)} className="h-10 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-canvas">
              Cancel
            </button>
            <button type="button" disabled={!newName.trim()} onClick={create} className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">
              Create
            </button>
          </div>
        )}

        <div className="border-t border-line bg-canvas/60 px-5 py-3">
          <div className="mb-3 flex items-center gap-2 text-[13px]">
            <span className="shrink-0 font-semibold text-muted">Save in:</span>
            <span className="truncate font-semibold">{path.length ? path.join(' › ') : 'Select a folder'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={!selected || making} onClick={() => setMaking(true)} className="flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:border-brand disabled:opacity-40">
              <FolderPlus size={16} /> New folder
            </button>
            <button type="button" onClick={onClose} className="ml-auto h-11 rounded-xl border border-line bg-white px-5 text-sm font-semibold hover:bg-canvas">
              Cancel
            </button>
            {alt && (
              <button type="button" onClick={alt.onClick} className="h-11 rounded-xl border border-line bg-white px-5 text-sm font-semibold hover:bg-canvas">
                {alt.label}
              </button>
            )}
            <button type="button" disabled={!selected} onClick={() => selected && onSave(selected)} className="flex h-11 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white disabled:opacity-40">
              <Check size={16} strokeWidth={2.8} /> {saveLabel ?? 'Save here'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
