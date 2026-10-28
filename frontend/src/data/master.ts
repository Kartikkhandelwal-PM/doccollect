import type { DocRequest } from './requests'
import { clients, getBookClient, getClient, parentIdOf, regSuffix } from './mock'
import type { Client } from './types'
import type { Service } from './types'

export const folderIdOf = (clientId: string, fy: string, compliance: string) => `c:${clientId}/${fy}/${compliance}`

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
}

const sizeOf = (s: string) => {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const kb = (h % 900) + 100
  return kb > 700 ? `${(kb / 400).toFixed(1)} MB` : `${kb} KB`
}

// The folder is the client's, and under it the year and the compliance (with the state or place when the client has several GSTINs or TANs).
const file = (c: Client, fy: string, name: string, date: string, from = 'Earlier'): MasterFile => ({
  id: `${c.id}-${fy}-${name}`,
  folderId: folderIdOf(parentIdOf(c.id), fy, `${c.service}${regSuffix(c.id)}`),
  name,
  fileName: `${name.replace(/[^\w ]/g, '').trim()}.pdf`,
  size: sizeOf(name + c.id),
  date,
  from,
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

// The folder we would suggest for a document of this request: the client, the year and the kind of work (with the place when the client has several GSTINs or TANs).
export function autoFolderId(requestTitle: string, clientId: string): string {
  const client = getClient(clientId)
  const service = client?.service ?? 'ITR'
  return folderIdOf(parentIdOf(clientId), 'FY 2025-26', `${complianceOf(requestTitle, service)}${service === 'ITR' ? '' : regSuffix(clientId)}`)
}

// A folder's name in full, for the ones the app makes (client > year > kind). A folder the CA made is named from the store, so the caller does that.
export function autoFolderLabel(folderId: string): string | undefined {
  const m = folderId.match(/^c:([^/]+)\/([^/]+)\/(.+)$/)
  if (!m) return undefined
  return `${getBookClient(m[1])?.name ?? m[1]} › ${m[2]} › ${m[3]}`
}

// What has been approved in requests, as files for Document Master.
// A document the CA saved in a folder sits there. One approved before this was asked (the sample data) sits in its client's folder. One approved with
// "without saving" sits in no folder (null) until the CA files it. A document of several files gives one file each.
export function buildMaster(requests: DocRequest[]): MasterFile[] {
  const fromRequests = requests.flatMap((r) =>
    r.clients.flatMap((rc) => {
      const client = getClient(rc.clientId)
      if (!client) return []
      return rc.docs
        .filter((d) => d.status === 'approved')
        .flatMap((d) => {
          const folderId = d.filedTo === undefined ? autoFolderId(r.title, rc.clientId) : d.filedTo
          return [d.fileName ?? `${d.name}.pdf`, ...(d.moreFiles ?? [])].map((fileName, i) => ({
            id: i === 0 ? `${r.id}-${rc.clientId}-${d.id}` : `${r.id}-${rc.clientId}-${d.id}-${i}`,
            folderId,
            name: i === 0 ? d.name : `${d.name} (${i + 1})`,
            fileName,
            size: sizeOf(d.name + rc.clientId + i),
            date: d.receivedAt ?? '',
            from: r.ref,
            clientId: rc.clientId,
          }))
        })
    }),
  )
  return [...fromRequests, ...archive]
}

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
