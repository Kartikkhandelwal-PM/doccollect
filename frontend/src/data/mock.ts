import { todayISO } from '../lib/dates'
import { emptyOn } from '../lib/demo'
import { bulkNames } from './bulkClients'
import { initialRequests, requestState } from './requests'
import type { Client, Service } from './types'

// The first clients are written out by hand. They are the ones the other sample data talks about.
const core: Client[] = [
  { id: 'ramesh-gst', groupId: 'ramesh-kumar', label: 'Delhi', name: 'Ramesh Kumar', kind: 'person', service: 'GST', phone: '+91 98111 22301', email: 'ramesh.k@example.com', pan: 'ABCPK4521F', gstin: '07ABCPK4521F1Z5', source: 'KDK sync', openRequests: 0 },
  { id: 'ramesh-itr', groupId: 'ramesh-kumar', name: 'Ramesh Kumar', kind: 'person', service: 'ITR', phone: '+91 98111 22301', email: 'ramesh.k@example.com', pan: 'ABCPK4521F', source: 'KDK sync', openRequests: 0 },
  { id: 'priya', label: 'Maharashtra', name: 'Priya Textiles Pvt Ltd', kind: 'firm', service: 'GST', phone: '+91 97222 33442', email: 'accounts@priyatextiles.example', pan: 'AAKCP7788Q', gstin: '27AAKCP7788Q1Z2', source: 'KDK sync', openRequests: 0 },
  { id: 'anand', label: 'Mumbai', name: 'Anand Traders', kind: 'firm', service: 'TDS', phone: '+91 99333 44418', email: 'anand@traders.example', pan: 'AAFFA2345C', source: 'KDK sync', openRequests: 0 },
  // A client can have more than one TAN, too.
  { id: 'anand-pune', groupId: 'anand', label: 'Pune', contactName: 'Rohit Patil', name: 'Anand Traders', kind: 'firm', service: 'TDS', phone: '+91 98220 61409', email: 'pune@traders.example', pan: 'AAFFA2345C', source: 'KDK sync', openRequests: 0 },
  { id: 'meera', name: 'Meera Iyer', kind: 'person', service: 'ITR', phone: '+91 96444 55577', email: 'meera.iyer@example.com', pan: 'BDEPI9087K', source: 'KDK sync', openRequests: 0 },
  { id: 'kapoor', name: 'Kapoor Logistics', kind: 'firm', service: 'GST', phone: '+91 90555 66663', email: 'kapoor@logistics.example', pan: 'AABCK1122M', gstin: '06AABCK1122M1Z8', source: 'Added manually', openRequests: 0 },
  { id: 'sunita', name: 'Sunita Desai', kind: 'person', service: 'ITR', phone: '+91 95666 77730', email: 'sunita.d@example.com', pan: 'CXDPD5566L', source: 'KDK sync', openRequests: 0 },
  // One father who handles the filing for his two daughters, all on his phone.
  { id: 'ram-sharma', name: 'Ram Sharma', kind: 'person', service: 'ITR', phone: '+91 98230 51147', email: 'ram.sharma@example.com', pan: 'AKTPS3321D', source: 'Added manually', openRequests: 0 },
  { id: 'reeta-sharma', contactName: 'Ram Sharma', name: 'Reeta Sharma', kind: 'person', service: 'ITR', phone: '+91 98230 51147', email: 'ram.sharma@example.com', pan: 'BQRPS7712F', source: 'Added manually', openRequests: 0 },
  { id: 'seeta-sharma', contactName: 'Ram Sharma', name: 'Seeta Sharma', kind: 'person', service: 'ITR', phone: '+91 98230 51147', email: 'ram.sharma@example.com', pan: 'CMSPS4409H', source: 'Added manually', openRequests: 0 },
  // One owner, three firms, all on his phone. Each firm is its own client with its own PAN and GST.
  { id: 'agarwal-traders', contactName: 'Suresh Agarwal', name: 'Agarwal Traders', kind: 'firm', service: 'GST', phone: '+91 98765 20817', email: 'suresh@agarwalgroup.example', pan: 'AAAFA4410G', gstin: '07AAAFA4410G1Z3', source: 'Added manually', openRequests: 0 },
  { id: 'agarwal-exports', contactName: 'Suresh Agarwal', name: 'Agarwal Exports Pvt Ltd', kind: 'firm', service: 'GST', phone: '+91 98765 20817', email: 'suresh@agarwalgroup.example', pan: 'AABCA7731H', gstin: '07AABCA7731H1Z6', source: 'Added manually', openRequests: 0 },
  { id: 'agarwal-realty', contactName: 'Suresh Agarwal', name: 'Agarwal Realty LLP', kind: 'firm', service: 'TDS', phone: '+91 98765 20817', email: 'suresh@agarwalgroup.example', pan: 'AAFFA9025K', source: 'Added manually', openRequests: 0 },
  // A firm with a second GSTIN in another state is still one client.
  { id: 'priya-ka', groupId: 'priya', label: 'Karnataka', contactName: 'Ankit Rao', name: 'Priya Textiles Pvt Ltd', kind: 'firm', service: 'GST', phone: '+91 98450 11872', email: 'bengaluru@priyatextiles.example', pan: 'AAKCP7788Q', gstin: '29AAKCP7788Q1Z9', source: 'KDK sync', openRequests: 0 },
  { id: 'priya-rj', groupId: 'priya', label: 'Rajasthan', contactName: 'Neha Kapoor', name: 'Priya Textiles Pvt Ltd', kind: 'firm', service: 'GST', phone: '+91 94140 22318', email: 'jaipur@priyatextiles.example', pan: 'AAKCP7788Q', gstin: '08AAKCP7788Q1Z6', source: 'KDK sync', openRequests: 0 },
  { id: 'vikram', name: 'Vikram Enterprises', kind: 'firm', service: 'TDS', phone: '+91 93777 88809', email: 'vikram@enterprises.example', pan: 'AAGFV3344R', source: 'KDK sync', openRequests: 0 },
]

// More clients so the lists, search and paging feel real. Everything about them is made up.
const more: [name: string, kind: 'person' | 'firm', service: Service][] = [
  ['Arjun Mehta', 'person', 'ITR'],
  ['Neha Kulkarni', 'person', 'ITR'],
  ['Rohit Bansal', 'person', 'ITR'],
  ['Pooja Nair', 'person', 'ITR'],
  ['Sanjay Gupta', 'person', 'ITR'],
  ['Divya Reddy', 'person', 'ITR'],
  ['Amit Joshi', 'person', 'ITR'],
  ['Kavita Rao', 'person', 'ITR'],
  ['Harish Patel', 'person', 'ITR'],
  ['Nisha Agarwal', 'person', 'ITR'],
  ['Manoj Tiwari', 'person', 'ITR'],
  ['Shweta Kapoor', 'person', 'ITR'],
  ['Rajiv Malhotra', 'person', 'ITR'],
  ['Anjali Menon', 'person', 'ITR'],
  ['Deepak Sharma', 'person', 'ITR'],
  ['Farah Khan', 'person', 'ITR'],
  ['Gaurav Singh', 'person', 'ITR'],
  ['Lata Pillai', 'person', 'ITR'],
  ['Mehta Foods Pvt Ltd', 'firm', 'GST'],
  ['Gupta Textiles', 'firm', 'GST'],
  ['Bhatia Brothers', 'firm', 'GST'],
  ['Rao Associates', 'firm', 'GST'],
  ['Jain Electricals', 'firm', 'GST'],
  ['Singhania Steels', 'firm', 'GST'],
  ['Patel Plastics', 'firm', 'GST'],
  ['Nair Spices', 'firm', 'GST'],
  ['Choudhary Pharma', 'firm', 'GST'],
  ['Lotus Interiors', 'firm', 'GST'],
  ['Sundaram Auto Parts', 'firm', 'GST'],
  ['Zenith Packaging', 'firm', 'GST'],
  ['Orchid Hospitality', 'firm', 'GST'],
  ['Sagar Marine Exports', 'firm', 'GST'],
  ['Bharat Hardware', 'firm', 'GST'],
  ['Metro Constructions', 'firm', 'TDS'],
  ['Delta Logistics Pvt Ltd', 'firm', 'TDS'],
  ['Greenfield Schools Trust', 'firm', 'TDS'],
  ['Prime Realty LLP', 'firm', 'TDS'],
  ['Skyline Infra', 'firm', 'TDS'],
  ['Aditya Hospitals', 'firm', 'TDS'],
  ['Kiran Dairy Farms', 'firm', 'TDS'],
  ['Universal Tutorials', 'firm', 'GST'],
  ['Everest Travels', 'firm', 'GST'],
  ['Radhika Boutique', 'firm', 'GST'],
  ['Tarun Bhatt', 'person', 'ITR'],
  ['Isha Verma', 'person', 'ITR'],
  ['Naveen Chawla', 'person', 'ITR'],
]

const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const hash = (s: string) => {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return h
}
const letter = (n: number) => String.fromCharCode(65 + (n % 26))
const digits = (h: number, len: number) => String(h % 10 ** len).padStart(len, '0')
const states = ['07', '27', '06', '24', '29', '33', '09', '19']

function make(name: string, kind: 'person' | 'firm', service: Service, i: number): Client {
  const id = slug(name)
  const h = hash(name)
  const initial = name.trim()[0].toUpperCase()
  const pan = `${letter(h)}${letter(h >>> 5)}${letter(h >>> 10)}${kind === 'person' ? 'P' : 'C'}${initial}${digits(h >>> 3, 4)}${letter(h >>> 8)}`
  const mobile = `+91 9${digits(h, 4)} ${digits(h >>> 7, 5)}`
  const first = name.split(' ')[0].toLowerCase()
  return {
    id,
    name,
    kind,
    service,
    phone: mobile,
    email: kind === 'person' ? `${first}.${slug(name.split(' ').slice(1).join(' ') || 'x')}@example.com` : `accounts@${id.replace(/-/g, '')}.example`,
    pan,
    gstin: service === 'GST' ? `${states[h % states.length]}${pan}1Z${digits(h >>> 2, 1)}` : undefined,
    source: i % 7 === 3 ? 'Added manually' : 'KDK sync',
    openRequests: 0,
  }
}

const listed: Client[] = [...core, ...more.map(([n, k, s], i) => make(n, k, s, i)), ...bulkNames.map((n, i) => make(n, 'firm', 'GST', i + more.length))]

// A real client is rarely just one kind: every PAN files income tax, most firms have a GSTIN, many deduct TDS, and some have a second GSTIN or TAN.
// The hand-written clients above only name the registration the sample requests talk about, so the rest are added here, the same way every time.
const stateNames: Record<string, string> = { '07': 'Delhi', '27': 'Maharashtra', '06': 'Haryana', '24': 'Gujarat', '29': 'Karnataka', '33': 'Tamil Nadu', '09': 'Uttar Pradesh', '19': 'West Bengal' }
const branchPeople = ['Neha Kapoor', 'Amit Joshi', 'Rahul Mehra', 'Pooja Nair', 'Sanjay Iyer', 'Kavita Shah']
const withAll = (rows: Client[]): Client[] => {
  const groups = new Map<string, Client[]>()
  for (const c of rows) groups.set(c.groupId ?? c.id, [...(groups.get(c.groupId ?? c.id) ?? []), c])
  const added: Client[] = []
  for (const [gid, list] of groups) {
    const head = list[0]
    const h = hash(gid)
    const has = (t: Service) => list.some((c) => c.service === t)
    const count = (t: Service) => list.filter((c) => c.service === t).length
    const add = (t: Service, n: number) => {
      const used = [...list, ...added].filter((c) => c.groupId === gid || c.id === gid).map((c) => c.gstin?.slice(0, 2))
      let st = states[(h >>> (3 + n)) % states.length]
      while (t === 'GST' && used.includes(st)) st = states[(states.indexOf(st) + 1) % states.length]
      added.push({
        ...head,
        id: `${gid}-${t.toLowerCase()}${n > 0 ? n + 1 : ''}`,
        groupId: gid,
        service: t,
        label: n > 0 ? stateNames[st] : undefined,
        gstin: t === 'GST' ? `${st}${head.pan}1Z${digits(h >>> (2 + n), 1)}` : undefined,
        tan: undefined,
        // A second GSTIN or TAN usually has its own person at that branch.
        contactName: n > 0 ? branchPeople[(h >>> (4 + n)) % branchPeople.length] : undefined,
        phone: n > 0 ? `+91 9${digits(h >>> (5 + n), 4)} ${digits(h >>> (9 + n), 5)}` : head.phone,
        email: n > 0 ? `${stateNames[st].toLowerCase().replace(/\s+/g, '')}@${head.email.split('@')[1]}` : head.email,
        openRequests: 0,
      })
    }
    const firm = head.kind === 'firm'
    if (!has('ITR')) add('ITR', 0)
    if (!has('GST') && (firm ? h % 3 !== 0 : h % 4 === 0)) add('GST', 0)
    if (!has('TDS') && (firm ? h % 2 === 0 : h % 6 === 0)) add('TDS', 0)
    if (firm && h % 7 === 0 && count('GST') + added.filter((c) => c.groupId === gid && c.service === 'GST').length === 1) add('GST', 1)
    if (firm && h % 9 === 0 && count('TDS') + added.filter((c) => c.groupId === gid && c.service === 'TDS').length === 1) add('TDS', 1)
  }
  return [...rows, ...added]
}

const base: Client[] = emptyOn() ? [] : withAll(listed)

// How many requests are still open for each client, and who is late, worked out from the requests themselves.
const today = todayISO()
const open = new Map<string, number>()
const late = new Set<string>()
const finished = new Set<string>()
for (const r of initialRequests) {
  const done = requestState(r) === 'completed'
  for (const c of r.clients) {
    const complete = c.docs.every((d) => d.status === 'approved' || d.status === 'na' || (d.optional && d.status === 'pending'))
    if (!complete) {
      open.set(c.clientId, (open.get(c.clientId) ?? 0) + 1)
      if (r.due < today) late.add(c.clientId)
    } else if (done) finished.add(c.clientId)
  }
}

const tanOf = (c: Client) => `${letter(hash(c.id))}${letter(hash(c.id) >>> 4)}${letter(hash(c.id) >>> 9)}${c.name[0].toUpperCase()}${digits(hash(c.id) >>> 2, 5)}${letter(hash(c.id) >>> 6)}`

// One record per registration. Each is a GSTIN, a TAN, or the PAN (income tax) of a client. Requests are made for these.
export const clients: Client[] = base.map((c) => ({
  ...c,
  openRequests: open.get(c.id) ?? 0,
  label: c.label ?? (c.service === 'GST' && c.gstin ? stateNames[c.gstin.slice(0, 2)] : c.service === 'TDS' ? 'Head office' : undefined),
  tan: c.service === 'TDS' ? tanOf(c) : undefined,
  note: late.has(c.id) ? 'Overdue' : !open.get(c.id) && finished.has(c.id) ? 'All approved' : undefined,
}))

export const getClient = (id: string) => clients.find((c) => c.id === id)

// ---------- The unified client: one per PAN, with its registrations and contacts ----------

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
}

export interface Registration {
  id: string // the id requests use for this registration
  type: Service
  number: string // the GSTIN, the TAN, or the PAN
  label?: string
  contact: Contact
}

export interface BookClient {
  id: string
  name: string
  kind: 'person' | 'firm'
  pan: string
  source: Client['source']
  contacts: Contact[] // the first one is the main contact
  registrations: Registration[]
  openRequests: number
  late: boolean
  note?: string
}

const byGroup = new Map<string, BookClient>()
for (const c of clients) {
  const gid = c.groupId ?? c.id
  const contact: Contact = { id: `${gid}:${c.phone}`, name: c.contactName ?? c.name, email: c.email, phone: c.phone }
  let g = byGroup.get(gid)
  if (!g) {
    g = { id: gid, name: c.name, kind: c.kind, pan: c.pan, source: c.source, contacts: [], registrations: [], openRequests: 0, late: false }
    byGroup.set(gid, g)
  }
  if (!g.contacts.some((x) => x.phone === contact.phone)) g.contacts.push(contact)
  g.registrations.push({ id: c.id, type: c.service, number: c.service === 'GST' ? (c.gstin ?? '') : c.service === 'TDS' ? (c.tan ?? '') : c.pan, label: c.label, contact })
  g.openRequests += c.openRequests
  g.late = g.late || late.has(c.id)
}
const typeOrder: Record<Service, number> = { ITR: 0, GST: 1, TDS: 2 }
for (const g of byGroup.values()) {
  g.registrations.sort((a, b) => typeOrder[a.type] - typeOrder[b.type])
  g.note = g.late ? 'Overdue' : g.openRequests === 0 && g.registrations.some((r) => finished.has(r.id)) ? 'All approved' : undefined
}

// Every client, one row each.
export const book: BookClient[] = [...byGroup.values()]

// The client for a client id or for any of its registration ids.
export const parentIdOf = (id: string) => getClient(id)?.groupId ?? id
export const getBookClient = (id: string) => byGroup.get(parentIdOf(id))

// How a registration reads in a list: the client, and for GST and TDS which GSTIN or TAN, like "Priya Textiles Pvt Ltd · Karnataka".
// " · Karnataka" when the client has more than one GSTIN (or TAN), and nothing when there is only one.
export const regSuffix = (id: string) => {
  const c = getClient(id)
  const several = c ? (getBookClient(id)?.registrations.filter((r) => r.type === c.service).length ?? 1) > 1 : false
  return several && c?.label ? ` · ${c.label}` : ''
}
export const partyName = (id: string) => `${getClient(id)?.name ?? id}${regSuffix(id)}`

// Other clients with the same contact (a father filing for his daughters, one owner with several firms).
export const sameContact = (clientId: string) => {
  const own = byGroup.get(clientId)
  if (!own) return []
  const phones = new Set(own.contacts.map((c) => c.phone))
  return book.filter((b) => b.id !== clientId && b.contacts.some((c) => phones.has(c.phone)))
}
