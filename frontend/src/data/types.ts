export type Service = 'GST' | 'TDS' | 'ITR'

export type Status =
  | 'to_review'
  | 'awaiting'
  | 'overdue'
  | 'approved'
  | 'rejected'
  | 'pending'
  | 'unassigned'
  | 'na'

export interface Client {
  id: string
  name: string
  kind: 'person' | 'firm'
  service: Service
  phone: string
  email: string
  pan: string
  gstin?: string
  source: 'KDK sync' | 'Added manually'
  openRequests: number
  note?: string
  // One client (PAN) can have several registrations: an ITR on the PAN, GSTINs, TANs. Each registration is one of these records.
  groupId?: string // the client it belongs to. Without it, the record is its own client.
  label?: string // tells registrations apart: the state of a GSTIN, "Head office" for a TAN
  contactName?: string // who to talk to, when it is not the client itself (a father filing for his daughters)
  tan?: string
}

type AttentionKind = 'received' | 'no_response' | 'unassigned'

export interface AttentionItem {
  id: string
  // 'received': this client has documents waiting for a look. 'no_response': the client still owes documents. 'unassigned': a file we could not match.
  kind: AttentionKind
  title: string // the client's name (or the unmatched number)
  sub: string // what it is about, in one line
  clientId?: string
  service?: Service
  requestId?: string
  request: string
  got: number
  total: number
  toReview: number
  activity: string
  activitySub: string
  activityTone?: 'danger'
  status: Status
  href: string // where a click on the row goes
}
