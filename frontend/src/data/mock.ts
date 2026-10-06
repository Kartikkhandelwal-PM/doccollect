import { todayISO } from '../lib/dates'
import { bulkNames } from './bulkClients'
import { initialRequests, requestState } from './requests'
import type { Client, Service } from './types'

// The first clients are written out by hand. They are the ones the other sample data talks about.
const core: Client[] = [
  { id: 'ramesh-gst', name: 'Ramesh Kumar', kind: 'person', service: 'GST', phone: '+91 98111 22301', email: 'ramesh.k@example.com', pan: 'ABCPK4521F', gstin: '07ABCPK4521F1Z5', source: 'KDK sync', openRequests: 0, sharedWith: 'ramesh-itr' },
  { id: 'ramesh-itr', name: 'Ramesh Kumar', kind: 'person', service: 'ITR', phone: '+91 98111 22301', email: 'ramesh.k@example.com', pan: 'ABCPK4521F', source: 'KDK sync', openRequests: 0, sharedWith: 'ramesh-gst' },
  { id: 'priya', name: 'Priya Textiles Pvt Ltd', kind: 'firm', service: 'GST', phone: '+91 97222 33442', email: 'accounts@priyatextiles.example', pan: 'AAKCP7788Q', gstin: '27AAKCP7788Q1Z2', source: 'KDK sync', openRequests: 0 },
  { id: 'anand', name: 'Anand Traders', kind: 'firm', service: 'TDS', phone: '+91 99333 44418', email: 'anand@traders.example', pan: 'AAFFA2345C', source: 'KDK sync', openRequests: 0 },
  { id: 'meera', name: 'Meera Iyer', kind: 'person', service: 'ITR', phone: '+91 96444 55577', email: 'meera.iyer@example.com', pan: 'BDEPI9087K', source: 'KDK sync', openRequests: 0 },
  { id: 'kapoor', name: 'Kapoor Logistics', kind: 'firm', service: 'GST', phone: '+91 90555 66663', email: 'kapoor@logistics.example', pan: 'AABCK1122M', gstin: '06AABCK1122M1Z8', source: 'Added manually', openRequests: 0 },
  { id: 'sunita', name: 'Sunita Desai', kind: 'person', service: 'ITR', phone: '+91 95666 77730', email: 'sunita.d@example.com', pan: 'CXDPD5566L', source: 'KDK sync', openRequests: 0 },
  // One father who handles the filing for his two daughters, all on his phone.
  { id: 'ram-sharma', name: 'Ram Sharma', kind: 'person', service: 'ITR', phone: '+91 98230 51147', email: 'ram.sharma@example.com', pan: 'AKTPS3321D', source: 'Added manually', openRequests: 0, sharedWith: 'reeta-sharma' },
  { id: 'reeta-sharma', name: 'Reeta Sharma', kind: 'person', service: 'ITR', phone: '+91 98230 51147', email: 'ram.sharma@example.com', pan: 'BQRPS7712F', source: 'Added manually', openRequests: 0, sharedWith: 'ram-sharma' },
  { id: 'seeta-sharma', name: 'Seeta Sharma', kind: 'person', service: 'ITR', phone: '+91 98230 51147', email: 'ram.sharma@example.com', pan: 'CMSPS4409H', source: 'Added manually', openRequests: 0, sharedWith: 'ram-sharma' },
  // One owner, three firms, all on his phone. Each firm is its own client with its own PAN and GST.
  { id: 'agarwal-traders', name: 'Agarwal Traders', kind: 'firm', service: 'GST', phone: '+91 98765 20817', email: 'suresh@agarwalgroup.example', pan: 'AAAFA4410G', gstin: '07AAAFA4410G1Z3', source: 'Added manually', openRequests: 0, sharedWith: 'agarwal-exports' },
  { id: 'agarwal-exports', name: 'Agarwal Exports Pvt Ltd', kind: 'firm', service: 'GST', phone: '+91 98765 20817', email: 'suresh@agarwalgroup.example', pan: 'AABCA7731H', gstin: '07AABCA7731H1Z6', source: 'Added manually', openRequests: 0, sharedWith: 'agarwal-traders' },
  { id: 'agarwal-realty', name: 'Agarwal Realty LLP', kind: 'firm', service: 'TDS', phone: '+91 98765 20817', email: 'suresh@agarwalgroup.example', pan: 'AAFFA9025K', source: 'Added manually', openRequests: 0, sharedWith: 'agarwal-traders' },
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

const base: Client[] = [...core, ...more.map(([n, k, s], i) => make(n, k, s, i)), ...bulkNames.map((n, i) => make(n, 'firm', 'GST', i + more.length))]

// How many requests are still open for each client, and who is late, worked out from the requests themselves.
const today = todayISO()
const open = new Map<string, number>()
const late = new Set<string>()
const finished = new Set<string>()
for (const r of initialRequests) {
  const done = requestState(r) === 'completed'
  for (const c of r.clients) {
    const complete = c.docs.every((d) => d.status === 'approved' || d.status === 'na')
    if (!complete) {
      open.set(c.clientId, (open.get(c.clientId) ?? 0) + 1)
      if (r.due < today) late.add(c.clientId)
    } else if (done) finished.add(c.clientId)
  }
}

export const clients: Client[] = base.map((c) => ({
  ...c,
  openRequests: open.get(c.id) ?? 0,
  note: c.sharedWith ? `Shares number with ${base.filter((o) => o.id !== c.id && o.phone === c.phone).length || 1} ${base.filter((o) => o.id !== c.id && o.phone === c.phone).length > 1 ? 'clients' : 'client'}` : late.has(c.id) ? 'Overdue' : !open.get(c.id) && finished.has(c.id) ? 'All approved' : undefined,
}))

export const getClient = (id: string) => clients.find((c) => c.id === id)
