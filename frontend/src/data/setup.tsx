import { useSessionState } from '../lib/session'
import { emptyOn } from '../lib/demo'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Service } from './types'
import { groups as seedGroups, multipleIds, optionalIds, templates as seedTemplates } from './catalog'
import { seedMessages } from './messageTemplates'
import type { MsgTemplate } from './messageTemplates'


// The firm's own WhatsApp: which number, through whom, and whether the test message arrived.
export interface WhatsAppLink {
  number: string
  displayName: string // the business name clients see on WhatsApp
  provider: string // Ramwin
  route: 'ramwin'
  channelId: string // the channel ID Ramwin gave back. The API key stays on the server, it is never shown.
  connectedAt?: string // when it was connected, like "12 Oct 2026"
}

export interface DocItem {
  id: string
  name: string
  group: string
  multiple?: boolean // the client may send more than one file for this document
  optional?: boolean // asked "if you have it" by default; each request can change that
  once?: boolean // one file is enough for good (PAN, Aadhaar): it belongs to no year, and counts in every year
}
export interface Compliance {
  id: string
  name: string
  kind: Service // ITR, GST or TDS. Picked when the checklist is made.
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

// Papers that are kept once and stay good: ID proofs and the firm's own registrations. Everything else is asked again every year.
const onceIds = new Set(['pan', 'aadhaar', 'passport', 'address', 'photo', 'voterid', 'dl', 'sign', 'udyam', 'coi', 'moa', 'dsc', 'tanreg', 'gstcert', 'deed', 'shopact', 'fssai', 'iec', 'tradelic', 'ptreg', 'firmpan', 'reg12a', 'trust12a', 'dir3kyc', 'dinkyc'])

const seedDocs: DocItem[] = seedGroups.flatMap((g) => g.docs.map((d) => ({ id: d.id, name: d.name, group: g.title, multiple: multipleIds.has(d.id), once: onceIds.has(d.id), optional: optionalIds.has(d.id) })))
const seedCompliances: Compliance[] = seedTemplates.filter((t) => t.id !== 'custom').map((t) => ({ id: t.id, name: t.name, kind: t.kind, docIds: t.docIds }))

const seedTeam: TeamMember[] = [
  { id: 't1', name: 'Kartik Khandelwal', email: 'kartik@khandelwal.example', role: 'Owner' },
  { id: 't2', name: 'Rahul Verma', email: 'rahul@khandelwal.example', role: 'Admin' },
  { id: 't3', name: 'Neha Gupta', email: 'neha@khandelwal.example', role: 'Staff' },
]

interface Store {
  documents: DocItem[]
  groups: { title: string; docs: DocItem[] }[] // only categories that have documents (for checklists)
  categories: string[] // every category, including empty ones (for the Documents list page)
  addDocument: (name: string, group: string, multiple?: boolean, once?: boolean, optional?: boolean) => string
  setDocumentOptional: (id: string, on: boolean) => void
  setDocumentOnce: (id: string, on: boolean) => void
  onceIds: ReadonlySet<string> // the documents that are kept once, for good
  setDocumentMultiple: (id: string, on: boolean) => void
  renameDocument: (id: string, name: string) => void
  moveDocument: (id: string, group: string) => void
  removeDocument: (id: string, replaceWith?: string) => void
  addCategory: (name: string) => void
  renameCategory: (from: string, to: string) => void
  removeCategory: (name: string) => void

  compliances: Compliance[]
  templates: Compliance[] // compliances plus the built-in "Custom" choice used by the request wizard
  addCompliance: (name: string, kind: Service, docIds?: string[]) => string
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
  sendFrom: 'own' | 'kdk' // the number the firm chose to send from, once, in Settings
  setSendFrom: (v: 'own' | 'kdk') => void
  approvedTemplates: string[] // message templates WhatsApp has approved for the firm's own number
  approveTemplates: () => void
  // The number a message really goes from: the firm's own only when it is connected, chosen, and WhatsApp has approved that message's template. Otherwise CA Connect.
  viaFor: (via: 'own' | 'kdk', templateId: string) => 'own' | 'kdk'
  graceDays: number // how many days after the last date an upload link keeps working
  setGraceDays: (n: number) => void
  readReplies: boolean // read client replies sent to the firm's own WhatsApp number
  setReadReplies: (v: boolean) => void
}

const Ctx = createContext<Store | null>(null)

export function SetupProvider({ children }: { children: ReactNode }) {
  // The documents and checklists are kept for the tab, like the requests, so a refresh keeps what was added, renamed or deleted.
  const [documents, setDocuments] = useSessionState('documents', seedDocs)
  const [categories, setCategories] = useSessionState<string[]>('doc-categories', seedGroups.map((g) => g.title))
  const [compliances, setCompliances] = useSessionState('checklists', seedCompliances)
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
  const [whatsapp, setWhatsapp] = useSessionState<WhatsAppLink | null>('whatsapp', emptyOn() ? null : {
    number: '+91 98765 43210',
    displayName: 'Kartik Khandelwal & Associates',
    provider: 'Ramwin',
    route: 'ramwin',
    channelId: 'ch_7q2m9xk4',
    connectedAt: '12 Oct 2026',
  })
  const [sendFrom, setSendFrom] = useSessionState<'own' | 'kdk'>('sendFrom', emptyOn() ? 'kdk' : 'own')
  // The sample firm connected a while ago, so all its templates are approved. A number connected now starts with none, until WhatsApp approves them.
  const [approvedTemplates, setApprovedTemplates] = useSessionState<string[]>('waApproved', emptyOn() ? [] : seedMessages.map((m) => m.id))
  const connectWhatsApp = useCallback(
    (link: WhatsAppLink | null) => {
      setWhatsapp(link)
      setApprovedTemplates([])
      setSendFrom(link ? 'own' : 'kdk')
    },
    [setWhatsapp, setApprovedTemplates, setSendFrom],
  )
  // Demo of WhatsApp's review: the first check finds some approved, the next one all of them.
  const approveTemplates = useCallback(() => setApprovedTemplates((a) => (a.length === 0 ? seedMessages.slice(0, 7).map((m) => m.id) : seedMessages.map((m) => m.id))), [setApprovedTemplates])
  const viaFor = useCallback((via: 'own' | 'kdk', templateId: string): 'own' | 'kdk' => (via === 'own' && whatsapp && approvedTemplates.includes(templateId) ? 'own' : 'kdk'), [whatsapp, approvedTemplates])
  const [graceDays, setGraceDays] = useSessionState('graceDays', 7)
  const [readReplies, setReadReplies] = useSessionState('readReplies', true)

  const addDocument = useCallback((name: string, group: string, multiple = false, once = false, optional = false) => {
    const id = `d-${Date.now()}`
    setDocuments((p) => [...p, { id, name, group, multiple, once, optional }])
    setCategories((p) => (p.includes(group) ? p : [...p, group]))
    return id
  }, [])
  const setDocumentOptional = useCallback((id: string, on: boolean) => setDocuments((p) => p.map((d) => (d.id === id ? { ...d, optional: on } : d))), [])
  const setDocumentOnce = useCallback((id: string, on: boolean) => setDocuments((p) => p.map((d) => (d.id === id ? { ...d, once: on } : d))), [])
  const onceIdSet = useMemo(() => new Set(documents.filter((d) => d.once).map((d) => d.id)), [documents])
  const setDocumentMultiple = useCallback((id: string, on: boolean) => setDocuments((p) => p.map((d) => (d.id === id ? { ...d, multiple: on } : d))), [])
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
  // The document goes from the list. In the checklists it is taken out, or (when its files were moved to another document) swapped for that one.
  const removeDocument = useCallback((id: string, replaceWith?: string) => {
    setDocuments((p) => p.filter((d) => d.id !== id))
    setCompliances((p) => p.map((c) => ({ ...c, docIds: replaceWith ? [...new Set(c.docIds.map((x) => (x === id ? replaceWith : x)))] : c.docIds.filter((x) => x !== id) })))
  }, [])

  const addCompliance = useCallback((name: string, kind: Service, docIds: string[] = []) => {
    const id = `cp-${Date.now()}`
    setCompliances((p) => [...p, { id, name, kind, docIds }])
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
  const templates = useMemo(() => [...compliances, { id: 'custom', name: 'Custom', kind: 'ITR' as Service, docIds: [] }], [compliances])

  const value = useMemo<Store>(
    () => ({
      documents, groups, categories, addDocument, setDocumentOptional, setDocumentOnce, onceIds: onceIdSet, setDocumentMultiple, renameDocument, moveDocument, removeDocument, addCategory, renameCategory, removeCategory,
      compliances, templates, addCompliance, updateCompliance, removeCompliance,
      messageTemplates,
      firm, saveFirm: setFirm, team, invite, setRole, removeMember,
      whatsapp, connectWhatsApp, ownNumber: whatsapp?.number ?? null, sendFrom, setSendFrom, approvedTemplates, approveTemplates, viaFor, graceDays, setGraceDays, readReplies, setReadReplies,
    }),
    [documents, groups, categories, addDocument, setDocumentOptional, setDocumentOnce, onceIdSet, setDocumentMultiple, renameDocument, moveDocument, removeDocument, addCategory, renameCategory, removeCategory, compliances, templates, addCompliance, updateCompliance, removeCompliance, messageTemplates, firm, team, invite, setRole, removeMember, whatsapp, connectWhatsApp, sendFrom, setSendFrom, approvedTemplates, approveTemplates, viaFor, graceDays, readReplies],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSetup() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSetup must be used inside SetupProvider')
  return v
}
