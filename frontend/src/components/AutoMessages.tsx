import { useEffect, useRef } from 'react'
import { autoStage, useRequests } from '../data/requests'
import { useMessenger } from '../data/messenger'

// Sends the two automatic messages, once for each client of a request:
//   the last required document arrives  -> "All documents received"
//   the last required document is approved -> "All documents approved"
// It watches the requests, so it works the same wherever the file or the approval comes from. Where the app opens, nothing is sent for what is already there.
export default function AutoMessages() {
  const { requests } = useRequests()
  const { sendAuto } = useMessenger()
  const seen = useRef<Map<string, 'approved' | 'arrived' | null>>(new Map())
  const told = useRef<Set<string>>(new Set())
  const first = useRef(true)

  useEffect(() => {
    requests.forEach((r) =>
      r.clients.forEach((rc) => {
        const key = `${r.id}/${rc.clientId}`
        const now = autoStage(rc)
        const was = seen.current.get(key)
        seen.current.set(key, now)
        if (first.current || was === undefined || now === was || now === null) return
        // 'arrived' -> 'approved' means the received message has gone before, so only the approved one goes then
        const kind = now === 'approved' ? 'approved' : 'thanks'
        const once = `${key}/${kind}`
        if (told.current.has(once)) return
        told.current.add(once)
        sendAuto(r, rc, kind)
      }),
    )
    first.current = false
  }, [requests, sendAuto])

  return null
}
