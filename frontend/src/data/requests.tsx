import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { bulkRequest, moreRequests, rameshGst, seedUnsorted } from './seedRequests'
import type { Status } from './types'

export interface RequestDoc {
  id: string
  name: string
  status: Status
  source?: 'WhatsApp' | 'Link'
  receivedAt?: string
  fileName?: string
  moreFiles?: string[] // a document can be several files: the front and back of a card, the sheets of a workbook
  reason?: string
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
  docs: { id: string; name: string }[]
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
    createdAt: '2026-09-27',
    due: '2026-10-05',
    via: 'own',
    clients: [
      {
        clientId: 'ramesh-itr',
        docs: [
          { ...doc('pan', 'PAN card', 'approved', 'Link', 'Sep 28, 11:02'), fileName: 'PAN card front.jpg', moreFiles: ['PAN card back.jpg'] },
          doc('aadhaar', 'Aadhaar card', 'approved', 'Link', 'Sep 28, 11:04'),
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
    createdAt: '2026-09-28',
    due: '2026-10-03',
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
    createdAt: '2026-09-20',
    due: '2026-09-28',
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
  markNotApplicable: (requestId: string, clientId: string, docId: string, on: boolean) => void
  resetClient: (requestId: string, clientId: string) => void
  clientRemove: (requestId: string, clientId: string, docId: string) => void
  clientAddFile: (requestId: string, clientId: string, docId: string, fileName: string) => void
  unsorted: UnsortedFile[]
  useUnsorted: (fileId: string, requestId: string, clientId: string, docId: string) => void
  changeDue: (requestId: string, due: string) => void
  newLink: (requestId: string, clientId: string) => void
}

const Ctx = createContext<Store | null>(null)

export function RequestsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<DocRequest[]>(seed)
  const [unsorted, setUnsorted] = useState<UnsortedFile[]>(seedUnsorted)

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
          docs: input.docs.map((d) => ({ id: d.id, name: d.name, status: 'pending' as Status })),
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
      setRequests((prev) => prev.map((r) => (r.id !== requestId ? r : { ...r, clients: r.clients.map((c) => (c.clientId !== clientId ? c : { ...c, docs: c.docs.map((d) => (d.id === docId ? { ...d, moreFiles: [...(d.moreFiles ?? []), fileName] } : d)) })) }))),
    [],
  )
  const markNotApplicable = useCallback(
    (requestId: string, clientId: string, docId: string, on: boolean) =>
      patchDoc(requestId, clientId, docId, { status: on ? 'na' : 'pending', reason: undefined }),
    [patchDoc],
  )

  const clientRemove = useCallback(
    (requestId: string, clientId: string, docId: string) =>
      patchDoc(requestId, clientId, docId, { status: 'pending', fileName: undefined, moreFiles: undefined, receivedAt: undefined, source: undefined, reason: undefined }),
    [patchDoc],
  )

  // The CA puts a waiting file into one of this client's missing documents. It then goes to review like any other.
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
                          // The document already has a file: this one is another page of it.
                          if (d.status === 'to_review') return { ...d, moreFiles: [...(d.moreFiles ?? []), f.fileName] }
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
                      docs: c.docs.map((d) => ({ id: d.id, name: d.name, status: 'pending' as Status })),
                    },
              ),
            },
      ),
    )
  }, [])

  const value = useMemo(
    () => ({ requests, getRequest, create, setDocStatus, remind, simulateReply, clientUpload, markNotApplicable, resetClient, clientRemove, clientAddFile, unsorted, useUnsorted, changeDue, newLink }),
    [requests, getRequest, create, setDocStatus, remind, simulateReply, clientUpload, markNotApplicable, resetClient, clientRemove, clientAddFile, unsorted, useUnsorted, changeDue, newLink],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRequests() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useRequests must be used inside RequestsProvider')
  return v
}
export { seed as initialRequests }
