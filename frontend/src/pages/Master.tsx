import { backdropProps, panelProps } from '../lib/motion'
import { motion } from 'framer-motion'
import Toast from '../components/Toast'
import { Building2, ChevronDown, Folders, ChevronRight, Download, Folder, FolderInput, FolderPlus, FolderUp, LayoutGrid, List, MoreHorizontal, Pencil, Search, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Avatar from '../components/Avatar'
import FileTypeIcon from '../components/FileTypeIcon'
import OpenInTab from '../components/OpenInTab'
import PaperPreview from '../components/PaperPreview'
import { fileLink } from '../lib/fileLink'
import Pagination, { usePaging } from '../components/Pagination'
import { useMasterFiles } from '../data/masterFiles'
import type { MasterFile } from '../data/master'
import { FIRM_FOLDER, useMasterStore } from '../data/masterStore'
import { getClient } from '../data/mock'

interface Node {
  id: string
  name: string
  parentId: string | null
  kind: 'client' | 'fy' | 'compliance' | 'custom' | 'firm'
  clientId?: string
  locked?: boolean
}

const START = FIRM_FOLDER
const ROOT = '__top__' // the drop highlight id for the top level

type Drag = { kind: 'folder' | 'file'; id: string } | null

interface Action {
  label: string
  icon: ReactNode
  danger?: boolean
  run: () => void
}

// The "..." menu on folders and files the CA owns.
function ItemMenu({ label, actions, compact }: { label: string; actions: Action[]; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={`flex items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink ${compact ? "h-7 w-7" : "h-8 w-8 bg-white/90 shadow-sm"}`}
      >
        <MoreHorizontal size={compact ? 16 : 17} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  a.run()
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-canvas ${a.danger ? 'text-danger' : ''}`}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

type Target = { kind: 'folder' | 'file'; id: string; name: string }
type Dialog = { type: 'rename' | 'move' | 'delete'; target: Target } | null

const PAGE = 30 // folders shown at first in the main area, and added with each "Show more"
const SIDE_PAGE = 25 // client folders shown at first in the left list

export default function Master() {
  const { folders: custom, uploads, folderNames, addFolder, addUploads, renameFolder, renameAutoFolder, moveFolder, deleteFolder, renameUpload, moveUpload, deleteUpload, editFile } = useMasterStore()
  // Approved documents plus uploads, with the CA's own renames, moves and deletes applied on top.
  const files = useMasterFiles()

  const [current, setCurrent] = useState<string | null>(START)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set([FIRM_FOLDER]),
  )
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [open, setOpen] = useState<MasterFile | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [newFolder, setNewFolder] = useState(false)
  const [folderParent, setFolderParent] = useState<string | null>(null) // where the new folder will be made
  const [folderName, setFolderName] = useState('')
  const [folderError, setFolderError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const uploadFor = useRef<string | null | undefined>(undefined) // set when a folder's own menu started the upload
  const [dlg, setDlg] = useState<Dialog>(null)
  const [dlgText, setDlgText] = useState('')
  const [dlgError, setDlgError] = useState('')
  const [dest, setDest] = useState<string | null>(null)
  // A firm can have thousands of client folders, so lists start short and grow with "Show more".
  // On a phone the folder tree is a panel that slides in from the left.
  const [treeOpen, setTreeOpen] = useState(false)
  const [gridLimit, setGridLimit] = useState(PAGE)
  const [sideLimit, setSideLimit] = useState(SIDE_PAGE)
  const [clientQuery, setClientQuery] = useState('')

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  // The whole tree: folders made by approvals (client > year > compliance) plus the ones the CA created anywhere.
  const nodes = useMemo<Node[]>(() => {
    const map = new Map<string, Node>()
    for (const f of files) {
      const perm = f.folderId?.match(/^c:([^/]+)\/Permanent documents$/)
      if (perm) {
        const [, clientId] = perm
        map.set(`c:${clientId}`, { id: `c:${clientId}`, name: getClient(clientId)?.name ?? clientId, parentId: null, kind: 'client', clientId })
        map.set(f.folderId!, { id: f.folderId!, name: folderNames[f.folderId!] ?? 'Permanent documents', parentId: `c:${clientId}`, kind: 'compliance', clientId })
        continue
      }
      const m = f.folderId?.match(/^c:([^/]+)\/([^/]+)\/(.+)$/)
      if (!m) continue
      const [, clientId, fy, comp] = m
      const c = `c:${clientId}`
      const y = `${c}/${fy}`
      map.set(c, { id: c, name: getClient(clientId)?.name ?? clientId, parentId: null, kind: 'client', clientId })
      map.set(y, { id: y, name: folderNames[y] ?? fy, parentId: c, kind: 'fy', clientId })
      map.set(f.folderId!, { id: f.folderId!, name: folderNames[f.folderId!] ?? comp, parentId: y, kind: 'compliance', clientId })
    }
    return [...map.values(), ...custom.map((c): Node => ({ id: c.id, name: c.name, parentId: c.parentId, kind: c.id === FIRM_FOLDER ? 'firm' : 'custom', locked: c.locked }))]
  }, [files, custom, folderNames])

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const childrenOf = (id: string | null) => nodes.filter((n) => n.parentId === id)
  const trail = (id: string | null) => {
    const out: Node[] = []
    let n = id ? byId.get(id) : undefined
    while (n) {
      out.unshift(n)
      n = n.parentId ? byId.get(n.parentId) : undefined
    }
    return out
  }
  // Every folder id at or below a folder, so counts and ZIPs include sub-folders.
  const subtree = (id: string | null): Set<string | null> => {
    const ids = new Set<string | null>([id])
    const walk = (p: string | null) => childrenOf(p).forEach((c) => (ids.add(c.id), walk(c.id)))
    walk(id)
    return ids
  }
  const filesUnder = (id: string | null) => {
    if (id === null) return files
    const ids = subtree(id)
    return files.filter((f) => ids.has(f.folderId))
  }
  const clientOf = (folderId: string | null) => trail(folderId).find((n) => n.clientId)?.clientId

  const here = trail(current)
  const node = current ? byId.get(current) : undefined
  const subFolders = childrenOf(current)
  const direct = files.filter((f) => f.folderId === current)
  const filePaging = usePaging(direct, `${current}|${view}`, [12, 24, 48])
  const total = filesUnder(current).length

  const go = (id: string | null) => {
    setCurrent(id)
    setTreeOpen(false)
    setGridLimit(PAGE)
    setClientQuery('')
    if (id) setExpanded((s) => new Set([...s, ...trail(id).map((n) => n.id)]))
  }
  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const uploadTo = (folderId: string | null, list: FileList | null) => {
    if (!list || list.length === 0) return
    const added: MasterFile[] = Array.from(list).map((f, i) => ({
      id: `up-${Date.now()}-${i}`,
      folderId,
      name: f.name.replace(/\.[^.]+$/, ''),
      fileName: f.name,
      size: f.size > 1_000_000 ? `${(f.size / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1000))} KB`,
      date: 'Just now',
      from: 'Uploaded by you',
    }))
    addUploads(added)
    setToast(`${added.length} ${added.length === 1 ? 'file' : 'files'} added to ${folderId ? byId.get(folderId)?.name : 'the top level'}`)
    if (fileInput.current) fileInput.current.value = ''
  }
  const onUpload = (list: FileList | null) => {
    uploadTo(uploadFor.current !== undefined ? uploadFor.current : current, list)
    uploadFor.current = undefined
  }
  const pickFiles = (folderId: string | null) => {
    uploadFor.current = folderId
    fileInput.current?.click()
  }
  const openNewFolder = (parentId: string | null) => {
    setFolderParent(parentId)
    setFolderName('')
    setFolderError('')
    setNewFolder(true)
  }

  const createFolder = () => {
    const name = folderName.trim()
    if (!name) return setFolderError('Give the folder a name.')
    if (childrenOf(folderParent).some((n) => n.name.toLowerCase() === name.toLowerCase())) return setFolderError('A folder with this name already exists here.')
    const id = addFolder(folderParent, name)
    setNewFolder(false)
    setToast(`Folder “${name}” created${folderParent ? ` in ${byId.get(folderParent)?.name}` : ''}`)
    setExpanded((x) => new Set([...x, ...(folderParent ? [folderParent] : []), id]))
  }

  const renameAnyFile = (id: string, name: string) => (uploads.some((u) => u.id === id) ? renameUpload(id, name) : editFile(id, { name }))
  const moveAnyFile = (id: string, folderId: string | null) => (uploads.some((u) => u.id === id) ? moveUpload(id, folderId) : editFile(id, { folderId }))
  const deleteAnyFile = (id: string) => (uploads.some((u) => u.id === id) ? deleteUpload(id) : editFile(id, { deleted: true }))
  const parentOf = (target: Target) => (target.kind === 'folder' ? (byId.get(target.id)?.parentId ?? null) : (files.find((f) => f.id === target.id)?.folderId ?? null))

  const openDialog = (type: 'rename' | 'move' | 'delete', target: Target) => {
    setDlg({ type, target })
    setDlgText(target.name)
    setDlgError('')
    setDest(parentOf(target))
  }

  // Folders a thing can be moved into: any folder, but never itself or something inside itself.
  const destinations = (target: Target) => {
    const blocked = target.kind === 'folder' ? subtree(target.id) : new Set<string | null>()
    const out: { node: Node; depth: number }[] = []
    const walk = (parent: string | null, depth: number) =>
      childrenOf(parent).forEach((n) => {
        if (blocked.has(n.id)) return
        out.push({ node: n, depth })
        walk(n.id, depth + 1)
      })
    walk(null, 0)
    return out
  }

  const submitDialog = () => {
    if (!dlg) return
    const { type, target } = dlg
    if (type === 'rename') {
      const name = dlgText.trim()
      if (!name) return setDlgError('Give it a name.')
      if (target.kind === 'folder' && byId.get(target.id)?.kind === 'client') return setDlgError('A client folder is named after the client, so it cannot be renamed.')
      if (target.kind === 'folder') {
        const siblings = childrenOf(byId.get(target.id)?.parentId ?? null).filter((n) => n.id !== target.id)
        if (siblings.some((n) => n.name.toLowerCase() === name.toLowerCase())) return setDlgError('A folder with this name already exists here.')
        const n = byId.get(target.id)
        if (n?.kind === 'custom' || n?.kind === 'firm') renameFolder(target.id, name)
        else renameAutoFolder(target.id, name)
      } else renameAnyFile(target.id, name)
      setToast('Renamed')
    }
    if (type === 'move') {
      if (target.kind === 'folder') moveFolder(target.id, dest)
      else moveAnyFile(target.id, dest)
      if (dest) setExpanded((x) => new Set([...x, ...trail(dest).map((n) => n.id)]))
      setToast(`Moved to ${dest ? byId.get(dest)?.name : 'the top level'}`)
    }
    if (type === 'delete') {
      if (target.kind === 'folder') {
        if (current && subtree(target.id).has(current)) go(byId.get(target.id)?.parentId ?? null)
        const ids = subtree(target.id)
        files.filter((f) => ids.has(f.folderId)).forEach((f) => deleteAnyFile(f.id))
        custom.filter((c) => ids.has(c.id) && !c.locked).forEach((c) => deleteFolder(c.id))
      } else deleteAnyFile(target.id)
      setToast(`“${target.name}” deleted`)
    }
    setDlg(null)
  }

  const movable = (n: Node) => (n.kind === 'custom') && !n.locked
  const folderActions = (n: Node): Action[] => [
    { label: 'New folder', icon: <FolderPlus size={15} />, run: () => openNewFolder(n.id) },
    { label: 'Upload file', icon: <Upload size={15} />, run: () => pickFiles(n.id) },
    ...(n.kind === 'client' ? [] : [{ label: 'Rename', icon: <Pencil size={15} />, run: () => openDialog('rename', { kind: 'folder', id: n.id, name: n.name }) }]),
    ...(movable(n) ? [{ label: 'Move', icon: <FolderInput size={15} />, run: () => openDialog('move', { kind: 'folder', id: n.id, name: n.name }) }] : []),
    ...(n.locked ? [] : [{ label: 'Delete', icon: <Trash2 size={15} />, danger: true, run: () => openDialog('delete', { kind: 'folder', id: n.id, name: n.name }) }]),
  ]
  const fileActions = (f: MasterFile): Action[] => [
    { label: 'Rename', icon: <Pencil size={15} />, run: () => openDialog('rename', { kind: 'file', id: f.id, name: f.name }) },
    { label: 'Move', icon: <FolderInput size={15} />, run: () => openDialog('move', { kind: 'file', id: f.id, name: f.name }) },
    { label: 'Delete', icon: <Trash2 size={15} />, danger: true, run: () => openDialog('delete', { kind: 'file', id: f.id, name: f.name }) },
  ]

  // ---- drag and drop: files and folders move by being dropped on a folder; files from the computer are added there
  const openTimer = useRef<number | undefined>(undefined)
  const stopOpening = () => {
    window.clearTimeout(openTimer.current)
    openTimer.current = undefined
  }
  const [drag, setDrag] = useState<Drag>(null)
  const [over, setOver] = useState<string | null>(null)
  const [outside, setOutside] = useState(false) // files from the computer are being dragged over the page
  const canDrop = (target: string | null) => {
    if (!drag) return false
    if (drag.kind === 'file') return files.find((f) => f.id === drag.id)?.folderId !== target
    if (target === drag.id) return false
    return !subtree(drag.id).has(target) && (byId.get(drag.id)?.parentId ?? null) !== target
  }
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files')
  const dropProps = (target: string | null) => ({
    onDragOver: (e: React.DragEvent) => {
      if (hasFiles(e) || canDrop(target)) {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = hasFiles(e) ? 'copy' : 'move'
        setOver(target ?? ROOT)
      }
    },
    onDragLeave: () => setOver((o) => (o === (target ?? ROOT) ? null : o)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      stopOpening()
      setOver(null)
      setOutside(false)
      if (hasFiles(e)) return uploadTo(target, e.dataTransfer.files)
      if (!drag || !canDrop(target)) return
      const label = target ? byId.get(target)?.name : 'the top level'
      if (drag.kind === 'folder') moveFolder(drag.id, target)
      else moveAnyFile(drag.id, target)
      if (target) setExpanded((x) => new Set([...x, ...trail(target).map((n) => n.id)]))
      setToast(`Moved “${drag.kind === 'folder' ? byId.get(drag.id)?.name : files.find((f) => f.id === drag.id)?.name}” to ${label}`)
      setDrag(null)
    },
  })
  const dragProps = (kind: 'folder' | 'file', id: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', id)
      e.dataTransfer.effectAllowed = 'move'
      setDrag({ kind, id })
    },
    onDragEnd: () => {
      stopOpening()
      setDrag(null)
      setOver(null)
    },
  })
  const isOver = (target: string | null) => over === (target ?? ROOT) && (canDrop(target) || outside)
  const dropRing = 'bg-brand-soft ring-2 ring-inset ring-brand'

  const folderMeta = (n: Node) => {
    const f = filesUnder(n.id).length
    const sub = childrenOf(n.id).length
    if (f === 0 && sub === 0) return 'Empty'
    return [sub ? `${sub} ${sub === 1 ? 'folder' : 'folders'}` : '', f ? `${f} ${f === 1 ? 'file' : 'files'}` : ''].filter(Boolean).join(' · ')
  }

  // ---- left tree
  const topMatches = (pick: (n: Node) => boolean) => childrenOf(null).filter((n) => pick(n) && n.name.toLowerCase().includes(query.toLowerCase()))
  const renderTree = (parent: string | null, depth: number, pick: (n: Node) => boolean = () => true, limit = Infinity): ReactNode =>
    (depth > 0 ? childrenOf(parent) : topMatches(pick))
      .slice(0, limit)
      .map((n) => {
        const kids = childrenOf(n.id)
        const isOpen = expanded.has(n.id)
        const active = current === n.id
        return (
          <div key={n.id}>
            <div
              {...dropProps(n.id)}
              onDragOver={(e) => {
                dropProps(n.id).onDragOver(e)
                // hold a folder over a closed one for a moment and it opens, so you can reach what is inside
                if (drag && kids.length > 0 && !isOpen && openTimer.current === undefined) {
                  openTimer.current = window.setTimeout(() => {
                    setExpanded((x) => new Set(x).add(n.id))
                    openTimer.current = undefined
                  }, 600)
                }
              }}
              onDragLeave={() => {
                dropProps(n.id).onDragLeave()
                stopOpening()
              }}
              {...(movable(n) ? dragProps('folder', n.id) : {})}
              className={`group flex items-center gap-1 rounded-[10px] pr-1 transition ${drag?.kind === 'folder' && drag.id === n.id ? 'opacity-40' : ''} ${isOver(n.id) ? dropRing : active ? 'bg-brand-soft font-semibold text-brand-dark' : 'hover:bg-canvas'}`}
              style={{ paddingLeft: 4 + depth * 14 }}
            >
              <button
                type="button"
                aria-label={isOpen ? `Collapse ${n.name}` : `Expand ${n.name}`}
                onClick={() => toggle(n.id)}
                className={`flex h-7 w-6 items-center justify-center text-muted ${kids.length ? '' : 'invisible'}`}
              >
                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              <button type="button" onClick={() => go(n.id)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left">
                {n.kind === 'client' ? <Avatar name={n.name} size={22} /> : n.kind === 'firm' ? <Building2 size={15} className="shrink-0" /> : <Folder size={15} className="shrink-0" />}
                <span className="truncate">{n.name}</span>
              </button>
              <div className="opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 has-[[aria-expanded=true]]:opacity-100 pointer-coarse:opacity-100">
                <ItemMenu compact label={n.name} actions={folderActions(n)} />
              </div>
            </div>
            {isOpen && renderTree(n.id, depth + 1)}
          </div>
        )
      })

  const clientForPreview = open ? getClient(clientOf(open.folderId) ?? '') : undefined

  return (
    <div className="flex h-full md:min-h-[640px]">
      {treeOpen && <button type="button" aria-label="Close folders" onClick={() => setTreeOpen(false)} className="fixed inset-0 z-30 bg-ink/40 md:hidden" />}
      <aside className={`flex w-[290px] shrink-0 flex-col border-r border-line bg-white max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:w-[86%] max-md:shadow-2xl ${treeOpen ? '' : 'max-md:hidden'}`}>
        <div className="px-4 pb-3 pt-6">
          <h1 className="text-[24px] font-bold tracking-tight">Document Master</h1>
          <label className="mt-3 flex h-10 items-center gap-2.5 rounded-xl bg-canvas px-3.5 text-sm text-muted">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search folders" className="w-full bg-transparent outline-none placeholder:text-muted" />
          </label>
        </div>
        <nav {...dropProps(null)} className="relative flex-1 overflow-y-auto px-2 pb-4 text-sm font-medium text-slate-700">
          <button
            type="button"
            onClick={() => go(null)}
            {...dropProps(null)}
            className={`mb-1 flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left ${isOver(null) ? dropRing : current === null ? 'bg-brand-soft font-semibold text-brand-dark' : 'hover:bg-canvas'}`}
          >
            <Folder size={15} />
            All folders
          </button>
          <div className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-widest text-faint">Firm</div>
          {renderTree(null, 0, (n) => n.kind === 'firm' || n.kind === 'custom')}
          <div className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-widest text-faint">Clients</div>
          {renderTree(null, 0, (n) => n.kind === 'client', sideLimit)}
          {topMatches((n) => n.kind === 'client').length > sideLimit && (
            <button type="button" onClick={() => setSideLimit((l) => l + SIDE_PAGE)} className="mx-1 mt-1 w-[calc(100%-8px)] rounded-[10px] px-3 py-2 text-left text-[13px] font-semibold text-brand-dark hover:bg-canvas">
              Show {Math.min(SIDE_PAGE, topMatches((n) => n.kind === 'client').length - sideLimit)} more · {topMatches((n) => n.kind === 'client').length - sideLimit} left
            </button>
          )}
          {drag && (
            <div className="pointer-events-none sticky bottom-2 mx-1 mt-3 rounded-xl border border-line bg-ink px-3 py-2.5 text-xs leading-relaxed text-white shadow-lg">
              Drop on a folder to move it inside. Drop on <b>All folders</b> or an empty space to move it to the top level.
            </div>
          )}
        </nav>
      </aside>

      <section
        className="relative flex min-h-0 min-w-0 flex-1 flex-col"
        onDragOver={(e) => {
          if (hasFiles(e)) {
            e.preventDefault()
            setOutside(true)
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node)) setOutside(false)
        }}
        onDrop={(e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          setOutside(false)
          uploadTo(current, e.dataTransfer.files)
        }}
      >
        {drag && node && canDrop(node.parentId) && (
          <div
            {...dropProps(node.parentId)}
            className={`absolute inset-x-8 bottom-5 z-30 flex h-16 items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed text-sm font-semibold transition ${
              isOver(node.parentId) ? 'border-brand bg-brand-soft text-brand-dark shadow-lg' : 'border-slate-300 bg-white/95 text-slate-600 shadow-[0_8px_24px_rgba(14,27,44,0.12)]'
            }`}
          >
            <FolderUp size={19} />
            Drop here to move out to {node.parentId ? byId.get(node.parentId)?.name : 'the top level'}
          </div>
        )}
        {outside && !over && (
          <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand bg-brand-soft/80">
            <div className="text-center">
              <Upload size={30} className="mx-auto text-brand-dark" />
              <p className="mt-2 text-base font-bold text-brand-dark">Drop to add to {node ? node.name : 'the top level'}</p>
              <p className="text-sm text-slate-600">Or drop on a folder to add it there.</p>
            </div>
          </div>
        )}
        <div className="flex shrink-0 flex-col gap-3 border-b border-line px-4 pb-3 pt-3 md:px-8 md:pb-4 md:pt-6">
          <button type="button" onClick={() => setTreeOpen(true)} className="flex h-10 w-fit items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm font-semibold md:hidden">
            <Folders size={16} />
            All folders
          </button>
          <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted" aria-label="Breadcrumb">
            <button type="button" onClick={() => go(null)} {...dropProps(null)} className={`rounded px-1 ${isOver(null) ? dropRing : ''} ${here.length === 0 ? 'font-semibold text-ink' : 'hover:text-ink hover:underline'}`}>
              Document Master
            </button>
            {here.map((n, i) => (
              <span key={n.id} className="flex items-center gap-1.5">
                <ChevronRight size={13} />
                <button type="button" onClick={() => go(n.id)} {...dropProps(n.id)} className={`rounded px-1 ${isOver(n.id) ? dropRing : ''} ${i === here.length - 1 ? 'font-semibold text-ink' : 'hover:text-ink hover:underline'}`}>
                  {n.name}
                </button>
              </span>
            ))}
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-xl font-bold leading-tight tracking-tight">{node ? node.name : 'All folders'}</h2>
                {node && <ItemMenu compact label={node.name} actions={folderActions(node)} />}
              </div>
              <p className="mt-0.5 text-sm text-muted">
                {subFolders.length} {subFolders.length === 1 ? 'folder' : 'folders'} · {total} {total === 1 ? 'file' : 'files'} inside{node?.kind === 'client' && ' · Named after the client'}
              </p>
            </div>
            <div className="flex w-full shrink-0 items-center gap-2 md:w-auto md:gap-2.5">
              <button
                type="button"
                onClick={() => openNewFolder(current)}
                className="flex h-11 shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-canvas max-md:flex-1 max-md:px-2"
              >
                <FolderPlus size={16} />
                New folder
              </button>
              <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
              <button type="button" onClick={() => pickFiles(current)} className="flex h-11 shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-canvas max-md:flex-1 max-md:px-2">
                <Upload size={16} />
                <span className="max-md:hidden">Upload file</span>
                <span className="md:hidden">Upload</span>
              </button>
              <button
                type="button"
                disabled={total === 0}
                onClick={() => setToast(`Preparing a ZIP of ${total} files…`)}
                className="flex h-11 shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)] max-md:flex-1 max-md:px-2 disabled:opacity-40 disabled:shadow-none"
              >
                <Download size={16} />
                <span className="max-md:hidden">Download ZIP</span>
                <span className="md:hidden">ZIP</span>
              </button>
            </div>
          </div>
        </div>

        <motion.div key={current ?? 'top'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 md:gap-5 md:px-8 md:py-5">
        {(() => {
          // At the top, the firm's own folders stay in their own short block above the (possibly huge) list of clients.
          const atTop = current === null
          const firmFolders = atTop ? subFolders.filter((n) => n.kind !== 'client') : []
          const q = clientQuery.trim().toLowerCase()
          const shownFolders = (atTop ? subFolders.filter((n) => n.kind === 'client') : subFolders).filter((n) => !q || n.name.toLowerCase().includes(q))
          const grid = (list: Node[]) => (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
            {list.map((n) => (
              <div key={n.id} className="group relative" {...dropProps(n.id)} {...(movable(n) ? dragProps('folder', n.id) : {})}>
                <button
                  type="button"
                  onClick={() => go(n.id)}
                  className={`flex w-full items-center gap-3.5 rounded-2xl border bg-white p-4 pr-12 text-left hover:border-brand hover:shadow-sm ${isOver(n.id) ? 'border-brand bg-brand-soft ring-2 ring-brand' : 'border-line'}`}
                >
                  {n.kind === 'client' ? (
                    <Avatar name={n.name} size={48} />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                      {n.kind === 'firm' ? <Building2 size={24} /> : <Folder size={24} />}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{n.name}</span>
                    <span className="text-[13px] text-muted">{folderMeta(n)}</span>
                  </span>
                </button>
                <div className="absolute inset-y-0 right-2 flex items-center opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 has-[[aria-expanded=true]]:opacity-100 pointer-coarse:opacity-100">
                  <ItemMenu label={n.name} actions={folderActions(n)} />
                </div>
              </div>
            ))}
            </div>
          )
          const more = shownFolders.length - gridLimit
          return (
            <>
              {firmFolders.length > 0 && (
                <section>
                  <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-faint">Firm folders</h3>
                  {grid(firmFolders)}
                </section>
              )}
              {(shownFolders.length > 0 || q) && (
                <section>
                  <div className="mb-2.5 flex items-center justify-between gap-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-faint">{atTop ? `Client folders · ${subFolders.filter((n) => n.kind === 'client').length}` : 'Folders'}</h3>
                    {subFolders.length > PAGE && (
                      <label className="flex h-9 w-60 items-center gap-2 rounded-xl bg-white px-3 text-sm text-muted ring-1 ring-line focus-within:ring-brand">
                        <Search size={14} />
                        <input value={clientQuery} onChange={(e) => { setClientQuery(e.target.value); setGridLimit(PAGE) }} placeholder={atTop ? 'Search client folders' : 'Search folders'} className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
                      </label>
                    )}
                  </div>
                  {shownFolders.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-muted">No folder found.</p> : grid(shownFolders.slice(0, gridLimit))}
                  {more > 0 && (
                    <button type="button" onClick={() => setGridLimit((l) => l + PAGE)} className="mx-auto mt-4 flex h-10 items-center rounded-xl border border-line bg-white px-5 text-sm font-semibold hover:border-brand hover:text-brand-dark">
                      Show {Math.min(PAGE, more)} more · {more} left
                    </button>
                  )}
                </section>
              )}
            </>
          )
        })()}

        {direct.length > 0 && (
          <div className="rounded-[18px] border border-line bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted">Files in this folder</span>
              <div className="flex rounded-lg bg-canvas p-1">
                <button type="button" aria-label="Grid view" onClick={() => setView('grid')} className={`flex h-8 w-9 items-center justify-center rounded-md ${view === 'grid' ? 'bg-white shadow-sm' : 'text-muted'}`}>
                  <LayoutGrid size={16} />
                </button>
                <button type="button" aria-label="List view" onClick={() => setView('list')} className={`flex h-8 w-9 items-center justify-center rounded-md ${view === 'list' ? 'bg-white shadow-sm' : 'text-muted'}`}>
                  <List size={16} />
                </button>
              </div>
            </div>
            {view === 'grid' ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {filePaging.rows.map((f) => (
                  <div key={f.id} className="group relative" {...dragProps('file', f.id)}>
                    <button type="button" onClick={() => setOpen(f)} className="block w-full overflow-hidden rounded-2xl border border-line text-left hover:border-brand hover:shadow-sm">
                      <div className="flex h-36 items-center justify-center bg-gradient-to-br from-[#E4F5EE] to-[#E8F1FD]">
                        <FileTypeIcon file={f.fileName} size={64} />
                      </div>
                      <div className="px-3.5 py-3">
                        <div className="truncate text-sm font-semibold">{f.name}</div>
                        <div className="text-xs text-muted">
                          {f.size} · {f.date}
                        </div>
                      </div>
                    </button>
                    <div className="absolute right-2 top-2 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 has-[[aria-expanded=true]]:opacity-100 pointer-coarse:opacity-100">
                      <ItemMenu label={f.name} actions={fileActions(f)} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {filePaging.rows.map((f) => (
                  <div key={f.id} className="group flex items-center border-b border-line last:border-b-0 hover:bg-slate-50" {...dragProps('file', f.id)}>
                    <button type="button" onClick={() => setOpen(f)} className="flex flex-1 items-center gap-3.5 py-3 text-left">
                      <FileTypeIcon file={f.fileName} size={32} />
                      <span className="flex-1 text-sm font-semibold">{f.name}</span>
                      <span className="w-24 text-[13px] text-muted max-md:hidden">{f.size}</span>
                      <span className="w-28 text-[13px] text-muted max-md:hidden">{f.date}</span>
                      <span className="w-28 truncate text-[13px] text-muted max-md:hidden">{f.from}</span>
                    </button>
                    <div className="w-9 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 has-[[aria-expanded=true]]:opacity-100 pointer-coarse:opacity-100">
                      <ItemMenu compact label={f.name} actions={fileActions(f)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination p={filePaging} noun="files" className="-mx-5 -mb-5 mt-4 rounded-b-[18px]" />
          </div>
        )}

        {subFolders.length === 0 && direct.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-[15px] font-semibold">This folder is empty</p>
            <p className="mt-1 text-sm text-muted">Create a folder, upload a file, or drag files here.</p>
          </div>
        )}
        </motion.div>
      </section>

      {open && (
        <motion.div {...backdropProps} className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label={`Preview of ${open.name}`}>
          <motion.div {...panelProps} className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <FileTypeIcon file={open.fileName} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-bold">{open.name}</div>
                <div className="truncate text-[13px] text-muted">
                  {trail(open.folderId).map((n) => n.name).join(' / ') || 'Top level'} · {open.size}
                </div>
              </div>
              <button type="button" aria-label="Close" onClick={() => setOpen(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto bg-[#EDF0F5] px-6 py-7">
              <PaperPreview doc={open} client={clientForPreview ?? { name: 'Kartik Khandelwal & Associates', pan: '—' }} />
            </div>
            <div className="flex justify-end gap-3 border-t border-line px-5 py-3.5">
              <button type="button" onClick={() => setOpen(null)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold">
                Close
              </button>
              <OpenInTab href={fileLink({ name: open.name, fileName: open.fileName, client: clientForPreview?.name ?? 'Kartik Khandelwal & Associates', pan: clientForPreview?.pan ?? '—', from: open.date })} />
              <button type="button" onClick={() => setToast(`Downloading ${open.fileName}`)} className="flex h-11 shrink-0 items-center whitespace-nowrap gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white">
                <Download size={16} />
                Download
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {newFolder && (
        <motion.div {...backdropProps} className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="New folder">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createFolder()
            }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold">New folder</h2>
            <p className="mt-1 text-sm text-muted">It will be created inside {trail(folderParent).map((n) => n.name).join(' / ') || 'the top level'}.</p>
            <input
              autoFocus
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value)
                setFolderError('')
              }}
              placeholder="e.g. Notices, Audit, Firm documents"
              className="mt-4 h-11 w-full rounded-xl border border-line px-3.5 text-[15px] outline-none focus:border-brand"
            />
            {folderError && <p className="mt-2 text-[13px] font-medium text-danger">{folderError}</p>}
            <motion.div {...panelProps} className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setNewFolder(false)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold">
                Cancel
              </button>
              <button type="submit" className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white">
                Create
              </button>
            </motion.div>
          </form>
        </motion.div>
      )}

      {dlg && (
        <motion.div {...backdropProps} className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label={`${dlg.type} ${dlg.target.name}`}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitDialog()
            }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            {dlg.type === 'rename' && (
              <>
                <h2 className="text-lg font-bold">Rename {dlg.target.kind}</h2>
                <input
                  autoFocus
                  value={dlgText}
                  onChange={(e) => {
                    setDlgText(e.target.value)
                    setDlgError('')
                  }}
                  className="mt-4 h-11 w-full rounded-xl border border-line px-3.5 text-[15px] outline-none focus:border-brand"
                />
                {dlgError && <p className="mt-2 text-[13px] font-medium text-danger">{dlgError}</p>}
              </>
            )}
            {dlg.type === 'move' && (
              <>
                <h2 className="text-lg font-bold">Move “{dlg.target.name}”</h2>
                <p className="mt-1 text-sm text-muted">Choose where it should go.</p>
                <motion.div {...panelProps} className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-line py-1">
                  {[{ node: null as Node | null, depth: 0 }, ...destinations(dlg.target)].map(({ node: n, depth }) => {
                    const id = n ? n.id : null
                    return (
                      <button
                        key={id ?? 'top'}
                        type="button"
                        role="radio"
                        aria-checked={dest === id}
                        onClick={() => setDest(id)}
                        className={`flex w-full items-center gap-2.5 py-2 pr-3 text-left text-sm ${dest === id ? 'bg-brand-soft font-semibold text-brand-dark' : 'hover:bg-canvas'}`}
                        style={{ paddingLeft: 14 + depth * 16 }}
                      >
                        <Folder size={15} className="shrink-0" />
                        <span className="truncate">{n ? n.name : 'Top level'}</span>
                      </button>
                    )
                  })}
                </motion.div>
              </>
            )}
            {dlg.type === 'delete' && (
              <>
                <h2 className="text-lg font-bold">Delete “{dlg.target.name}”?</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {dlg.target.kind === 'folder'
                    ? (() => {
                        const ids = subtree(dlg.target.id)
                        const nFiles = files.filter((f) => ids.has(f.folderId)).length
                        const nFolders = ids.size - 1
                        return `This removes ${nFiles} ${nFiles === 1 ? 'file' : 'files'} and ${nFolders} ${nFolders === 1 ? 'folder' : 'folders'} inside it from Document Master. The requests they came from are not changed.`
                      })()
                    : 'This file is removed from Document Master. The request it came from is not changed.'}
                </p>
              </>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setDlg(null)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold">
                Cancel
              </button>
              <button type="submit" className={`h-11 rounded-xl px-6 text-sm font-semibold text-white ${dlg.type === 'delete' ? 'bg-danger' : 'bg-brand'}`}>
                {dlg.type === 'rename' ? 'Save' : dlg.type === 'move' ? 'Move here' : 'Delete'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <Toast message={toast} />
    </div>
  )
}
