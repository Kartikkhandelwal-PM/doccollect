import { clients } from './mock'
import type { Conversation, Msg } from './inbox'

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
