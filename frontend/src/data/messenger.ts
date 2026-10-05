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
// Sending a document back tells the client which one and why. Approving a single document sends nothing.
const SENT_BACK: Record<string, 'blurry' | 'wrongdoc' | 'pages' | 'wrongyear'> = {
  'Blurry or unreadable': 'blurry',
  'Wrong document': 'wrongdoc',
  'Pages missing': 'pages',
  'Wrong year': 'wrongyear',
}

export function useMessenger() {
  const { firm } = useSetup()
  const { getRequest, remind, newLink } = useRequests()
  const { postToClient } = useInbox()

  const build = useCallback(
    (r: DocRequest, rc: RequestClient, id: 'request' | 'update' | 'rejected' | 'newlink' | 'blurry' | 'wrongdoc' | 'pages' | 'wrongyear', extra: Record<string, string> = {}): string => {
      const client = getClient(rc.clientId)
      if (!client) return ''
      const counted = rc.docs.filter((d) => d.status !== 'na')
      const missing = counted.filter((d) => d.status === 'pending' || d.status === 'rejected')
      const approved = counted.filter((d) => d.status === 'approved').length
      const tid = id !== 'update' ? id : missing.length === 0 ? 'thanks' : approved > 0 ? 'update' : 'pendinglist'
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
        ...extra,
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

  // The old link stops working and the client gets a fresh one.
  const sendNewLink = useCallback(
    (requestId: string, clientId: string) => {
      const r = getRequest(requestId)
      const rc = r?.clients.find((c) => c.clientId === clientId)
      const client = getClient(clientId)
      if (!r || !rc || !client) return
      postToClient(client, build(r, { ...rc, linkVersion: (rc.linkVersion ?? 1) + 1 }, 'newlink'))
      newLink(requestId, clientId)
    },
    [getRequest, build, postToClient, newLink],
  )

  // A document was sent back: the client is told which one and why. (Approving one document sends nothing.)
  const sendRejected = useCallback(
    (requestId: string, clientId: string, docName: string, reason: string, remark: string) => {
      const r = getRequest(requestId)
      const rc = r?.clients.find((c) => c.clientId === clientId)
      const client = getClient(clientId)
      if (!r || !rc || !client) return
      // A ready-made reason with no note of your own uses its own message; anything else goes out as "we could not accept ...: <your words>".
      const ready = remark ? undefined : SENT_BACK[reason]
      const words = [reason, remark].filter(Boolean).join(' · ') || 'please send it again'
      postToClient(client, build(r, rc, ready ?? 'rejected', { document: docName, reason: words.charAt(0).toLowerCase() + words.slice(1) }))
    },
    [getRequest, build, postToClient],
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

  return { sendRequest, sendUpdate, sendNewLink, sendRejected, preview }
}
