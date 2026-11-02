import { useCallback } from 'react'
import { useInbox } from './inbox'
import { contactOf, whatsappOn } from './contacts'
import { getBookClient, getClient, regSuffix } from './mock'
import { isCounted, useRequests } from './requests'
import type { DocRequest, RequestClient } from './requests'
import { useSetup } from './setup'
import { LINK_DOMAIN } from '../lib/brand'
import { linkToken } from '../lib/links'
import { parseISO } from '../lib/dates'
import { countLabel, formatDocuments, fillTemplate, formatList } from '../lib/template'
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

// What a send came to. 'blocked' = nothing was sent because WhatsApp is not ready (a dialog has said why).
export type SendResult = { status: 'sent' } | { status: 'blocked' } | { status: 'failed'; reason: string }
// The line a screen shows after a send. null when nothing was sent (a dialog has already said why).
export const sentToast = (r: SendResult, ok: string, who: string): string | null => (r.status === 'sent' ? ok : r.status === 'failed' ? `Could not send to ${who}: ${r.reason}` : null)
// After a document was sent back: the document is rejected either way, this says whether the client was told.
export const rejectedToast = (r: SendResult, doc: string): string =>
  r.status === 'sent' ? `${doc} rejected. The client was told on WhatsApp.` : r.status === 'blocked' ? `${doc} rejected. The client was not told, because that message cannot be sent now. See Settings, under WhatsApp.` : `${doc} rejected. The client was not told: ${r.reason}.`
type Delivery = { ok: true } | { ok: false; reason: string }

// Numbers that are not on WhatsApp. In the real product this comes from WhatsApp's delivery report after a send; the demo has one such client (Vikram Enterprises).
const NOT_ON_WHATSAPP = new Set(['+91 93777 88809'])

export function useMessenger() {
  const { firm, viaFor, sendState, askConnect, templateState } = useSetup()
  const { getRequest, remind, newLink } = useRequests()
  const { postToClient } = useInbox()

  // A request keeps the number it was sent from. Each message still goes from the firm's own number only if that number is connected and WhatsApp has approved that
  // message's template; otherwise it goes from the shared number. (Which template a message uses is worked out in tidOf.)
  const viaOf = useCallback((r: DocRequest, templateId: string): 'own' | 'kdk' => viaFor(r.via, templateId), [viaFor])
  const tidOf = (rc: RequestClient, id: string) => {
    if (id !== 'update') return id
    const counted = rc.docs.filter(isCounted)
    const missing = counted.filter((d) => d.status === 'pending' || d.status === 'rejected').length
    const approved = counted.filter((d) => d.status === 'approved').length
    return missing === 0 ? 'thanks' : approved > 0 ? 'update' : 'pendinglist'
  }

  // Sends to the client. The message also lands in that client's chat; when WhatsApp reports that the number is not on WhatsApp, the chat shows it as not delivered.
  const post = useCallback(
    (to: { id: string; name: string; phone: string }, text: string, via: 'own' | 'kdk'): Delivery => {
      // The id is a registration. Its contact (maybe changed on the client page) gets the message, and only when WhatsApp is on for it.
      const book = getBookClient(to.id)
      const reg = book?.registrations.find((r) => r.id === to.id)
      if (book && reg && !whatsappOn(book, reg)) return { ok: false, reason: 'WhatsApp is switched off for this contact' }
      const client = book && reg ? { ...to, phone: contactOf(book, reg).phone || to.phone } : to
      const failed = NOT_ON_WHATSAPP.has(client.phone) ? 'Not on WhatsApp' : undefined
      postToClient(client, text, via, failed)
      return failed ? { ok: false, reason: failed } : { ok: true }
    },
    [postToClient],
  )

  const build = useCallback(
    (r: DocRequest, rc: RequestClient, id: 'request' | 'update' | 'rejected' | 'rejectedopt' | 'newlink' | 'blurry' | 'wrongdoc' | 'pages' | 'wrongyear', extra: Record<string, string> = {}): string => {
      const client = getClient(rc.clientId)
      if (!client) return ''
      const counted = rc.docs.filter(isCounted)
      const missing = counted.filter((d) => d.status === 'pending' || d.status === 'rejected')
      const approved = counted.filter((d) => d.status === 'approved').length
      const tid = id !== 'update' ? id : missing.length === 0 ? 'thanks' : approved > 0 ? 'update' : 'pendinglist'
      const tpl = seedMessages.find((m) => m.id === tid)!
      return fillTemplate(viaOf(r, tid) === 'kdk' ? tpl.onBehalf : tpl.text, {
        name: client.name,
        firm: firm.name,
        // a client with several GSTINs or TANs: say which one this is, like "GST monthly (Karnataka)"
        request: `${r.title}${regSuffix(rc.clientId) ? ` (${regSuffix(rc.clientId).replace(' · ', '')})` : ''}`,
        // The request lists everything asked for, the required ones first; an optional one says so, so the client knows it can skip it.
        documents: formatDocuments(rc.docs.filter((d) => d.status !== 'na' && !d.optional).map((d) => d.name), rc.docs.filter((d) => d.status !== 'na' && d.optional).map((d) => d.name)),
        // An optional document that was sent and sent back is chased like the others, and is marked so.
        pending_documents: formatList(missing.map((d) => (d.optional ? `${d.name} (optional)` : d.name))),
        pending_count: String(missing.length),
        pending_label: countLabel(missing.length),
        approved_count: String(approved),
        due_date: parseISO(r.due).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        link: `${LINK_DOMAIN}/u/${linkToken(r.ref, rc.clientId, rc.linkVersion ?? 1)}`,
        ...extra,
      })
    },
    [firm.name, viaOf],
  )

  // A message can go only when the connection is fine and WhatsApp has approved that message. Otherwise a dialog says what is missing.
  const canSendMsg = useCallback((tid: string) => sendState === 'ready' && templateState(tid) === 'approved', [sendState, templateState])
  const blocked = useCallback(
    (tid: string) => {
      if (canSendMsg(tid)) return false
      askConnect(tid)
      return true
    },
    [canSendMsg, askConnect],
  )

  // Every client of a new request gets their own message.
  const sendRequest = useCallback(
    (r: DocRequest): string[] => {
      const failed: string[] = []
      r.clients.forEach((rc) => {
        const client = getClient(rc.clientId)
        if (client && !post(client, build(r, rc, 'request'), viaOf(r, 'request')).ok) failed.push(client.name)
      })
      return failed
    },
    [build, post, viaOf],
  )

  const sendUpdate = useCallback(
    (requestId: string, clientId: string): SendResult => {
      const r = getRequest(requestId)
      const rc = r?.clients.find((c) => c.clientId === clientId)
      const client = getClient(clientId)
      if (!r || !rc || !client) return { status: 'failed', reason: 'Client not found' }
      const tid = tidOf(rc, 'update')
      if (blocked(tid)) return { status: 'blocked' }
      const d = post(client, build(r, rc, 'update'), viaOf(r, tid))
      if (d.ok) remind(requestId, clientId)
      return d.ok ? { status: 'sent' } : { status: 'failed', reason: d.reason }
    },
    [getRequest, build, post, viaOf, remind, blocked],
  )

  // The old link stops working and the client gets a fresh one.
  const sendNewLink = useCallback(
    (requestId: string, clientId: string): SendResult => {
      const r = getRequest(requestId)
      const rc = r?.clients.find((c) => c.clientId === clientId)
      const client = getClient(clientId)
      if (!r || !rc || !client) return { status: 'failed', reason: 'Client not found' }
      if (blocked('newlink')) return { status: 'blocked' }
      const d = post(client, build(r, { ...rc, linkVersion: (rc.linkVersion ?? 1) + 1 }, 'newlink'), viaOf(r, 'newlink'))
      if (d.ok) newLink(requestId, clientId)
      return d.ok ? { status: 'sent' } : { status: 'failed', reason: d.reason }
    },
    [getRequest, build, post, viaOf, newLink, blocked],
  )

  // A document was sent back: the client is told which one and why. (Approving one document sends nothing.)
  // The document is sent back whatever happens. The result says whether the client could be told, so the screen can say so.
  const sendRejected = useCallback(
    (requestId: string, clientId: string, docName: string, reason: string, remark: string): SendResult => {
      const r = getRequest(requestId)
      const rc = r?.clients.find((c) => c.clientId === clientId)
      const client = getClient(clientId)
      if (!r || !rc || !client) return { status: 'failed', reason: 'Client not found' }
      // A ready-made reason with no note of your own uses its own message; anything else goes out as "we could not accept ...: <your words>".
      const ready = remark ? undefined : SENT_BACK[reason]
      const words = [reason, remark].filter(Boolean).join(' · ') || 'please send it again'
      // An optional document that is sent back gets its own, softer message: it can still be skipped.
      const optional = !!rc.docs.find((d) => d.name === docName)?.optional
      const rid = optional ? 'rejectedopt' : (ready ?? 'rejected')
      if (!canSendMsg(rid)) return { status: 'blocked' }
      const d = post(client, build(r, rc, rid, { document: docName, reason: words.charAt(0).toLowerCase() + words.slice(1) }), viaOf(r, rid))
      return d.ok ? { status: 'sent' } : { status: 'failed', reason: d.reason }
    },
    [getRequest, build, post, viaOf, canSendMsg],
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

  return { sendRequest, sendUpdate, sendNewLink, sendRejected, canSend: canSendMsg, ready: sendState === 'ready', askConnect, preview }
}
