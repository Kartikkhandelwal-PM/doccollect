import { backdropProps, panelProps } from '../lib/motion'
import { motion } from 'framer-motion'
import { ChevronRight, Download, Folder, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMasterFiles } from '../data/masterFiles'
import type { MasterFile } from '../data/master'
import { useMasterStore } from '../data/masterStore'
import { getClient } from '../data/mock'
import FileTypeIcon from './FileTypeIcon'
import OpenInTab from './OpenInTab'
import PaperPreview from './PaperPreview'
import { fileLink } from '../lib/fileLink'

interface Node {
  id: string
  name: string
  parentId: string | null
}

// One client's part of the Document Master: their folders and approved files, right on the client page.
export default function ClientRepository({ clientId }: { clientId: string }) {
  const masterFiles = useMasterFiles()
  const { folders: custom } = useMasterStore()
  const client = getClient(clientId)
  const rootId = `c:${clientId}`
  const [current, setCurrent] = useState(rootId)
  const [open, setOpen] = useState<MasterFile | null>(null)

  // Folders and files that belong to this client (the automatic ones, plus any the CA made inside them).
  const { nodes, files } = useMemo(() => {
    const all = masterFiles
    const map = new Map<string, Node>()
    for (const f of all) {
      const m = f.folderId?.match(/^c:([^/]+)\/([^/]+)\/(.+)$/)
      if (!m || m[1] !== clientId) continue
      const y = `${rootId}/${m[2]}`
      map.set(rootId, { id: rootId, name: client?.name ?? clientId, parentId: null })
      map.set(y, { id: y, name: m[2], parentId: rootId })
      map.set(f.folderId!, { id: f.folderId!, name: m[3], parentId: y })
    }
    const mine = new Set(map.keys())
    let grew = true
    while (grew) {
      grew = false
      for (const c of custom) {
        if (!mine.has(c.id) && c.parentId && mine.has(c.parentId)) {
          map.set(c.id, { id: c.id, name: c.name, parentId: c.parentId })
          mine.add(c.id)
          grew = true
        }
      }
    }
    return { nodes: [...map.values()], files: all.filter((f) => f.folderId && mine.has(f.folderId)) }
  }, [masterFiles, custom, clientId, rootId, client?.name])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const here = byId.get(current) ? current : rootId
  const trail: Node[] = []
  for (let n = byId.get(here); n; n = n.parentId ? byId.get(n.parentId) : undefined) trail.unshift(n)

  const kids = nodes.filter((n) => n.parentId === here)
  const direct = files.filter((f) => f.folderId === here)
  const under = (id: string): number => files.filter((f) => f.folderId === id).length + nodes.filter((n) => n.parentId === id).reduce((s, n) => s + under(n.id), 0)

  if (nodes.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <p className="text-[15px] font-semibold">Nothing in the repository yet</p>
        <p className="mt-1 text-sm text-muted">Documents you approve are filed here, by year and compliance.</p>
      </div>
    )
  }

  return (
    <section className="rounded-[18px] border border-line bg-white px-4 py-4 md:px-6 md:py-5">
      <div className="flex items-center justify-between gap-4">
        <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted" aria-label="Folder path">
          {trail.map((n, i) => (
            <span key={n.id} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={13} />}
              <button type="button" onClick={() => setCurrent(n.id)} className={i === trail.length - 1 ? 'font-semibold text-ink' : 'hover:text-ink hover:underline'}>
                {i === 0 ? 'Repository' : n.name}
              </button>
            </span>
          ))}
        </nav>
        <Link to="/master" className="shrink-0 text-[13px] font-semibold text-brand">
          Open in Document Master
        </Link>
      </div>

      {kids.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-3.5">
          {kids.map((n) => (
            <button key={n.id} type="button" onClick={() => setCurrent(n.id)} className="flex items-center gap-3.5 rounded-2xl border border-line p-3.5 text-left hover:border-brand hover:shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                <Folder size={22} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold">{n.name}</span>
                <span className="text-[13px] text-muted">{under(n.id) === 0 ? 'Empty' : `${under(n.id)} ${under(n.id) === 1 ? 'file' : 'files'}`}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {direct.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-3.5">
          {direct.map((f) => (
            <button key={f.id} type="button" onClick={() => setOpen(f)} className="overflow-hidden rounded-2xl border border-line text-left hover:border-brand hover:shadow-sm">
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-[#E4F5EE] to-[#E8F1FD]">
                <FileTypeIcon file={f.fileName} size={52} />
              </div>
              <div className="px-3.5 py-2.5">
                <div className="truncate text-sm font-semibold">{f.name}</div>
                <div className="text-xs text-muted">
                  {f.size} · {f.date}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {kids.length === 0 && direct.length === 0 && <p className="mt-4 text-sm text-muted">This folder is empty.</p>}

      {open && (
        <motion.div {...backdropProps} className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label={`Preview of ${open.name}`}>
          <motion.div {...panelProps} className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <FileTypeIcon file={open.fileName} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-bold">{open.name}</div>
                <div className="truncate text-[13px] text-muted">
                  {client?.name} · {open.size} · from {open.from}
                </div>
              </div>
              <OpenInTab iconOnly href={fileLink({ name: open.name, fileName: open.fileName, client: client?.name ?? '', pan: client?.pan ?? '', from: open.date })} />
              <button type="button" aria-label="Close" onClick={() => setOpen(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto bg-[#EDF0F5] px-6 py-7">
              <PaperPreview doc={open} client={client ?? { name: '', pan: '' }} />
            </div>
            <div className="flex justify-end gap-3 border-t border-line px-5 py-3.5">
              <button type="button" onClick={() => setOpen(null)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold">
                Close
              </button>
              <button type="button" className="flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white">
                <Download size={16} />
                Download
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </section>
  )
}
