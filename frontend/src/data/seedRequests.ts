import { demoDay } from '../lib/dates'
import type { DocRequest, RequestClient, RequestDoc, UnsortedFile } from './requests'
import { bulkNames, slugOf } from './bulkClients'
import type { Status } from './types'

// Sample requests for the demo, in every state a CA meets: fresh, half done, waiting, late, finished.
// All names and numbers are made up.

type Def = [id: string, name: string]

const ITR: Def[] = [
  ['pan', 'PAN card'],
  ['aadhaar', 'Aadhaar card'],
  ['form16', 'Form 16 (Part A & B)'],
  ['26as', 'Form 26AS / AIS'],
  ['bank', 'Bank statement Apr–Mar'],
  ['homeloan', 'Home loan interest certificate'],
  ['lic', 'LIC premium receipts'],
]
const ITR_BIZ: Def[] = [
  ['pan', 'PAN card'],
  ['aadhaar', 'Aadhaar card'],
  ['pl', 'Profit & Loss statement'],
  ['bs', 'Balance sheet'],
  ['26as', 'Form 26AS / AIS'],
  ['bank', 'Bank statement Apr–Mar'],
]
const GST: Def[] = [
  ['sales', 'Sales register'],
  ['purchase', 'Purchase register'],
  ['gstr2b', 'GSTR-2B'],
  ['bank', 'Bank statement Apr–Mar'],
]
const GST_YEAR: Def[] = [
  ['salesum', 'Annual sales summary'],
  ['purchsum', 'Annual purchase summary'],
  ['gstr3b', 'GSTR-3B (all months)'],
  ['bank', 'Bank statement Apr–Mar'],
]
const TDS: Def[] = [
  ['challans', 'TDS challans'],
  ['deductees', 'Deductee list'],
  ['form16a', 'Form 16A'],
  ['bank', 'Bank statement Apr–Mar'],
]

const CODE: Record<string, Status> = { A: 'approved', R: 'to_review', X: 'rejected', P: 'pending' }
const earlier = ['Sep 28, 10:05', 'Sep 29, 11:02', 'Sep 29, 16:40', 'Sep 30, 09:15', 'Sep 30, 14:22', 'Sep 27, 17:30', 'Sep 26, 12:48']
const fresh = ['Today, 10:42', 'Today, 09:15', 'Today, 08:50', 'Yesterday, 18:20', 'Yesterday, 15:05', 'Today, 09:58', 'Today, 07:45']
const why = ['Image is blurry', 'Page 3 is missing', 'This is for the wrong year', 'File could not be opened']

const fileFor = (name: string) => {
  const base = name.replace(/[^\w ]/g, '').trim()
  if (/register|summary/i.test(name)) return `${base}.xlsx`
  if (/PAN|Aadhaar/i.test(name)) return `${base}.jpg`
  return `${base}.pdf`
}

// One client in a request. `codes` has a letter per document: A approved, R to review, X sent back, P still pending.
function rc(clientId: string, defs: Def[], codes: string, n = 0, lastReminder?: string): RequestClient {
  const docs: RequestDoc[] = defs.map(([id, name], i) => {
    const status = CODE[codes[i] ?? 'P']
    if (status === 'pending') return { id, name, status }
    const source: 'WhatsApp' | 'Link' = (n + i) % 3 === 0 ? 'WhatsApp' : 'Link'
    const receivedAt = status === 'to_review' ? fresh[(n + i) % fresh.length] : earlier[(n + i) % earlier.length]
    return { id, name, status, source, receivedAt, fileName: fileFor(name), reason: status === 'rejected' ? why[(n + i) % why.length] : undefined }
  })
  return { clientId, docs, lastReminder }
}

export const moreRequests: DocRequest[] = [
  {
    id: 'r4',
    ref: 'R-1041',
    title: 'GST monthly',
    createdAt: demoDay('2026-09-28'),
    due: demoDay('2026-10-05'),
    via: 'own',
    clients: [
      rc('mehta-foods-pvt-ltd', GST, 'ARRA', 1),
      rc('gupta-textiles', GST, 'AAAA', 2),
      rc('bhatia-brothers', GST, 'APPP', 3, 'Sep 30'),
      rc('rao-associates', GST, 'ARPP', 4),
      rc('jain-electricals', GST, 'PPPP', 0, 'Sep 30'),
      rc('singhania-steels', GST, 'AAAR', 5),
    ],
  },
  {
    id: 'r5',
    ref: 'R-1040',
    title: 'ITR salaried',
    createdAt: demoDay('2026-09-25'),
    due: demoDay('2026-10-10'),
    via: 'own',
    clients: [
      rc('arjun-mehta', ITR, 'AARPPPP', 1),
      rc('neha-kulkarni', ITR, 'AAAAAAA', 2),
      rc('rohit-bansal', ITR, 'APPPPPP', 3, 'Sep 30'),
      rc('pooja-nair', ITR, 'AARRXPP', 4),
      rc('sanjay-gupta', ITR, 'PPPPPPP', 0, 'Sep 29'),
      rc('divya-reddy', ITR, 'AAAAPPP', 5),
      rc('sunita', ITR, 'AARPPPP', 6),
    ],
  },
  {
    id: 'r6',
    ref: 'R-1038',
    title: 'TDS quarterly',
    createdAt: demoDay('2026-09-18'),
    due: demoDay('2026-09-30'),
    via: 'own',
    clients: [
      rc('metro-constructions', TDS, 'AAPP', 1, 'Sep 29'),
      rc('delta-logistics-pvt-ltd', TDS, 'PPPP', 0, 'Sep 28'),
      rc('vikram', TDS, 'AAAP', 2, 'Sep 30'),
      rc('prime-realty-llp', TDS, 'AAAR', 3),
    ],
  },
  {
    id: 'r7',
    ref: 'R-1030',
    title: 'ITR salaried',
    createdAt: demoDay('2026-09-08'),
    due: demoDay('2026-09-20'),
    via: 'own',
    clients: [rc('meera', ITR, 'AAAAAAA', 1), rc('rajiv-malhotra', ITR, 'AAAAAAA', 2), rc('anjali-menon', ITR, 'AAAAAAA', 3), rc('farah-khan', ITR, 'AAAAAAA', 4)],
  },
  {
    id: 'r8',
    ref: 'R-1037',
    title: 'ITR business',
    createdAt: demoDay('2026-09-22'),
    due: demoDay('2026-10-12'),
    via: 'own',
    clients: [rc('amit-joshi', ITR_BIZ, 'AAARPP', 1), rc('kavita-rao', ITR_BIZ, 'AAPPPP', 2), rc('harish-patel', ITR_BIZ, 'AAAAAR', 3)],
  },
  {
    id: 'r9',
    ref: 'R-1036',
    title: 'GST annual return',
    createdAt: demoDay('2026-09-30'),
    due: demoDay('2026-10-15'),
    via: 'own',
    clients: [rc('patel-plastics', GST_YEAR, 'PPPP', 0), rc('nair-spices', GST_YEAR, 'APPP', 1), rc('choudhary-pharma', GST_YEAR, 'PPPP', 0)],
  },
  {
    id: 'r10',
    ref: 'R-1025',
    title: 'TDS quarterly',
    createdAt: demoDay('2026-09-01'),
    due: demoDay('2026-09-15'),
    via: 'own',
    clients: [rc('greenfield-schools-trust', TDS, 'AAAA', 1), rc('aditya-hospitals', TDS, 'AAAA', 2), rc('skyline-infra', TDS, 'AAAA', 3)],
  },
  {
    id: 'r11',
    ref: 'R-1035',
    title: 'GST monthly',
    createdAt: demoDay('2026-09-29'),
    due: demoDay('2026-10-08'),
    via: 'kdk',
    clients: [rc('lotus-interiors', GST, 'AARP', 1), rc('sundaram-auto-parts', GST, 'PPPP', 0), rc('zenith-packaging', GST, 'AAPP', 2)],
  },
  {
    id: 'r12',
    ref: 'R-1044',
    title: 'ITR salaried',
    createdAt: demoDay('2026-10-01'),
    due: demoDay('2026-10-20'),
    via: 'own',
    clients: [rc('nisha-agarwal', ITR, 'PPPPPPP'), rc('manoj-tiwari', ITR, 'PPPPPPP'), rc('shweta-kapoor', ITR, 'PPPPPPP'), rc('lata-pillai', ITR, 'PPPPPPP')],
  },
  {
    id: 'r16',
    ref: 'R-1045',
    title: 'ITR salaried',
    createdAt: demoDay('2026-09-30'),
    due: demoDay('2026-10-12'),
    via: 'own',
    clients: [rc('ram-sharma', ITR, 'AAPPPPP', 1), rc('reeta-sharma', ITR, 'PPRPPPP', 2), rc('seeta-sharma', ITR, 'PPPPPPP')],
  },
  {
    id: 'r17',
    ref: 'R-1046',
    title: 'GST monthly',
    createdAt: demoDay('2026-10-01'),
    due: demoDay('2026-10-09'),
    via: 'own',
    clients: [rc('agarwal-traders', GST, 'AAPP', 1), rc('agarwal-exports', GST, 'PRPP', 2)],
  },
  {
    id: 'r18',
    ref: 'R-1047',
    title: 'TDS quarterly',
    createdAt: demoDay('2026-10-01'),
    due: demoDay('2026-10-12'),
    via: 'own',
    clients: [rc('agarwal-realty', TDS, 'APPP', 3)],
  },
  {
    id: 'r13',
    ref: 'R-1034',
    title: 'GST monthly',
    createdAt: demoDay('2026-09-27'),
    due: demoDay('2026-10-06'),
    via: 'own',
    clients: [rc('orchid-hospitality', GST, 'AXPP', 1, 'Sep 30'), rc('sagar-marine-exports', GST, 'RRAA', 2), rc('bharat-hardware', GST, 'APPX', 3)],
  },
]

// One request to a whole block of clients, in every stage: the case a busy office actually has.
const stages = ['AAAA', 'AAAA', 'AAAR', 'ARRA', 'AAPP', 'APPP', 'PPPP', 'PPPP', 'RPPP', 'AARP', 'PPPP', 'AAAA']
export const bulkRequest: DocRequest = {
  id: 'r14',
  ref: 'R-1033',
  title: 'GST monthly',
  createdAt: demoDay('2026-09-26'),
  due: demoDay('2026-10-07'),
  via: 'own',
  clients: bulkNames.map((n, i) => rc(slugOf(n), GST, stages[(i * 7 + Math.floor(i / 5)) % stages.length], i, i % 3 === 0 && stages[(i * 7 + Math.floor(i / 5)) % stages.length].includes('P') ? 'Sep 30' : undefined)),
}

// Ramesh Kumar is a client for ITR and for GST, on one number. Both requests are open at the same time.
export const rameshGst: DocRequest = {
  id: 'r15',
  ref: 'R-1032',
  title: 'GST monthly',
  createdAt: demoDay('2026-09-27'),
  due: demoDay('2026-10-07'),
  via: 'own',
  clients: [{ clientId: 'ramesh-gst', docs: rc('ramesh-gst', GST, 'PPPP', 0).docs.map((d) => (d.id === 'sales' ? { ...d, status: 'to_review' as const, source: 'WhatsApp' as const, receivedAt: 'Today, 10:46', fileName: 'Sales_Sep_2026.xlsx' } : d)) }],
}

// Files Ramesh sent in one go that we could not match. The CA puts them in the right request when reviewing.
export const seedUnsorted: UnsortedFile[] = [
  // Suresh sent this for one of his three firms. Which one is not clear, so it waits to be placed.
  { id: 'u6', phone: '+91 98765 20817', fileName: 'bank_stmt_sep.pdf', receivedAt: 'Today, 10:05', source: 'WhatsApp' },
  // Ram sent this for one of his three clients (himself, Reeta or Seeta). Nobody can tell which, so it waits to be placed.
  { id: 'u5', phone: '+91 98230 51147', fileName: 'scan_0522.pdf', receivedAt: 'Today, 11:20', source: 'WhatsApp' },
  { id: 'u3', phone: '+91 98111 22301', fileName: 'HDFC_HL_Statement.pdf', receivedAt: 'Today, 10:47', source: 'WhatsApp' },
  { id: 'u2', phone: '+91 98111 22301', fileName: 'scan_0417.pdf', receivedAt: 'Today, 10:47', source: 'WhatsApp' },
  { id: 'u4', phone: '+91 98111 22301', fileName: 'Form16_page2.pdf', receivedAt: 'Today, 10:47', source: 'WhatsApp' },
]
