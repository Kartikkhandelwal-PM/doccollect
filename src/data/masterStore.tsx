import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { MasterFile } from './master'

// A folder the CA created. parentId is any folder id, or null for the top level.
export interface CustomFolder {
  id: string
  parentId: string | null
  name: string
  // The Firm documents folder is always there: it can be renamed, but not moved or deleted.
  locked?: boolean
}

// Changes to a file that came from an approved request. The approval itself is never touched.
export interface FileEdit {
  name?: string
  folderId?: string | null
  deleted?: boolean
}

export const FIRM_FOLDER = 'firm'

interface Store {
  folders: CustomFolder[]
  uploads: MasterFile[]
  fileEdits: Record<string, FileEdit>
  folderNames: Record<string, string>
  addFolder: (parentId: string | null, name: string) => string
  addUploads: (files: MasterFile[]) => void
  renameFolder: (id: string, name: string) => void
  renameAutoFolder: (id: string, name: string) => void
  moveFolder: (id: string, parentId: string | null) => void
  deleteFolder: (id: string) => void
  renameUpload: (id: string, name: string) => void
  moveUpload: (id: string, folderId: string | null) => void
  deleteUpload: (id: string) => void
  editFile: (id: string, patch: FileEdit) => void
}

const Ctx = createContext<Store | null>(null)

// The firm's own papers, so the folder is not empty on day one. All made up.
const up = (id: string, folderId: string, name: string, ext: string, size: string, date: string): MasterFile => ({ id, folderId, name, fileName: `${name}.${ext}`, size, date, from: 'Uploaded by you' })

const seedFolders: CustomFolder[] = [
  { id: FIRM_FOLDER, parentId: null, name: 'Firm documents', locked: true },
  { id: 'f:firm-reg', parentId: FIRM_FOLDER, name: 'Registrations' },
  { id: 'f:firm-agree', parentId: FIRM_FOLDER, name: 'Agreements' },
  { id: 'f:firm-office', parentId: FIRM_FOLDER, name: 'Office and accounts' },
  { id: 'f:firm-tpl', parentId: FIRM_FOLDER, name: 'Templates' },
]

const seedUploads: MasterFile[] = [
  up('firm-1', FIRM_FOLDER, 'Firm profile and services', 'pdf', '420 KB', 'Jan 2026'),
  up('firm-2', 'f:firm-reg', 'GST registration certificate', 'pdf', '186 KB', 'Jan 2026'),
  up('firm-3', 'f:firm-reg', 'Firm PAN card', 'pdf', '152 KB', 'Jan 2026'),
  up('firm-4', 'f:firm-reg', 'Udyam registration', 'pdf', '240 KB', 'Feb 2026'),
  up('firm-5', 'f:firm-reg', 'Professional tax certificate', 'pdf', '198 KB', 'Feb 2026'),
  up('firm-6', 'f:firm-agree', 'Office rent agreement', 'pdf', '1.4 MB', 'Mar 2026'),
  up('firm-7', 'f:firm-agree', 'Partnership deed', 'pdf', '2.1 MB', 'Mar 2026'),
  up('firm-8', 'f:firm-office', 'Electricity bill Sep 2026', 'pdf', '96 KB', 'Sep 2026'),
  up('firm-9', 'f:firm-office', 'Internet bill Sep 2026', 'pdf', '88 KB', 'Sep 2026'),
  up('firm-10', 'f:firm-office', 'Staff attendance Sep 2026', 'xlsx', '64 KB', 'Sep 2026'),
  up('firm-11', 'f:firm-tpl', 'Engagement letter template', 'docx', '48 KB', 'Apr 2026'),
  up('firm-12', 'f:firm-tpl', 'Reminder letter template', 'docx', '36 KB', 'Apr 2026'),
  up('firm-13', 'f:firm-tpl', 'Invoice template', 'xlsx', '52 KB', 'Apr 2026'),
]

export function MasterProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<CustomFolder[]>(seedFolders)
  const [uploads, setUploads] = useState<MasterFile[]>(seedUploads)
  const [fileEdits, setFileEdits] = useState<Record<string, FileEdit>>({})
  const [folderNames, setFolderNames] = useState<Record<string, string>>({})

  const addFolder = useCallback((parentId: string | null, name: string) => {
    const id = `f:${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setFolders((p) => [...p, { id, parentId, name }])
    return id
  }, [])
  const addUploads = useCallback((fs: MasterFile[]) => setUploads((p) => [...fs, ...p]), [])

  const renameFolder = useCallback((id: string, name: string) => setFolders((p) => p.map((f) => (f.id === id ? { ...f, name } : f))), [])
  // Folders made by approvals (client, year, compliance) keep their place. Only the name shown can change.
  const renameAutoFolder = useCallback((id: string, name: string) => setFolderNames((p) => ({ ...p, [id]: name })), [])
  const moveFolder = useCallback((id: string, parentId: string | null) => setFolders((p) => p.map((f) => (f.id === id && !f.locked ? { ...f, parentId } : f))), [])
  // Deleting a folder also deletes the folders and uploaded files inside it.
  const deleteFolder = useCallback(
    (id: string) => {
      const gone = new Set([id])
      let grew = true
      while (grew) {
        grew = false
        for (const f of folders) if (f.parentId && gone.has(f.parentId) && !gone.has(f.id)) (gone.add(f.id), (grew = true))
      }
      setFolders((p) => p.filter((f) => !gone.has(f.id) || f.locked))
      setUploads((p) => p.filter((u) => !(u.folderId && gone.has(u.folderId))))
    },
    [folders],
  )
  const renameUpload = useCallback((id: string, name: string) => setUploads((p) => p.map((u) => (u.id === id ? { ...u, name } : u))), [])
  const moveUpload = useCallback((id: string, folderId: string | null) => setUploads((p) => p.map((u) => (u.id === id ? { ...u, folderId } : u))), [])
  const deleteUpload = useCallback((id: string) => setUploads((p) => p.filter((u) => u.id !== id)), [])
  const editFile = useCallback((id: string, patch: FileEdit) => setFileEdits((p) => ({ ...p, [id]: { ...p[id], ...patch } })), [])

  const value = useMemo(
    () => ({ folders, uploads, fileEdits, folderNames, addFolder, addUploads, renameFolder, renameAutoFolder, moveFolder, deleteFolder, renameUpload, moveUpload, deleteUpload, editFile }),
    [folders, uploads, fileEdits, folderNames, addFolder, addUploads, renameFolder, renameAutoFolder, moveFolder, deleteFolder, renameUpload, moveUpload, deleteUpload, editFile],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMasterStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMasterStore must be used inside MasterProvider')
  return v
}
