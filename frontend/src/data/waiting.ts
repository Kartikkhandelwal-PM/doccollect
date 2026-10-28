import { useMemo } from 'react'
import { useInbox } from './inbox'
import { useRequests } from './requests'

// Files that came in and are on no document yet, counted one way everywhere (the notification, Settings > Usage, anywhere else):
// the files waiting for a known client (kept per phone number, counted once for a number) and the files of unknown numbers.
export function useWaitingFiles() {
  const { conversations } = useInbox()
  const { unsorted } = useRequests()
  return useMemo(() => {
    const seen = new Set<string>()
    const chats: { id: string; title: string; n: number }[] = []
    for (const c of conversations) {
      const n = c.unassigned ? c.msgs.filter((m) => m.file && !m.matched).length : seen.has(c.phone) ? 0 : unsorted.filter((u) => u.phone === c.phone).length
      seen.add(c.phone)
      if (n > 0) chats.push({ id: c.id, title: c.title, n })
    }
    return { total: chats.reduce((t, x) => t + x.n, 0), chats: chats.sort((a, b) => b.n - a.n) }
  }, [conversations, unsorted])
}
