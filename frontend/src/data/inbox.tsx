import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { formatList, fillTemplate } from '../lib/template'
import { seedMessages } from './messageTemplates'
import { getClient } from './mock'
import { useRequests } from './requests'
import { useSetup } from './setup'
import { LINK_DOMAIN } from '../lib/brand'

export interface Msg {
  id: string
  from: 'ca' | 'client' | 'system'
  time: string
  text?: string
  file?: { name: string; size: string }
  photo?: boolean
  matched?: string
  link?: { requestId: string; clientId: string; docId: string } // the request document this file became
  tick?: 'sent' | 'read'
}

export interface Conversation {
  id: string
  title: string
  phone: string
  clientIds: string[]
  unread: number
  msgs: Msg[]
  unassigned?: boolean
}

// The text a template produces for a client. The chat shows exactly this, never a hand-written copy.
const say = (id: string, values: Record<string, string>) =>
  fillTemplate(seedMessages.find((m) => m.id === id)?.text ?? '', { firm: 'Kartik Khandelwal & Associates', link: `${LINK_DOMAIN}/u/a8x3k`, ...values })

const nowTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })

const seed: Conversation[] = [
  {
    id: 'c-ramesh',
    title: 'Ramesh Kumar',
    phone: '+91 98111 22301',
    clientIds: ['ramesh-itr', 'ramesh-gst'],
    unread: 1,
    msgs: [
      {
        id: 'm1',
        from: 'ca',
        time: '09:10',
        tick: 'read',
        text: say('request', {
          name: 'Ramesh',
          request: 'ITR salaried',
          documents: formatList(['Form 16 (Part A & B)', 'Form 26AS / AIS', 'Bank statement Apr–Mar']),
          due_date: '5 Oct',
        }),
      },
      { id: 'm2', from: 'client', time: '10:42', file: { name: 'Form16_PartAB.pdf', size: '2 pages · 412 KB' }, matched: 'Filed as Form 16 · To review', link: { requestId: 'r1', clientId: 'ramesh-itr', docId: 'form16' } },
      { id: 'm3', from: 'client', time: '10:44', file: { name: 'Bank_statement_Apr-Mar.pdf', size: '3 pages · 1.1 MB' }, matched: 'Sorted as Bank statement · Please check', link: { requestId: 'r1', clientId: 'ramesh-itr', docId: 'bank' } },
      { id: 'm3s', from: 'system', time: '10:44', text: '2 photos were skipped because they did not look like documents. They were not saved.' },
    ],
  },
  {
    id: 'c-unassigned',
    title: '+91 91888 99955',
    phone: '+91 91888 99955',
    clientIds: [],
    unassigned: true,
    unread: 2,
    msgs: [
      { id: 'u1', from: 'client', time: '09:12', file: { name: 'scan_001.pdf', size: '3 pages · 1.1 MB' } },
      { id: 'u2', from: 'client', time: '09:12', file: { name: 'scan_002.pdf', size: '2 pages · 640 KB' } },
    ],
  },
  {
    id: 'c-priya',
    title: 'Priya Textiles',
    phone: '+91 97222 33442',
    clientIds: ['priya'],
    unread: 3,
    msgs: [
      { id: 'p1', from: 'ca', time: 'Mon', tick: 'read', text: say('reminder', { name: 'Priya' }) },
      { id: 'p2', from: 'client', time: '09:58', file: { name: 'Purchase register.xlsx', size: '240 KB' }, matched: 'Filed as Purchase register · To review', link: { requestId: 'r2', clientId: 'priya', docId: 'purchase' } },
    ],
  },
  {
    id: 'c-anand',
    title: 'Anand Traders',
    phone: '+91 99333 44418',
    clientIds: ['anand'],
    unread: 0,
    msgs: [{ id: 'a1', from: 'ca', time: 'Yesterday', tick: 'read', text: say('pendinglist', { name: 'Anand', request: 'TDS quarterly', pending_count: '2', pending_documents: formatList(['Form 16A', 'Bank statement Apr–Mar']), due_date: '28 Sep' }) }],
  },
  {
    id: 'c-meera',
    title: 'Meera Iyer',
    phone: '+91 96444 55577',
    clientIds: ['meera'],
    unread: 0,
    msgs: [{ id: 'e1', from: 'ca', time: 'Yesterday', tick: 'read', text: say('thanks', { name: 'Meera' }) }],
  },
  {
    id: 'c-kapoor',
    title: 'Kapoor Logistics',
    phone: '+91 90555 66663',
    clientIds: ['kapoor'],
    unread: 0,
    msgs: [{ id: 'k1', from: 'ca', time: 'Mon', tick: 'read', text: say('request', { name: 'Kapoor', request: 'GST monthly', documents: formatList(['Sales register', 'Purchase register', 'GSTR-2B', 'Bank statement Apr–Mar']), due_date: '3 Oct', link: `${LINK_DOMAIN}/u/k92pq` }) }],
  },
  {
    id: 'c-mehta',
    title: 'Mehta Foods Pvt Ltd',
    phone: '+91 98200 41876',
    clientIds: ['mehta-foods-pvt-ltd'],
    unread: 2,
    msgs: [
      { id: 'mf1', from: 'ca', time: 'Mon', tick: 'read', text: say('request', { name: 'Mehta', request: 'GST monthly', documents: formatList(['Sales register', 'Purchase register', 'GSTR-2B', 'Bank statement Apr–Mar']), due_date: '5 Oct' }) },
      { id: 'mf2', from: 'client', time: 'Tue', file: { name: 'Sales_register_Sep.xlsx', size: '310 KB' }, matched: 'Filed as Sales register · Approved' },
      { id: 'mf3', from: 'client', time: '08:32', text: 'Sir, purchase register aur GSTR-2B bhej raha hoon, ek minute.' },
      { id: 'mf4', from: 'client', time: '08:34', file: { name: 'Purchase_register_Sep.xlsx', size: '280 KB' }, matched: 'Filed as Purchase register · To review', link: { requestId: 'r4', clientId: 'mehta-foods-pvt-ltd', docId: 'purchase' } },
      { id: 'mf5', from: 'client', time: '08:35', file: { name: 'GSTR2B_092026.pdf', size: '4 pages · 520 KB' }, matched: 'Filed as GSTR-2B · To review', link: { requestId: 'r4', clientId: 'mehta-foods-pvt-ltd', docId: 'gstr2b' } },
    ],
  },
  {
    id: 'c-arjun',
    title: 'Arjun Mehta',
    phone: '+91 98765 11029',
    clientIds: ['arjun-mehta'],
    unread: 1,
    msgs: [
      { id: 'ar1', from: 'ca', time: 'Fri', tick: 'read', text: say('request', { name: 'Arjun', request: 'ITR salaried', documents: formatList(['PAN card', 'Aadhaar card', 'Form 16 (Part A & B)', 'Form 26AS / AIS', 'Bank statement Apr–Mar', 'Home loan interest certificate', 'LIC premium receipts']), due_date: '10 Oct' }) },
      { id: 'ar2', from: 'client', time: 'Sat', photo: true, matched: 'Filed as PAN card · Approved' },
      { id: 'ar3', from: 'client', time: '09:20', text: 'Form 16 office se mil gaya, bhej diya.' },
      { id: 'ar4', from: 'client', time: '09:21', file: { name: 'Form16_2025-26.pdf', size: '2 pages · 388 KB' }, matched: 'Filed as Form 16 · To review', link: { requestId: 'r5', clientId: 'arjun-mehta', docId: 'form16' } },
    ],
  },
  {
    id: 'c-rohit',
    title: 'Rohit Bansal',
    phone: '+91 99100 52284',
    clientIds: ['rohit-bansal'],
    unread: 1,
    msgs: [
      { id: 'ro1', from: 'ca', time: 'Wed', tick: 'read', text: say('reminder', { name: 'Rohit' }) },
      { id: 'ro2', from: 'client', time: 'Yesterday', text: 'Sir kal tak bhej dunga, bank statement download kar raha hoon.' },
      { id: 'ro3', from: 'ca', time: 'Yesterday', tick: 'read', text: say('thanks', { name: 'Rohit' }) },
      { id: 'ro4', from: 'client', time: '07:58', text: 'Net banking down hai aaj, kal pakka.' },
    ],
  },
  {
    id: 'c-pooja',
    title: 'Pooja Nair',
    phone: '+91 97300 66127',
    clientIds: ['pooja-nair'],
    unread: 0,
    msgs: [
      { id: 'po1', from: 'ca', time: 'Fri', tick: 'read', text: say('request', { name: 'Pooja', request: 'ITR salaried', documents: formatList(['PAN card', 'Aadhaar card', 'Form 16 (Part A & B)', 'Form 26AS / AIS']), due_date: '10 Oct' }) },
      { id: 'po2', from: 'client', time: 'Sat', file: { name: 'Bank_stmt.pdf', size: '5 pages · 900 KB' } },
      { id: 'po3', from: 'ca', time: 'Sat', tick: 'read', text: say('blurry', { name: 'Pooja', document: 'Bank statement Apr–Mar' }) },
      { id: 'po4', from: 'client', time: 'Sun', text: 'Ok, dobara bhejti hoon.' },
    ],
  },
  {
    id: 'c-metro',
    title: 'Metro Constructions',
    phone: '+91 98110 90455',
    clientIds: ['metro-constructions'],
    unread: 1,
    msgs: [
      { id: 'me1', from: 'ca', time: 'Mon', tick: 'read', text: say('pendinglist', { name: 'Metro', request: 'TDS quarterly', pending_count: '2', pending_documents: formatList(['Form 16A', 'Bank statement Apr–Mar']), due_date: '30 Sep' }) },
      { id: 'me2', from: 'ca', time: 'Yesterday', tick: 'read', text: say('overdue', { name: 'Metro', request: 'TDS quarterly', pending_documents: formatList(['Form 16A', 'Bank statement Apr–Mar']) }) },
      { id: 'me3', from: 'client', time: '09:05', text: 'Accountant chhutti par hai, Monday tak mil jayega.' },
    ],
  },
  {
    id: 'c-lotus',
    title: 'Lotus Interiors',
    phone: '+91 99880 31742',
    clientIds: ['lotus-interiors'],
    unread: 0,
    msgs: [
      { id: 'lo1', from: 'ca', time: 'Tue', tick: 'sent', text: say('request', { name: 'Lotus', request: 'GST monthly', documents: formatList(['Sales register', 'Purchase register', 'GSTR-2B', 'Bank statement Apr–Mar']), due_date: '8 Oct', link: `${LINK_DOMAIN}/u/l7wmz` }) },
    ],
  },
  {
    id: 'c-neha',
    title: 'Neha Kulkarni',
    phone: '+91 98230 77015',
    clientIds: ['neha-kulkarni'],
    unread: 0,
    msgs: [
      { id: 'ne1', from: 'ca', time: 'Sep 26', tick: 'read', text: say('request', { name: 'Neha', request: 'ITR salaried', documents: formatList(['PAN card', 'Aadhaar card', 'Form 16 (Part A & B)']), due_date: '10 Oct' }) },
      { id: 'ne2', from: 'client', time: 'Sep 27', file: { name: 'Form16.pdf', size: '2 pages · 402 KB' }, matched: 'Filed as Form 16 · Approved' },
      { id: 'ne3', from: 'ca', time: 'Sep 29', tick: 'read', text: say('approved', { name: 'Neha', request: 'ITR salaried' }) },
    ],
  },
  {
    id: 'c-singhania',
    title: 'Singhania Steels',
    phone: '+91 98990 24680',
    clientIds: ['singhania-steels'],
    unread: 1,
    msgs: [
      { id: 'si1', from: 'ca', time: 'Mon', tick: 'read', text: say('request', { name: 'Singhania', request: 'GST monthly', documents: formatList(['Sales register', 'Purchase register', 'GSTR-2B', 'Bank statement Apr–Mar']), due_date: '5 Oct' }) },
      { id: 'si2', from: 'client', time: '10:12', file: { name: 'Bank_statement_FY26.pdf', size: '8 pages · 1.4 MB' }, matched: 'Filed as Bank statement · To review', link: { requestId: 'r4', clientId: 'singhania-steels', docId: 'bank' } },
    ],
  },
  {
    id: 'c-unassigned2',
    title: '+91 90044 18273',
    phone: '+91 90044 18273',
    clientIds: [],
    unassigned: true,
    unread: 1,
    msgs: [{ id: 'u3', from: 'client', time: 'Yesterday', file: { name: 'IMG_4431.pdf', size: '1 page · 280 KB' } }],
  },
]

interface Store {
  conversations: Conversation[]
  unreadTotal: number
  mode: 'own' | 'kdk'
  setMode: (m: 'own' | 'kdk') => void
  markRead: (id: string) => void
  send: (id: string, text: string) => void
  assign: (id: string, clientId: string, requestId: string, docId: string, docName: string) => void
  notifyRejected: (convId: string, docName: string, reason: string) => void
}

const Ctx = createContext<Store | null>(null)

export function InboxProvider({ children }: { children: ReactNode }) {
  const { setDocStatus } = useRequests()
  const { readReplies } = useSetup()
  const [conversations, setConversations] = useState<Conversation[]>(seed)
  // 'own': CA connected their own WhatsApp, so client replies are read here.
  // 'kdk': messages go from the shared number; clients reply through the upload link, so nothing is read here.
  const [mode, setMode] = useState<'own' | 'kdk'>('own')

  const patch = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)))
  }, [])

  const markRead = useCallback((id: string) => patch(id, (c) => (c.unread ? { ...c, unread: 0 } : c)), [patch])

  const send = useCallback(
    (id: string, text: string) =>
      patch(id, (c) => ({ ...c, msgs: [...c.msgs, { id: `s${Date.now()}`, from: 'ca', time: nowTime(), tick: 'sent', text }] })),
    [patch],
  )

  const assign = useCallback(
    (id: string, clientId: string, requestId: string, docId: string, docName: string) => {
      const client = getClient(clientId)
      if (!client) return
      setDocStatus(requestId, clientId, docId, 'to_review')
      patch(id, (c) => ({
        ...c,
        unassigned: false,
        clientIds: [clientId],
        title: client.name,
        unread: 0,
        msgs: c.msgs.map((m, i) => (i === 0 ? { ...m, matched: `Filed as ${docName} · To review` } : m)),
      }))
    },
    [patch, setDocStatus],
  )

  const notifyRejected = useCallback(
    (convId: string, docName: string, reason: string) =>
      patch(convId, (c) => ({
        ...c,
        msgs: [...c.msgs, { id: `s${Date.now()}`, from: 'ca', time: nowTime(), tick: 'sent', text: say('rejected', { name: c.title.split(' ')[0], document: docName, reason }) }],
      })),
    [patch],
  )

  const unreadTotal = mode === 'kdk' || !readReplies ? 0 : conversations.reduce((n, c) => n + c.unread, 0)
  const value = useMemo(
    () => ({ conversations, unreadTotal, mode, setMode, markRead, send, assign, notifyRejected }),
    [conversations, unreadTotal, mode, markRead, send, assign, notifyRejected],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useInbox() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useInbox must be used inside InboxProvider')
  return v
}
