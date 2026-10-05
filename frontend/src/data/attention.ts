import { useMemo } from 'react'
import { todayISO } from '../lib/dates'
import { useInbox } from './inbox'
import { getClient } from './mock'
import { fmtDate, isReceived, useRequests } from './requests'
import { useSetup } from './setup'
import type { AttentionItem } from './types'

// What the CA has to look at. One row is one client in one request, so 100 clients stay 100 rows, never 400 documents.
export function useAttention() {
  const { requests } = useRequests()
  const { conversations, mode } = useInbox()
  const { readReplies } = useSetup()

  return useMemo(() => {
    const today = todayISO()
    const review: AttentionItem[] = []
    const silent: AttentionItem[] = []
    const stats = { overdue: 0 }

    for (const r of requests) {
      for (const rc of r.clients) {
        const client = getClient(rc.clientId)
        if (!client) continue
        const counted = rc.docs.filter((d) => d.status !== 'na')
        const missing = counted.filter((d) => d.status === 'pending' || d.status === 'rejected').length
        const toReview = counted.filter((d) => d.status === 'to_review')
        const got = counted.filter(isReceived).length
        const late = missing > 0 && r.due < today
        if (late) stats.overdue++

        const base = { clientId: rc.clientId, service: client.service, requestId: r.id, request: r.title, got, total: counted.length, toReview: toReview.length, title: client.name }

        if (toReview.length > 0) {
          const first = toReview[0]
          review.push({
            ...base,
            id: `s:${r.id}:${rc.clientId}`,
            kind: 'received',
            sub: (toReview.length === 1 ? toReview[0].name : `${toReview[0].name} and ${toReview.length - 1} more`) + '',
            activity: first.receivedAt ?? '',
            activitySub: first.source === 'Link' ? 'via upload link' : 'via WhatsApp reply',
            status: 'to_review',
            href: `/requests/${r.id}?client=${rc.clientId}`,
          })
        } else if (missing > 0) {
          silent.push({
            ...base,
            id: `s:${r.id}:${rc.clientId}`,
            kind: 'no_response',
            sub: `${missing} ${missing === 1 ? 'document' : 'documents'} missing`,
            activity: late ? `Overdue since ${fmtDate(r.due)}` : got === 0 ? `Waiting since ${fmtDate(r.createdAt)}` : `Due ${fmtDate(r.due)}`,
            activitySub: rc.lastReminder ? `Last reminder ${rc.lastReminder}` : 'No reminder sent yet',
            activityTone: late ? 'danger' : undefined,
            status: late ? 'overdue' : 'awaiting',
            href: `/requests/${r.id}?client=${rc.clientId}`,
          })
        }
      }
    }

    // Late ones first, so they are not missed.
    silent.sort((a, b) => Number(b.status === 'overdue') - Number(a.status === 'overdue'))

    // Files from a WhatsApp number we could not match to a client. Only exists when the CA's own WhatsApp is connected.
    const unassigned: AttentionItem[] =
      mode !== 'own' || !readReplies
        ? []
        : conversations
            .filter((c) => c.unassigned)
            .map((c) => ({
              id: `u:${c.id}`,
              kind: 'unassigned' as const,
              title: `${c.msgs.filter((m) => m.file).length} files from ${c.phone}`,
              sub: 'We could not tell which client sent these',
              request: 'Not matched',
              got: 0,
              total: 0,
              toReview: 0,
              activity: c.msgs[c.msgs.length - 1].time,
              activitySub: 'via WhatsApp',
              status: 'unassigned' as const,
              href: `/inbox?chat=${c.id}`,
            }))

    return { items: [...review, ...silent, ...unassigned], stats }
  }, [requests, conversations, mode, readReplies])
}
