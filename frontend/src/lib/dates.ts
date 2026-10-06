// All dates here are plain "YYYY-MM-DD" days in the user's own time zone.
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const parseISO = (s: string) => new Date(`${s}T00:00:00`)
export const todayISO = () => iso(new Date())

export function addDays(day: string, n: number) {
  const d = parseISO(day)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export function endOfMonth(day = todayISO()) {
  const d = parseISO(day)
  return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

// A link works until the last date plus a few extra days, so a client who is a little late can still upload.
export const expiresOn = (due: string, graceDays: number) => addDays(due, graceDays)
export const isExpired = (due: string, graceDays: number) => todayISO() > expiresOn(due, graceDays)

// A sensible last date to suggest: GST returns on the 20th, everything else a week from today.
export function defaultDue(templateId: string) {
  const now = new Date()
  if (templateId === 'gst') {
    const d = new Date(now.getFullYear(), now.getMonth(), 20)
    if (d <= now) d.setMonth(d.getMonth() + 1)
    return iso(d)
  }
  return addDays(todayISO(), 7)
}

export const daysUntil = (day: string) => Math.round((parseISO(day).getTime() - parseISO(todayISO()).getTime()) / 86400000)

// The sample requests were written as of 5 Oct 2026. Their dates move along with today, so the demo always has requests
// that are late, due today, due this week and due later, whenever it is opened.
const SAMPLE_DAY = '2026-10-05'
export const demoDay = (day: string) => addDays(day, Math.round((parseISO(todayISO()).getTime() - parseISO(SAMPLE_DAY).getTime()) / 86400000))
