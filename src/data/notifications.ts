import { useMemo } from 'react'
import { todayISO } from '../lib/dates'
import { useInbox } from './inbox'
import { fmtDate, useRequests } from './requests'
import { useSetup } from './setup'

export interface Notice {
  id: string // changes when the situation changes, so a bigger problem shows up as new again
  kind: 'overdue' | 'unmatched' | 'documents'
  title: string
  sub: string
  href: string
}

const MAX_OVERDUE = 3

// Only what needs a look right now. The full list of work is on the Dashboard, so it is not repeated here.
export function useNotifications(): Notice[] {
  const { requests } = useRequests()
  const { conversations, mode } = useInbox()
  const { readReplies } = useSetup()

  return useMemo(() => {
    const today = todayISO()
    const out: Notice[] = []

    // Requests whose last date has passed and where some clients still owe documents.
    const late = requests
      .map((r) => ({ r, n: r.clients.filter((c) => c.docs.some((d) => d.status === 'pending' || d.status === 'rejected')).length }))
      .filter((x) => x.r.due < today && x.n > 0)
      .sort((a, b) => b.n - a.n)
    for (const { r, n } of late.slice(0, MAX_OVERDUE)) {
      out.push({ id: `o:${r.id}:${n}`, kind: 'overdue', title: `${r.title}: ${n} ${n === 1 ? 'client is' : 'clients are'} late`, sub: `${r.ref} · the last date was ${fmtDate(r.due)}`, href: `/requests/${r.id}` })
    }
    if (late.length > MAX_OVERDUE) {
      out.push({ id: `o:more:${late.length}`, kind: 'overdue', title: `${late.length - MAX_OVERDUE} more ${late.length - MAX_OVERDUE === 1 ? 'request is' : 'requests are'} late`, sub: 'See them on Requests', href: '/requests?tab=waiting' })
    }

    // WhatsApp files that could not be matched to a client.
    if (mode === 'own' && readReplies) {
      const files = conversations.filter((c) => c.unassigned).reduce((n, c) => n + c.msgs.filter((m) => m.file).length, 0)
      if (files > 0) out.push({ id: `u:${files}`, kind: 'unmatched', title: `${files} ${files === 1 ? 'file' : 'files'} could not be matched`, sub: 'Choose which client they belong to', href: '/inbox' })
    }

    // Documents that arrived today and are waiting for a decision.
    let docs = 0
    const who = new Set<string>()
    for (const r of requests)
      for (const c of r.clients)
        for (const d of c.docs)
          if (d.status === 'to_review' && d.receivedAt?.startsWith('Today')) {
            docs++
            who.add(`${r.id}:${c.clientId}`)
          }
    if (docs > 0) out.push({ id: `d:${docs}`, kind: 'documents', title: `${docs} new ${docs === 1 ? 'document' : 'documents'} today`, sub: `From ${who.size} ${who.size === 1 ? 'client' : 'clients'}, ready to review`, href: '/requests?tab=review' })

    return out
  }, [requests, conversations, mode, readReplies])
}
