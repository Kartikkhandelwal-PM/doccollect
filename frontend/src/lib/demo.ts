// Demo helpers ("simulate a reply", "a file arrives") are for showing the app, not for using it, so they stay out of sight.
// Open any page with ?demo=1 to show them (kept for the rest of the tab session); ?demo=0 hides them again.
const KEY = 'doccollect-demo'
export function demoOn(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get('demo')
    if (q === '1') sessionStorage.setItem(KEY, '1')
    if (q === '0') sessionStorage.removeItem(KEY)
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

// A fresh firm, with nothing in it yet: no clients, requests, chats or folders. Open /empty (or any page with ?empty=1) to see the app that way (kept for the tab
// session; /sample or ?empty=0 brings the sample data back). Changing mode clears what this tab had saved, so the two never mix.
let emptyMode: boolean | null = null
export function emptyOn(): boolean {
  if (emptyMode !== null) return emptyMode
  try {
    // /empty and /sample are short links for ?empty=1 and ?empty=0
    const path = window.location.pathname.replace(/\/$/, '')
    const q = path.endsWith('/empty') ? '1' : path.endsWith('/sample') ? '0' : new URLSearchParams(window.location.search).get('empty')
    const was = sessionStorage.getItem('doccollect-empty') === '1'
    const now = q === '1' ? true : q === '0' ? false : was
    if (now !== was) {
      Object.keys(sessionStorage).filter((k) => k.startsWith('doccollect:')).forEach((k) => sessionStorage.removeItem(k))
      if (now) sessionStorage.setItem('doccollect-empty', '1')
      else sessionStorage.removeItem('doccollect-empty')
    }
    emptyMode = now
  } catch {
    emptyMode = false
  }
  return emptyMode
}
