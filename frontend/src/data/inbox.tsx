import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { formatList, fillTemplate } from '../lib/template'
import { seedMessages } from './messageTemplates'
import { getClient } from './mock'
import { useSetup } from './setup'
import { useSessionState } from '../lib/session'
import { addDays, todayISO } from '../lib/dates'
import { LINK_DOMAIN } from '../lib/brand'

export interface Msg {
  id: string
  from: 'ca' | 'client' | 'system'
  day: string // the date, like 2026-10-05. The chat shows it as Today, Yesterday, a weekday or a date.
  time: string // always the clock time, like 09:12
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
  via: 'own' | 'kdk' // which WhatsApp number this chat is on: the firm's own, or the shared CA Connect number
}

// The text a template produces for a client. The chat shows exactly this, never a hand-written copy.
const say = (id: string, values: Record<string, string>, via: 'own' | 'kdk' = 'own') => {
  const t = seedMessages.find((m) => m.id === id)
  return fillTemplate((via === 'kdk' ? t?.onBehalf : t?.text) ?? '', { firm: 'Kartik Khandelwal & Associates', link: `${LINK_DOMAIN}/u/r-1042-ramesh-itr-v1`, ...values })
}

const nowTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })

// A seed message has no `day` of its own when its time is a clock time (today).
type SeedMsg = Omit<Msg, 'day'> & { day?: string }

// The seed chats say when things happened in words. They are counted back from today, so the demo always looks current.
const AGO: Record<string, number> = { Yesterday: 1, Sun: 1, Sat: 2, Fri: 3, Wed: 5, Tue: 6, Mon: 7 }
const daysAgo = (label: string) => AGO[label] ?? (/^Sep (\d+)$/.test(label) ? 35 - Number(label.slice(4)) : 0)
type Seed = Omit<Conversation, 'via' | 'msgs'> & { via?: Conversation['via']; msgs: SeedMsg[] }

const rawSeed: Seed[] = [
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
        time: 'Sep 27',
        tick: 'read',
        text: say('request', {
          name: 'Ramesh',
          request: 'ITR salaried',
          documents: formatList(['PAN card', 'Aadhaar card', 'Form 16 (Part A & B)', 'Form 26AS / AIS', 'Bank statement Apr–Mar', 'Home loan interest certificate', 'LIC premium receipts']),
          due_date: '5 Oct',
        }),
      },
      {
        id: 'm1g',
        from: 'ca',
        time: 'Sep 27',
        tick: 'read',
        text: say('request', {
          name: 'Ramesh',
          request: 'GST monthly',
          documents: formatList(['Sales register', 'Purchase register', 'GSTR-2B', 'Bank statement Apr–Mar']),
          due_date: '7 Oct',
          link: `${LINK_DOMAIN}/u/r-1032-ramesh-gst-v1`,
        }),
      },
      { id: 'm2', from: 'client', time: '10:42', file: { name: 'Form16_PartAB.pdf', size: '2 pages · 412 KB' }, matched: 'Filed as Form 16 · To review', link: { requestId: 'r1', clientId: 'ramesh-itr', docId: 'form16' } },
      { id: 'm3', from: 'client', time: '10:44', file: { name: 'Bank_statement_Apr-Mar.pdf', size: '3 pages · 1.1 MB' }, matched: 'Filed as Bank statement · To review', link: { requestId: 'r1', clientId: 'ramesh-itr', docId: 'bank' } },
      // Sent in one go, and we could not tell which request they are for. They wait inside the request until the CA places them.
      { id: 'm4a', from: 'client', time: '10:46', file: { name: 'Sales_Sep_2026.xlsx', size: '240 KB' }, matched: 'Filed as Sales register · To review', link: { requestId: 'r15', clientId: 'ramesh-gst', docId: 'sales' } },
      { id: 'm4b', from: 'client', time: '10:47', file: { name: 'scan_0417.pdf', size: '1 page · 310 KB' }, matched: 'Not placed yet' },
      { id: 'm4c', from: 'client', time: '10:47', file: { name: 'HDFC_HL_Statement.pdf', size: '2 pages · 530 KB' }, matched: 'Not placed yet' },
      { id: 'm4d', from: 'client', time: '10:47', file: { name: 'Form16_page2.pdf', size: '1 page · 190 KB' }, matched: 'Not placed yet' },
      { id: 'm3s', from: 'system', time: '10:47', text: '2 photos were skipped because they did not look like documents. They were not saved.' },
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
      { id: 'p0', from: 'ca', time: 'Sep 28', tick: 'read', text: say('request', { name: 'Priya', request: 'GST monthly', documents: formatList(['Sales register', 'Purchase register', 'GSTR-2B', 'Bank statement Apr–Mar']), due_date: '3 Oct', link: `${LINK_DOMAIN}/u/r-1043-priya-v1` }) },
      { id: 'p0a', from: 'client', time: 'Sep 29', file: { name: 'GSTR2B_092026.pdf', size: '4 pages · 510 KB' }, matched: 'Filed as GSTR-2B · Approved', link: { requestId: 'r2', clientId: 'priya', docId: 'gstr2b' } },
      { id: 'p0b', from: 'ca', time: 'Sep 29', tick: 'read', text: say('approved', { name: 'Priya', document: 'GSTR-2B', pending_count: '2' }) },
      { id: 'p1', from: 'ca', time: 'Fri', tick: 'read', text: say('reminder', { name: 'Priya', link: `${LINK_DOMAIN}/u/r-1043-priya-v1` }) },
      { id: 'p2', from: 'client', time: '09:58', file: { name: 'Purchase register.xlsx', size: '240 KB' }, matched: 'Filed as Purchase register · To review', link: { requestId: 'r2', clientId: 'priya', docId: 'purchase' } },
    ],
  },
  {
    id: 'c-anand',
    title: 'Anand Traders',
    phone: '+91 99333 44418',
    clientIds: ['anand'],
    unread: 0,
    msgs: [
      { id: 'a0', from: 'ca', time: 'Sep 20', tick: 'read', text: say('request', { name: 'Anand', request: 'TDS quarterly', documents: formatList(['TDS challans', 'Deductee list', 'Form 16A', 'Bank statement Apr–Mar']), due_date: '28 Sep', link: `${LINK_DOMAIN}/u/r-1039-anand-v1` }) },
      { id: 'a0a', from: 'client', time: 'Sep 22', file: { name: 'TDS_challans_Q2.pdf', size: '3 pages · 640 KB' }, matched: 'Filed as TDS challans · Approved', link: { requestId: 'r3', clientId: 'anand', docId: 'challans' } },
      { id: 'a0b', from: 'client', time: 'Sep 22', file: { name: 'Deductee_list.xlsx', size: '96 KB' }, matched: 'Filed as Deductee list · Approved', link: { requestId: 'r3', clientId: 'anand', docId: 'deductees' } },
      { id: 'a1', from: 'ca', time: 'Yesterday', tick: 'read', text: say('pendinglist', { name: 'Anand', request: 'TDS quarterly', pending_count: '2', pending_documents: formatList(['Form 16A', 'Bank statement Apr–Mar']), due_date: '28 Sep' }) },
    ],
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
    msgs: [
      { id: 'k1', from: 'ca', time: 'Sep 28', tick: 'read', text: say('request', { name: 'Kapoor', request: 'GST monthly', documents: formatList(['Sales register', 'Purchase register', 'GSTR-2B', 'Bank statement Apr–Mar']), due_date: '3 Oct', link: `${LINK_DOMAIN}/u/r-1043-kapoor-v1` }) },
      { id: 'k2', from: 'ca', time: 'Sep 29', tick: 'read', text: say('pendinglist', { name: 'Kapoor', request: 'GST monthly', pending_count: '4', pending_documents: formatList(['Sales register', 'Purchase register', 'GSTR-2B', 'Bank statement Apr–Mar']), due_date: '3 Oct', link: `${LINK_DOMAIN}/u/r-1043-kapoor-v1` }) },
    ],
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
    via: 'kdk',
    unread: 0,
    msgs: [
      { id: 'lo1', from: 'ca', time: 'Tue', tick: 'sent', text: say('request', { name: 'Lotus', request: 'GST monthly', documents: formatList(['Sales register', 'Purchase register', 'GSTR-2B', 'Bank statement Apr–Mar']), due_date: '8 Oct', link: `${LINK_DOMAIN}/u/r-1035-lotus-interiors-v1` }, 'kdk') },
    ],
  },
  {
    id: 'c-sundaram',
    title: 'Sundaram Auto Parts',
    phone: getClient('sundaram-auto-parts')?.phone ?? '',
    clientIds: ['sundaram-auto-parts'],
    via: 'kdk',
    unread: 0,
    msgs: [{ id: 'su1', from: 'ca', time: 'Tue', tick: 'read', text: say('request', { name: 'Sundaram', request: 'GST monthly', documents: formatList(['Sales register', 'Purchase register', 'GSTR-2B', 'Bank statement Apr–Mar']), due_date: '8 Oct', link: `${LINK_DOMAIN}/u/r-1035-sundaram-auto-parts-v1` }, 'kdk') }],
  },
  {
    id: 'c-zenith',
    title: 'Zenith Packaging',
    phone: getClient('zenith-packaging')?.phone ?? '',
    clientIds: ['zenith-packaging'],
    via: 'kdk',
    unread: 0,
    msgs: [{ id: 'ze1', from: 'ca', time: 'Tue', tick: 'read', text: say('request', { name: 'Zenith', request: 'GST monthly', documents: formatList(['Sales register', 'Purchase register', 'GSTR-2B', 'Bank statement Apr–Mar']), due_date: '8 Oct', link: `${LINK_DOMAIN}/u/r-1035-zenith-packaging-v1` }, 'kdk') }],
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

// Seeds are written with either a clock time (that is today) or just a day. Every message ends up with both:
// the day, and a clock time. A day with no time gets believable ones, in order through the day.
const CLOCK = ['09:12', '10:26', '11:48', '13:05', '14:32', '15:50', '16:41', '17:20']
const seed: Conversation[] = rawSeed.map((c) => {
  let last = ''
  let n = 0
  const msgs = c.msgs.map((m): Msg => {
    if (m.day) return m as Msg
    if (/^\d\d:\d\d$/.test(m.time)) return { ...m, day: todayISO() }
    n = m.time === last ? n + 1 : 0
    last = m.time
    return { ...m, day: addDays(todayISO(), -daysAgo(m.time)), time: CLOCK[Math.min(n, CLOCK.length - 1)] }
  })
  return { ...c, via: c.via ?? 'own', msgs }
})

interface Store {
  conversations: Conversation[]
  unreadTotal: number
  markRead: (id: string) => void
  send: (id: string, text: string) => void
  postToClient: (client: { id: string; name: string; phone: string }, text: string, via: 'own' | 'kdk') => void
  settle: (id: string, note: string, keep: boolean) => void
  markPlaced: (id: string, fileName: string, note: string, link?: NonNullable<Msg['link']>) => void
  notifyRejected: (convId: string, docName: string, reason: string) => void
}

const Ctx = createContext<Store | null>(null)

export function InboxProvider({ children }: { children: ReactNode }) {
  const { readReplies } = useSetup()
  const [conversations, setConversations] = useSessionState<Conversation[]>('inbox', seed)

  const patch = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)))
  }, [])

  const markRead = useCallback((id: string) => patch(id, (c) => (c.unread ? { ...c, unread: 0 } : c)), [patch])

  const send = useCallback(
    (id: string, text: string) =>
      patch(id, (c) => ({ ...c, msgs: [...c.msgs, { id: `s${Date.now()}`, from: 'ca', day: todayISO(), time: nowTime(), tick: 'sent', text }] })),
    [patch],
  )

  // A file that was waiting got a place in a request: the chat now says where it went.
  const markPlaced = useCallback(
    (id: string, fileName: string, note: string, link?: NonNullable<Msg['link']>) =>
      patch(id, (c) => ({ ...c, msgs: c.msgs.map((m) => (m.file?.name === fileName && !m.link ? { ...m, matched: note, link } : m)) })),
    [patch],
  )

  // A message the app sends for a client (a request, a reminder, a thank-you). It lands in that client's chat,
  // which is found by phone number so clients on a shared number stay in one chat. No chat yet? One is started.
  const postToClient = useCallback((client: { id: string; name: string; phone: string }, text: string, via: 'own' | 'kdk') => {
    const msg: Msg = { id: `s${Date.now()}${Math.random().toString(36).slice(2, 6)}`, from: 'ca', day: todayISO(), time: nowTime(), tick: 'sent', text }
    setConversations((prev) => {
      const at = prev.findIndex((c) => !c.unassigned && c.via === via && (c.phone === client.phone || c.clientIds.includes(client.id)))
      if (at < 0) return [{ id: `c-${client.id}-${via}`, title: client.name, phone: client.phone, clientIds: [client.id], via, unread: 0, msgs: [msg] }, ...prev]
      const c = prev[at]
      const next = { ...c, clientIds: c.clientIds.includes(client.id) ? c.clientIds : [...c.clientIds, client.id], msgs: [...c.msgs, msg] }
      return [next, ...prev.slice(0, at), ...prev.slice(at + 1)]
    })
  }, [])

  // The files were put in Document Master, or dropped. Either way they are no longer waiting for a place.
  const settle = useCallback(
    (id: string, note: string, keep: boolean) =>
      setConversations((prev) => (keep ? prev.map((c) => (c.id === id ? { ...c, unassigned: false, unread: 0, msgs: c.msgs.map((m) => (m.file ? { ...m, matched: note } : m)) } : c)) : prev.filter((c) => c.id !== id))),
    [],
  )

  const notifyRejected = useCallback(
    (convId: string, docName: string, reason: string) =>
      patch(convId, (c) => ({
        ...c,
        msgs: [...c.msgs, { id: `s${Date.now()}`, from: 'ca', day: todayISO(), time: nowTime(), tick: 'sent', text: say('rejected', { name: c.title.split(' ')[0], document: docName, reason }) }],
      })),
    [patch],
  )

  // Only the firm's own number is read, so only its chats can have something new.
  const unreadTotal = !readReplies ? 0 : conversations.filter((c) => c.via === 'own').reduce((n, c) => n + c.unread, 0)
  const value = useMemo(
    () => ({ conversations, unreadTotal, markRead, send, postToClient, settle, markPlaced, notifyRejected }),
    [conversations, unreadTotal, markRead, send, postToClient, settle, markPlaced, notifyRejected],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useInbox() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useInbox must be used inside InboxProvider')
  return v
}
