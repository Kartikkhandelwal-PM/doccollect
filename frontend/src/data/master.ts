import type { DocRequest } from './requests'
import { groups as starterGroups } from './catalog'
import { CURRENT_FY, periodOf } from '../lib/period'
import { lineRef } from '../lib/refs'
import { clients, getBookClient, getClient, parentIdOf, regSuffix } from './mock'
import type { Client } from './types'
import type { Service } from './types'

// The client first, then each registration (ITR, GST · place, TDS · place), then the year.
export const folderIdOf = (clientId: string, fy: string, compliance: string) => `c:${clientId}/${compliance}/${fy}`

export interface MasterFile {
  id: string
  // The folder the file sits in. null means the top level.
  folderId: string | null
  name: string
  fileName: string
  size: string
  date: string
  from: string
  clientId?: string // set for a file that came from a request, so it is the client's even when it sits in no folder
  docId?: string // the document (from the Documents list) this file is for. It gives the file its category, and ties a file to the Tracker.
  was?: string // set on a file whose document was deleted: the category that document was in
  period?: string // the year the file is for (FY 2025-26). With the client and docId it says what the file is; the folder only says where it is kept.
}

const sizeOf = (s: string) => {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const kb = (h % 900) + 100
  return kb > 700 ? `${(kb / 400).toFixed(1)} MB` : `${kb} KB`
}

// The starter document that has this name (the sample files of earlier years are named after them).
const starterIdByName = new Map(starterGroups.flatMap((g) => g.docs.map((d) => [d.name, d.id] as const)))

// The folder is the client's, and under it the registration (with the state or place when the client has several GSTINs or TANs) and then the year.
const file = (c: Client, fy: string, name: string, date: string, from = 'Earlier'): MasterFile => ({
  id: `${c.id}-${fy}-${name}`,
  folderId: folderIdOf(parentIdOf(c.id), fy, `${c.service}${regSuffix(c.id)}`),
  name,
  fileName: `${name.replace(/[^\w ]/g, '').trim()}.pdf`,
  size: sizeOf(name + c.id),
  date,
  from,
  docId: starterIdByName.get(name),
  period: fy,
  clientId: c.id,
})

// Files filed in earlier years, so the folders are not empty on day one. Made up for every client from the work they usually need.
const earlier: Record<Service, { fy: string; month: string; docs: string[] }[]> = {
  ITR: [
    { fy: 'FY 2024-25', month: 'Jul 2025', docs: ['Form 16 (Part A & B)', 'Form 26AS / AIS', 'Bank statement Apr–Mar'] },
    { fy: 'FY 2023-24', month: 'Jul 2024', docs: ['Form 16 (Part A & B)', 'Form 26AS / AIS', 'Bank statement Apr–Mar'] },
  ],
  GST: [
    { fy: 'FY 2025-26', month: 'Aug 2026', docs: ['GSTR-3B', 'Sales register', 'Purchase register', 'GSTR-2B'] },
    { fy: 'FY 2024-25', month: 'Mar 2026', docs: ['GSTR-9 (annual return)', 'GSTR-3B', 'Sales register'] },
  ],
  TDS: [
    { fy: 'FY 2025-26', month: 'Jul 2026', docs: ['TDS challans', 'Deductee list', 'Form 16A'] },
    { fy: 'FY 2024-25', month: 'Jan 2026', docs: ['TDS challans', 'Form 16A', 'Bank statement Apr–Mar'] },
  ],
}

const archive: MasterFile[] = clients.flatMap((c, i) =>
  earlier[c.service].flatMap((y) =>
    y.docs
      // not every client has every file, which is how a real office looks
      .filter((_, k) => (i + k) % 6 !== 5)
      .map((name) => file(c, y.fy, name, y.month)),
  ),
)

const complianceOf = (title: string, fallback: Service): string =>
  title.startsWith('ITR') ? 'ITR' : title.startsWith('GST') ? 'GST' : title.startsWith('TDS') ? 'TDS' : title || fallback

// The folder we would suggest for a document of this request: the client, the kind of work (with the place when the client has several GSTINs or TANs) and the year.
export function autoFolderId(request: { title: string; period?: string }, clientId: string, once = false): string {
  if (once) return folderIdOf(parentIdOf(clientId), 'Documents', PERMANENT)
  const client = getClient(clientId)
  const service = client?.service ?? 'ITR'
  return folderIdOf(parentIdOf(clientId), periodOf(request), `${complianceOf(request.title, service)}${service === 'ITR' ? '' : regSuffix(clientId)}`)
}

// A folder's name in full, for the ones the app makes (client > registration > year). A folder the CA made is named from the store, so the caller does that.
export function autoFolderLabel(folderId: string): string | undefined {
  const m = folderId.match(/^c:([^/]+)\/([^/]+)\/(.+)$/)
  if (!m) return undefined
  return `${getBookClient(m[1])?.name ?? m[1]} › ${m[2]} › ${m[3]}`
}

// What has been approved in requests, as files for Document Master.
// A document the CA saved in a folder sits there. One approved before this was asked (the sample data) sits in its client's folder. One approved with
// "without saving" sits in no folder (null) until the CA files it. A document of several files gives one file each.
export function buildMaster(requests: DocRequest[], once: ReadonlySet<string> = new Set()): MasterFile[] {
  const fromRequests = requests.flatMap((r) =>
    r.clients.flatMap((rc) => {
      const client = getClient(rc.clientId)
      if (!client) return []
      return rc.docs
        .filter((d) => d.status === 'approved')
        .flatMap((d) => {
          const forGood = once.has(d.id)
          const folderId = d.filedTo === undefined ? autoFolderId(r, rc.clientId, forGood) : d.filedTo
          return [d.fileName ?? `${d.name}.pdf`, ...(d.moreFiles ?? [])].map((fileName, i) => ({
            id: i === 0 ? `${r.id}-${rc.clientId}-${d.id}` : `${r.id}-${rc.clientId}-${d.id}-${i}`,
            folderId,
            name: i === 0 ? d.name : `${d.name} (${i + 1})`,
            fileName,
            size: sizeOf(d.name + rc.clientId + i),
            date: d.receivedAt ?? '',
            from: lineRef(r, rc.clientId),
            clientId: rc.clientId,
            docId: d.id,
            period: forGood ? undefined : periodOf(r),
          }))
        })
    }),
  )
  return [...fromRequests, ...archive]
}

// The Archive of a client: where the files of a deleted document go, by year. It sits in the client's own folder, next to its registrations.
export const ARCHIVE = 'Archive'
// Where the files of a document that is kept once (PAN, Aadhaar) go: the client's own Permanent folder, with no year.
export const PERMANENT = 'Permanent'
export const archiveFolderId = (clientId: string, period?: string) => folderIdOf(parentIdOf(clientId), period ?? CURRENT_FY, ARCHIVE)

// How a client folder is told apart from another one: the PAN.
export interface ClientFolderInfo {
  pan: string
  services: Service[]
  kind: 'person' | 'firm'
}
export function clientFolderInfo(clientId: string): ClientFolderInfo | undefined {
  const b = getBookClient(clientId)
  if (!b) return undefined
  const services = [...new Set(b.registrations.map((r) => r.type))] as Service[]
  return { pan: b.pan, services, kind: b.kind }
}
