import { useSessionState } from '../lib/session'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { groups as seedGroups, templates as seedTemplates } from './catalog'
import { seedMessages } from './messageTemplates'
import type { MsgTemplate } from './messageTemplates'


// The firm's own WhatsApp: which number, through whom, and whether the test message arrived.
export interface WhatsAppLink {
  number: string
  displayName: string // the business name clients see on WhatsApp
  provider: string // Ramwin, or the provider the firm already uses
  route: 'ramwin' | 'provider'
  channelId: string // the channel (sender / phone number) ID
}

interface DocItem {
  id: string
  name: string
  group: string
}
export interface Compliance {
  id: string
  name: string
  docIds: string[]
}
export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'Owner' | 'Admin' | 'Staff'
}
export interface Firm {
  name: string
  logo: string // an image (data URL). Empty means we show the initials.
  email: string
  phone: string
  address: string
  gstin: string
}

const seedDocs: DocItem[] = seedGroups.flatMap((g) => g.docs.map((d) => ({ id: d.id, name: d.name, group: g.title })))
const seedCompliances: Compliance[] = seedTemplates.filter((t) => t.id !== 'custom').map((t) => ({ id: t.id, name: t.name, docIds: t.docIds }))

const seedTeam: TeamMember[] = [
  { id: 't1', name: 'Kartik Khandelwal', email: 'kartik@khandelwal.example', role: 'Owner' },
  { id: 't2', name: 'Rahul Verma', email: 'rahul@khandelwal.example', role: 'Admin' },
  { id: 't3', name: 'Neha Gupta', email: 'neha@khandelwal.example', role: 'Staff' },
]

interface Store {
  documents: DocItem[]
  groups: { title: string; docs: DocItem[] }[] // only categories that have documents (for checklists)
  categories: string[] // every category, including empty ones (for the Documents list page)
  addDocument: (name: string, group: string) => void
  renameDocument: (id: string, name: string) => void
  moveDocument: (id: string, group: string) => void
  removeDocument: (id: string) => void
  addCategory: (name: string) => void
  renameCategory: (from: string, to: string) => void
  removeCategory: (name: string) => void

  compliances: Compliance[]
  templates: Compliance[] // compliances plus the built-in "Custom" choice used by the request wizard
  addCompliance: () => string
  updateCompliance: (id: string, patch: Partial<Compliance>) => void
  removeCompliance: (id: string) => void

  messageTemplates: MsgTemplate[]

  firm: Firm
  saveFirm: (f: Firm) => void
  team: TeamMember[]
  invite: (email: string, role: TeamMember['role']) => void
  setRole: (id: string, role: TeamMember['role']) => void
  removeMember: (id: string) => void
  whatsapp: WhatsAppLink | null // the firm's own WhatsApp, once connected
  connectWhatsApp: (link: WhatsAppLink | null) => void
  ownNumber: string | null // the connected number, for the places that only need that
  graceDays: number // how many days after the last date an upload link keeps working
  setGraceDays: (n: number) => void
  readReplies: boolean // read client replies sent to the firm's own WhatsApp number
  setReadReplies: (v: boolean) => void
}

const Ctx = createContext<Store | null>(null)

export function SetupProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState(seedDocs)
  const [categories, setCategories] = useState<string[]>(seedGroups.map((g) => g.title))
  const [compliances, setCompliances] = useState(seedCompliances)
  const [messageTemplates] = useState(seedMessages)
  const [firm, setFirm] = useState<Firm>({
    name: 'Kartik Khandelwal & Associates',
    logo: '',
    email: 'office@khandelwal.example',
    phone: '+91 98765 43210',
    address: '214, Business Square, Connaught Place, New Delhi',
    gstin: '07AAAFS1234K1Z9',
  })
  const [team, setTeam] = useState(seedTeam)
  const [whatsapp, connectWhatsApp] = useSessionState<WhatsAppLink | null>('whatsapp', {
    number: '+91 98765 43210',
    displayName: 'Kartik Khandelwal & Associates',
    provider: 'Ramwin',
    route: 'ramwin',
    channelId: 'ch_7q2m9xk4',
  })
  const [graceDays, setGraceDays] = useSessionState('graceDays', 7)
  const [readReplies, setReadReplies] = useSessionState('readReplies', true)

  const addDocument = useCallback((name: string, group: string) => {
    setDocuments((p) => [...p, { id: `d-${Date.now()}`, name, group }])
    setCategories((p) => (p.includes(group) ? p : [...p, group]))
  }, [])
  const moveDocument = useCallback((id: string, group: string) => {
    setDocuments((p) => p.map((d) => (d.id === id ? { ...d, group } : d)))
    setCategories((p) => (p.includes(group) ? p : [...p, group]))
  }, [])
  const addCategory = useCallback((name: string) => setCategories((p) => (p.includes(name) ? p : [...p, name])), [])
  const renameCategory = useCallback((from: string, to: string) => {
    setCategories((p) => p.map((c) => (c === from ? to : c)))
    setDocuments((p) => p.map((d) => (d.group === from ? { ...d, group: to } : d)))
  }, [])
  const removeCategory = useCallback((name: string) => setCategories((p) => p.filter((c) => c !== name)), [])
  const renameDocument = useCallback((id: string, name: string) => setDocuments((p) => p.map((d) => (d.id === id ? { ...d, name } : d))), [])
  const removeDocument = useCallback((id: string) => {
    setDocuments((p) => p.filter((d) => d.id !== id))
    setCompliances((p) => p.map((c) => ({ ...c, docIds: c.docIds.filter((x) => x !== id) })))
  }, [])

  const addCompliance = useCallback(() => {
    const id = `cp-${Date.now()}`
    setCompliances((p) => [...p, { id, name: 'New compliance', docIds: [] }])
    return id
  }, [])
  const updateCompliance = useCallback(
    (id: string, patch: Partial<Compliance>) => setCompliances((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    [],
  )
  const removeCompliance = useCallback((id: string) => setCompliances((p) => p.filter((c) => c.id !== id)), [])

  const invite = useCallback(
    (email: string, role: TeamMember['role']) =>
      setTeam((p) => [...p, { id: `t-${Date.now()}`, name: email.split('@')[0], email, role }]),
    [],
  )
  const setRole = useCallback((id: string, role: TeamMember['role']) => setTeam((p) => p.map((m) => (m.id === id ? { ...m, role } : m))), [])
  const removeMember = useCallback((id: string) => setTeam((p) => p.filter((m) => m.id !== id)), [])

  const groups = useMemo(
    () => categories.map((title) => ({ title, docs: documents.filter((d) => d.group === title) })).filter((g) => g.docs.length > 0),
    [categories, documents],
  )
  const templates = useMemo(() => [...compliances, { id: 'custom', name: 'Custom', docIds: [] }], [compliances])

  const value = useMemo<Store>(
    () => ({
      documents, groups, categories, addDocument, renameDocument, moveDocument, removeDocument, addCategory, renameCategory, removeCategory,
      compliances, templates, addCompliance, updateCompliance, removeCompliance,
      messageTemplates,
      firm, saveFirm: setFirm, team, invite, setRole, removeMember,
      whatsapp, connectWhatsApp, ownNumber: whatsapp?.number ?? null, graceDays, setGraceDays, readReplies, setReadReplies,
    }),
    [documents, groups, categories, addDocument, renameDocument, moveDocument, removeDocument, addCategory, renameCategory, removeCategory, compliances, templates, addCompliance, updateCompliance, removeCompliance, messageTemplates, firm, team, invite, setRole, removeMember, whatsapp, graceDays, readReplies],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSetup() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSetup must be used inside SetupProvider')
  return v
}
