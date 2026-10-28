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
