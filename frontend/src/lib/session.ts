import { useEffect, useState } from 'react'

// Like useState, but the value survives a page refresh (for this tab only), so a message you just sent is still in the Inbox after a reload.
// A new build starts clean. Storage can be blocked, so every read and write is guarded.
export function useSessionState<T>(key: string, initial: T) {
  const full = `doccollect:${__BUILD_ID__}:${key}`
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(full)
      if (saved) return JSON.parse(saved) as T
    } catch {
      /* start from the sample data */
    }
    return initial
  })
  useEffect(() => {
    try {
      sessionStorage.setItem(full, JSON.stringify(value))
    } catch {
      /* not saved, still works */
    }
  }, [full, value])
  return [value, setValue] as const
}

// Puts the demo back to its sample data: saved values are cleared and the whole page loads again from the start page.
export function resetDemo() {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith('doccollect:'))
      .forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* nothing saved */
  }
  window.location.assign(import.meta.env.BASE_URL)
}
