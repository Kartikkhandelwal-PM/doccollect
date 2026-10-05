import { LINK_DOMAIN } from './brand'

export const variables: { key: string; label: string }[] = [
  { key: 'name', label: 'Client name' },
  { key: 'firm', label: 'Firm name' },
  { key: 'request', label: 'Request name' },
  { key: 'documents', label: 'Documents asked for' },
  { key: 'pending_documents', label: 'Documents still pending' },
  { key: 'approved_count', label: 'How many are approved' },
  { key: 'pending_count', label: 'How many are pending' },
  { key: 'document', label: 'One document' },
  { key: 'reason', label: 'Reason' },
  { key: 'year', label: 'Financial year' },
  { key: 'due_date', label: 'Due date' },
  { key: 'link', label: 'Upload link' },
]

// Sample values used for previews.
export const sample: Record<string, string> = {
  name: 'Ramesh',
  firm: 'Kartik Khandelwal & Associates',
  request: 'ITR FY 2025-26',
  documents: '1. Form 16\n2. Form 26AS / AIS\n3. Bank statement Apr–Mar',
  pending_documents: '1. Home loan interest certificate\n2. LIC premium receipts',
  approved_count: '3',
  pending_count: '2',
  document: 'Bank statement',
  reason: 'page 3 is missing',
  year: '2025-26',
  due_date: '5 Oct',
  link: `${LINK_DOMAIN}/u/r-1042-ramesh-itr-v1`,
}

// A list of documents as numbered lines. Very long lists show the first few and point to the link.
const MAX_LISTED = 8
export function formatList(names: string[]) {
  const lines = names.slice(0, MAX_LISTED).map((n, i) => `${i + 1}. ${n}`)
  const more = names.length - MAX_LISTED
  if (more > 0) lines.push(`...and ${more} more (see the link)`)
  return lines.join('\n')
}

// By default every variable gets a sample value (for previews).
// With useSamples = false only the values you pass in are filled, so the rest stay as {variable} for you to complete.
export function fillTemplate(text: string, values: Record<string, string> = {}, useSamples = true) {
  const all = useSamples ? { ...sample, ...values } : values
  return text.replace(/\{(\w+)\}/g, (m, k: string) => all[k] ?? m)
}
