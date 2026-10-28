import { book, clients, getClient } from './mock'
import type { Conversation, Msg } from './inbox'
import type { DocRequest } from './requests'

// A file we have read. In this demo the reading is made up; later it comes from OCR / AI.
export interface DocRead {
  kind: string // PAN card, Bank statement, Aadhaar card...
  name?: string // the person or firm named on it
  idNo?: string // PAN number, or the account number for a bank statement
  note?: string // the period for a statement, for example
}

export interface Suggestion {
  clientId: string
  how: 'PAN matched' | 'Name matched'
  options: string[] // every registration of that client (GST, TDS, ITR...). The file can go in any of them.
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// Which client does this file belong to? A PAN number is the surest sign. A name alone is a good guess.
export function suggestClient(read?: DocRead): Suggestion | undefined {
  if (!read) return undefined
  const found = (hits: typeof clients, how: Suggestion['how']): Suggestion | undefined => {
    if (!hits.length) return undefined
    const first = (read.kind === 'PAN card' && hits.find((c) => c.service === 'ITR')) || hits[0]
    return { clientId: first.id, how, options: hits.map((c) => c.id) }
  }
  if (read.kind === 'PAN card' && read.idNo) {
    const hit = found(clients.filter((c) => c.pan && c.pan === read.idNo), 'PAN matched')
    if (hit) return hit
  }
  if (read.name) {
    const byName = clients.filter((c) => norm(c.name) === norm(read.name!))
    // One name on rows with different PANs is two different clients. We do not guess.
    if (new Set(byName.map((c) => c.pan)).size === 1) return found(byName, 'Name matched')
  }
  return undefined
}

// The same document sent twice: same kind, same number, same period. Only the later one is called a duplicate.
export function isDuplicate(conversations: Conversation[], convId: string, m: Msg): boolean {
  if (!m.read?.idNo) return false
  const same = (o: Msg) => o.read && o.read.kind === m.read!.kind && o.read.idNo === m.read!.idNo && o.read.note === m.read!.note
  const all = conversations.flatMap((c) => c.msgs.filter((o) => o.file && same(o)).map((o) => ({ convId: c.id, o })))
  const first = all[0]
  return !!first && !(first.convId === convId && first.o.id === m.id)
}

// Where a file should go: a document asked for in an open request, on one registration of one client.
export interface Placement {
  regId: string // the registration (the id requests use)
  clientName: string
  place: string // Maharashtra, Head office, ITR...
  requestId: string
  requestTitle: string
  docId: string
  docName: string
  how: 'GSTIN matched' | 'TAN matched' | 'PAN matched' | 'Name matched'
  confidence: 'sure' | 'guess'
}

const docMatches = (kind: string, docName: string) => {
  const a = norm(kind)
  const b = norm(docName)
  return a.length > 2 && (b.includes(a) || a.includes(b))
}

// Read the file, find the registration (a number is surest, a name is a guess), then the document that was asked for.
// Sure: the number matched and there is exactly one place for it. Anything else is a guess for the CA to confirm.
export function findPlacement(read: DocRead | undefined, requests: DocRequest[]): Placement | undefined {
  if (!read) return undefined
  const all = book.flatMap((b) => b.registrations.map((r) => ({ b, r })))
  const byNumber = read.idNo ? all.filter(({ r }) => r.number === read.idNo) : []
  const byPan = read.kind === 'PAN card' && read.idNo && !byNumber.length ? all.filter(({ b }) => b.pan === read.idNo) : []
  const byName = !byNumber.length && !byPan.length && read.name ? all.filter(({ b }) => norm(b.name) === norm(read.name!)) : []
  const sureWay = byNumber.length ? byNumber : byPan
  const found = sureWay.length ? sureWay : byName
  if (!found.length) return undefined
  const how: Placement['how'] = byNumber.length ? (byNumber[0].r.type === 'GST' ? 'GSTIN matched' : byNumber[0].r.type === 'TDS' ? 'TAN matched' : 'PAN matched') : byPan.length ? 'PAN matched' : 'Name matched'

  const options = found.flatMap(({ b, r }) =>
    requests.flatMap((rq) => {
      const line = rq.clients.find((c) => c.clientId === r.id)
      const doc = line?.docs.find((d) => (d.status === 'pending' || d.status === 'rejected') && docMatches(read.kind, d.name))
      return doc ? [{ b, r, rq, doc }] : []
    }),
  )
  if (!options.length) return undefined
  const o = options[0]
  return {
    regId: o.r.id,
    clientName: o.b.name,
    place: o.r.type === 'ITR' ? 'ITR' : (o.r.label ?? o.r.type),
    requestId: o.rq.id,
    requestTitle: o.rq.title,
    docId: o.doc.id,
    docName: o.doc.name,
    how,
    confidence: how !== 'Name matched' && options.length === 1 ? 'sure' : 'guess',
  }
}

export const regName = (regId: string) => getClient(regId)?.name ?? ''
