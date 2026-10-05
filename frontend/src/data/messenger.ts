import { useCallback } from 'react'
import { useInbox } from './inbox'
import { getClient } from './mock'
import { useRequests } from './requests'
import type { DocRequest, RequestClient } from './requests'
import { useSetup } from './setup'
import { LINK_DOMAIN } from '../lib/brand'
import { linkToken } from '../lib/links'
import { parseISO } from '../lib/dates'
import { fillTemplate, formatList } from '../lib/template'
import { seedMessages } from './messageTemplates'

// The one place that decides which message a client gets. Whatever goes out is also written into that client's Inbox chat.
//   a new request           -> "request"
//   Remind / Send update    -> some approved, some missing: "update" (2 approved, x, y still pending)
//                              nothing approved yet:        "pendinglist"
//                              nothing missing:             "thanks" (all received)
// Approving a single document sends nothing.
export function useMessenger() {
  const { firm } = useSetup()
  const { getRequest, remind } = useRequests()
  const { postToClient } = useInbox()

  const build = useCallback(
    (r: DocRequest, rc: RequestClient, id: 'request' | 'update'): string => {
      const client = getClient(rc.clientId)
      if (!client) return ''
      const counted = rc.docs.filter((d) => d.status !== 'na')
      const missing = counted.filter((d) => d.status === 'pending' || d.status === 'rejected')
      const approved = counted.filter((d) => d.status === 'approved').length
      const tid = id === 'request' ? 'request' : missing.length === 0 ? 'thanks' : approved > 0 ? 'update' : 'pendinglist'
      const tpl = seedMessages.find((m) => m.id === tid)!
      return fillTemplate(r.via === 'kdk' ? tpl.onBehalf : tpl.text, {
        name: client.name.split(' ')[0],
        firm: firm.name,
        request: r.title,
        documents: formatList(counted.map((d) => d.name)),
        pending_documents: formatList(missing.map((d) => d.name)),
        pending_count: String(missing.length),
        approved_count: String(approved),
        due_date: parseISO(r.due).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        link: `${LINK_DOMAIN}/u/${linkToken(r.ref, rc.clientId, rc.linkVersion ?? 1)}`,
      })
    },
    [firm.name],
  )

  // Every client of a new request gets their own message.
  const sendRequest = useCallback(
    (r: DocRequest) =>
      r.clients.forEach((rc) => {
        const client = getClient(rc.clientId)
        if (client) postToClient(client, build(r, rc, 'request'))
      }),
    [build, postToClient],
  )

  const sendUpdate = useCallback(
    (requestId: string, clientId: string) => {
      const r = getRequest(requestId)
      const rc = r?.clients.find((c) => c.clientId === clientId)
      const client = getClient(clientId)
      if (!r || !rc || !client) return
      postToClient(client, build(r, rc, 'update'))
      remind(requestId, clientId)
    },
    [getRequest, build, postToClient, remind],
  )

  // The exact text a client would get right now, for the preview before sending.
  const preview = useCallback(
    (requestId: string, clientId: string) => {
      const r = getRequest(requestId)
      const rc = r?.clients.find((c) => c.clientId === clientId)
      return r && rc ? build(r, rc, 'update') : ''
    },
    [getRequest, build],
  )

  return { sendRequest, sendUpdate, preview }
}
