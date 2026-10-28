import { demoDay } from '../lib/dates'
import { createContext, useCallback, useContext, useMemo } from 'react'
import { useSessionState } from '../lib/session'
import type { ReactNode } from 'react'
import { multipleIds } from './catalog'
import { bulkRequest, moreRequests, rameshGst, seedUnsorted } from './seedRequests'
import type { Status } from './types'

export interface RequestDoc {
  id: string
  name: string
  status: Status
  source?: 'WhatsApp' | 'Link'
  receivedAt?: string
  fileName?: string
  multiple?: boolean // the client may send more than one file for this document (set on the document in the Documents page)
  moreFiles?: string[] // the other files, for a document that allows several: the front and back of a card, the sheets of a workbook
  reason?: string
  // Where the CA saved this approved document in Document Master (a folder id). Not set: it sits in its client's folder (the sample data).
  // null: approved, but the CA chose not to save it in a folder yet.
  filedTo?: string | null
}

// A file the client sent that we could not match to any document. It waits here until the CA puts it in the right one.
// It belongs to a phone number, so it is seen from every request of every client on that number.
export interface UnsortedFile {
  id: string
  phone: string
  fileName: string
  receivedAt: string
  source: 'WhatsApp' | 'Link'
}

export interface RequestClient {
  clientId: string
  linkVersion?: number // goes up each time a new link is sent, which switches the old one off
  docs: RequestDoc[]
  lastReminder?: string
}

export interface DocRequest {
  id: string
  ref: string
  title: string
  createdAt: string
  due: string
  via: 'own' | 'kdk'
  clients: RequestClient[]
}

export interface NewRequestInput {
  title: string
  due: string
  via: 'own' | 'kdk'
  clientIds: string[]
  docs: { id: string; name: string; multiple?: boolean }[]
}

export type RequestState = 'completed' | 'review' | 'waiting'

export const isReceived = (d: RequestDoc) => d.status !== 'pending' && d.status !== 'na'

// Documents the client marked "not applicable" do not count towards the total.
export function progress(r: DocRequest) {
  const all = r.clients.flatMap((c) => c.docs).filter((d) => d.status !== 'na')
  return { total: all.length, received: all.filter(isReceived).length, toReview: all.filter((d) => d.status === 'to_review').length }
}

export function requestState(r: DocRequest): RequestState {
  const all = r.clients.flatMap((c) => c.docs).filter((d) => d.status !== 'na')
  if (all.length > 0 && all.every((d) => d.status === 'approved')) return 'completed'
  if (all.some((d) => d.status === 'to_review')) return 'review'
  return 'waiting'
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

const doc = (id: string, name: string, status: Status, source?: 'WhatsApp' | 'Link', receivedAt?: string, reason?: string): RequestDoc => ({
  id,
  name,
  multiple: multipleIds.has(id),
  status,
  source,
  receivedAt,
  reason,
  fileName: status === 'pending' ? undefined : `${name.replace(/[^\w ]/g, '').trim()}.pdf`,
})

const seed: DocRequest[] = [
  {
    id: 'r1',
    ref: 'R-1042',
    title: 'ITR salaried',
    createdAt: demoDay('2026-09-27'),
    due: demoDay('2026-10-05'),
    via: 'own',
    clients: [
      {
        clientId: 'ramesh-itr',
        docs: [
          doc('pan', 'PAN card', 'approved', 'Link', 'Sep 28, 11:02'),
          { ...doc('aadhaar', 'Aadhaar card', 'approved', 'Link', 'Sep 28, 11:04'), fileName: 'Aadhaar card front.jpg', moreFiles: ['Aadhaar card back.jpg'] },
          doc('form16', 'Form 16 (Part A & B)', 'to_review', 'WhatsApp', 'Today, 10:42'),
          doc('26as', 'Form 26AS / AIS', 'to_review', 'Link', 'Today, 09:15'),
          doc('bank', 'Bank statement Apr–Mar', 'to_review', 'WhatsApp', 'Today, 10:44'),
          doc('homeloan', 'Home loan interest certificate', 'pending'),
          doc('lic', 'LIC premium receipts', 'pending'),
        ],
      },
    ],
  },
  {
    id: 'r2',
    ref: 'R-1043',
    title: 'GST monthly',
    createdAt: demoDay('2026-09-28'),
    due: demoDay('2026-10-03'),
    via: 'own',
    clients: [
      {
        clientId: 'priya',
        docs: [
          doc('sales', 'Sales register', 'approved', 'Link', 'Sep 29, 12:10'),
          doc('purchase', 'Purchase register', 'to_review', 'Link', 'Today, 09:58'),
          doc('gstr2b', 'GSTR-2B', 'approved', 'WhatsApp', 'Sep 29, 12:40'),
          doc('bank', 'Bank statement Apr–Mar', 'approved', 'Link', 'Sep 30, 08:20'),
        ],
      },
      {
        clientId: 'priya-ka',
        docs: [
          doc('sales', 'Sales register', 'to_review', 'Link', 'Today, 10:15'),
          doc('purchase', 'Purchase register', 'pending'),
          doc('gstr2b', 'GSTR-2B', 'pending'),
          doc('bank', 'Bank statement Apr–Mar', 'pending'),
        ],
      },
      {
        clientId: 'kapoor',
        docs: [
          doc('sales', 'Sales register', 'pending'),
          doc('purchase', 'Purchase register', 'pending'),
          doc('gstr2b', 'GSTR-2B', 'pending'),
          doc('bank', 'Bank statement Apr–Mar', 'pending'),
        ],
        lastReminder: 'Sep 29',
      },
    ],
  },
  {
    id: 'r3',
    ref: 'R-1039',
    title: 'TDS quarterly',
    createdAt: demoDay('2026-09-20'),
    due: demoDay('2026-09-28'),
    via: 'own',
    clients: [
      {
        clientId: 'anand',
        docs: [
          doc('challans', 'TDS challans', 'approved', 'WhatsApp', 'Sep 22, 10:05'),
          doc('deductees', 'Deductee list', 'approved', 'WhatsApp', 'Sep 22, 10:07'),
          doc('form16a', 'Form 16A', 'pending'),
          doc('bank', 'Bank statement Apr–Mar', 'pending'),
        ],
        lastReminder: 'Sep 27',
      },
    ],
  },
  ...moreRequests,
  bulkRequest,
  rameshGst,
]

interface Store {
  requests: DocRequest[]
  getRequest: (id: string) => DocRequest | undefined
  create: (input: NewRequestInput) => DocRequest
  setDocStatus: (requestId: string, clientId: string, docId: string, status: Status, reason?: string) => void
  remind: (requestId: string, clientId: string) => void
  simulateReply: (requestId: string) => boolean
  clientUpload: (requestId: string, clientId: string, docId: string, fileName: string) => void
  receiveFile: (requestId: string, clientId: string, docId: string, fileName: string) => void
  moveFile: (requestId: string, clientId: string, fromDocId: string, toDocId: string | null) => void
  setDocFiled: (requestId: string, clientId: string, docId: string, folderId: string | null) => void
  markNotApplicable: (requestId: string, clientId: string, docId: string, on: boolean) => void
  resetClient: (requestId: string, clientId: string) => void
  clientRemove: (requestId: string, clientId: string, docId: string) => void
  clientAddFile: (requestId: string, clientId: string, docId: string, fileName: string) => void
  unsorted: UnsortedFile[]
  addUnsorted: (files: UnsortedFile[]) => void
  useUnsorted: (fileId: string, requestId: string, clientId: string, docId: string) => void
  dropUnsorted: (fileId: string) => void
  changeDue: (requestId: string, due: string) => void
  newLink: (requestId: string, clientId: string) => void
}

const Ctx = createContext<Store | null>(null)

export function RequestsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useSessionState<DocRequest[]>('requests', seed)
  const [unsorted, setUnsorted] = useSessionState<UnsortedFile[]>('unsorted', seedUnsorted)

  const getRequest = useCallback((id: string) => requests.find((r) => r.id === id), [requests])

  const create = useCallback(
    (input: NewRequestInput) => {
      const next = 1050 + requests.length - seed.length
      const r: DocRequest = {
        id: `r${Date.now()}`,
        ref: `R-${next}`,
        title: input.title,
        createdAt: new Date().toISOString().slice(0, 10),
        due: input.due,
        via: input.via,
        clients: input.clientIds.map((clientId) => ({
          clientId,
          docs: input.docs.map((d) => ({ id: d.id, name: d.name, multiple: d.multiple, status: 'pending' as Status })),
        })),
      }
      setRequests((prev) => [r, ...prev])
      return r
    },
    [requests.length],
  )

  const patchDoc = useCallback((requestId: string, clientId: string, docId: string, patch: Partial<RequestDoc>) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id !== requestId
          ? r
          : {
              ...r,
              clients: r.clients.map((c) =>
                c.clientId !== clientId ? c : { ...c, docs: c.docs.map((d) => (d.id === docId ? { ...d, ...patch } : d)) },
              ),
            },
      ),
    )
  }, [])

  const setDocStatus = useCallback(
    (requestId: string, clientId: string, docId: string, status: Status, reason?: string) =>
      patchDoc(requestId, clientId, docId, { status, reason: status === 'rejected' ? reason : undefined }),
    [patchDoc],
  )

  const setDocFiled = useCallback((requestId: string, clientId: string, docId: string, folderId: string | null) => patchDoc(requestId, clientId, docId, { filedTo: folderId }), [patchDoc])

  const remind = useCallback((requestId: string, clientId: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id !== requestId
          ? r
          : { ...r, clients: r.clients.map((c) => (c.clientId === clientId ? { ...c, lastReminder: 'Today' } : c)) },
      ),
    )
  }, [])

  // Demo helper: pretends the client just sent the first missing document.
  const simulateReply = useCallback(
    (requestId: string) => {
      const r = requests.find((x) => x.id === requestId)
      if (!r) return false
      for (const c of r.clients) {
        const d = c.docs.find((x) => x.status === 'pending' || x.status === 'rejected')
        if (d) {
          patchDoc(requestId, c.clientId, d.id, {
            status: 'to_review',
            source: 'WhatsApp',
            receivedAt: 'Just now',
            fileName: `${d.name.replace(/[^\w ]/g, '').trim()}.pdf`,
            reason: undefined,
          })
          return true
        }
      }
      return false
    },
    [requests, patchDoc],
  )

  // What happens when the client uses the upload link.
  const clientUpload = useCallback(
    (requestId: string, clientId: string, docId: string, fileName: string) =>
      patchDoc(requestId, clientId, docId, { status: 'to_review', source: 'Link', receivedAt: 'Just now', fileName, moreFiles: undefined, reason: undefined }),
    [patchDoc],
  )
  const clientAddFile = useCallback(
    (requestId: string, clientId: string, docId: string, fileName: string) =>
      setRequests((prev) => prev.map((r) => (r.id !== requestId ? r : { ...r, clients: r.clients.map((c) => (c.clientId !== clientId ? c : { ...c, docs: c.docs.map((d) => (d.id === docId && d.multiple ? { ...d, moreFiles: [...(d.moreFiles ?? []), fileName] } : d)) })) }))),
    [],
  )
  const markNotApplicable = useCallback(
    (requestId: string, clientId: string, docId: string, on: boolean) =>
      patchDoc(requestId, clientId, docId, { status: on ? 'na' : 'pending', reason: undefined }),
    [patchDoc],
  )

  const clientRemove = useCallback(
    (requestId: string, clientId: string, docId: string) =>
      patchDoc(requestId, clientId, docId, { status: 'pending', fileName: undefined, moreFiles: undefined, receivedAt: undefined, source: undefined, reason: undefined, filedTo: undefined }),
    [patchDoc],
  )

  // The CA puts a waiting file into one of this client's missing documents. It then goes to review like any other.
  // Not a document for this request: it leaves the waiting list (the caller keeps it elsewhere or removes it).
  const addUnsorted = useCallback((files: UnsortedFile[]) => setUnsorted((u) => [...files, ...u]), [])
  const dropUnsorted = useCallback((fileId: string) => setUnsorted((u) => u.filter((x) => x.id !== fileId)), [])

  // The AI put a file on the wrong document. It moves to another one (the two swap if that one has a file), or goes back to waiting (toDocId null).
  const moveFile = useCallback((requestId: string, clientId: string, fromDocId: string, toDocId: string | null) => {
    const own = (d: RequestDoc) => ({ status: d.status, filedTo: d.filedTo, source: d.source, receivedAt: d.receivedAt, fileName: d.fileName, moreFiles: d.moreFiles, reason: d.reason })
    const empty = { status: 'pending' as Status, filedTo: undefined, source: undefined, receivedAt: undefined, fileName: undefined, moreFiles: undefined, reason: undefined }
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r
        return {
          ...r,
          clients: r.clients.map((c) => {
            if (c.clientId !== clientId) return c
            const from = c.docs.find((d) => d.id === fromDocId)
            const to = toDocId ? c.docs.find((d) => d.id === toDocId) : undefined
            if (!from) return c
            const fromData = own(from)
            const toData = to ? own(to) : empty
            return { ...c, docs: c.docs.map((d) => (d.id === fromDocId ? { ...d, ...(to ? toData : empty) } : d.id === toDocId ? { ...d, ...fromData } : d)) }
          }),
        }
      }),
    )
  }, [])

  // A file that came on WhatsApp and was put on this document by reading it. A second file for a document already waiting is another page of it.
  const receiveFile = useCallback((requestId: string, clientId: string, docId: string, fileName: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id !== requestId
          ? r
          : {
              ...r,
              clients: r.clients.map((c) =>
                c.clientId !== clientId
                  ? c
                  : {
                      ...c,
                      docs: c.docs.map((d) =>
                        d.id !== docId
                          ? d
                          : d.status === 'to_review' && d.multiple
                            ? { ...d, moreFiles: [...(d.moreFiles ?? []), fileName] }
                            : { ...d, status: 'to_review' as Status, source: 'WhatsApp' as const, receivedAt: 'Just now', fileName, moreFiles: undefined, reason: undefined },
                      ),
                    },
              ),
            },
      ),
    )
  }, [])
  const useUnsorted = useCallback(
    (fileId: string, requestId: string, clientId: string, docId: string) => {
      const f = unsorted.find((x) => x.id === fileId)
      if (!f) return
      setRequests((prev) =>
        prev.map((r) =>
          r.id !== requestId
            ? r
            : {
                ...r,
                clients: r.clients.map((c) =>
                  c.clientId !== clientId
                    ? c
                    : {
                        ...c,
                        docs: c.docs.map((d) => {
                          if (d.id !== docId) return d
                          // The document already has a file and allows several: this one is another file of it. Otherwise it takes the place of the old one.
                          if (d.status === 'to_review' && d.multiple) return { ...d, moreFiles: [...(d.moreFiles ?? []), f.fileName] }
                          return { ...d, status: 'to_review' as Status, source: f.source, receivedAt: f.receivedAt, fileName: f.fileName, moreFiles: undefined, reason: undefined }
                        }),
                      },
                ),
              },
        ),
      )
      setUnsorted((u) => u.filter((x) => x.id !== fileId))
    },
    [unsorted],
  )

  const changeDue = useCallback((requestId: string, due: string) => setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, due } : r))), [])
  const newLink = useCallback(
    (requestId: string, clientId: string) =>
      setRequests((prev) =>
        prev.map((r) =>
          r.id !== requestId ? r : { ...r, clients: r.clients.map((c) => (c.clientId === clientId ? { ...c, linkVersion: (c.linkVersion ?? 1) + 1 } : c)) },
        ),
      ),
    [],
  )

  // Demo helper: puts a client's documents back to "nothing sent yet" so the upload page can be seen from the start.
  const resetClient = useCallback((requestId: string, clientId: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id !== requestId
          ? r
          : {
              ...r,
              clients: r.clients.map((c) =>
                c.clientId !== clientId
                  ? c
                  : {
                      ...c,
                      docs: c.docs.map((d) => ({ id: d.id, name: d.name, multiple: d.multiple, status: 'pending' as Status })),
                    },
              ),
            },
      ),
    )
  }, [])

  const value = useMemo(
    () => ({ requests, getRequest, create, setDocStatus, remind, simulateReply, clientUpload, receiveFile, moveFile, setDocFiled, markNotApplicable, resetClient, clientRemove, clientAddFile, unsorted, addUnsorted, useUnsorted, dropUnsorted, changeDue, newLink }),
    [requests, getRequest, create, setDocStatus, remind, simulateReply, clientUpload, receiveFile, moveFile, setDocFiled, markNotApplicable, resetClient, clientRemove, clientAddFile, unsorted, useUnsorted, dropUnsorted, changeDue, newLink],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRequests() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useRequests must be used inside RequestsProvider')
  return v
}
export { seed as initialRequests }
