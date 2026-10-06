import type { DocRequest } from './requests'
import { clients, getClient } from './mock'
import type { Service } from './types'

export const folderIdOf = (clientId: string, fy: string, compliance: string) => `c:${clientId}/${fy}/${compliance}`

// Some documents never change from one filing to the next. Once approved they are kept in the client's own "Permanent documents" folder,
// and later requests do not ask for them again.
export const PERMANENT_DOCS = ['PAN card', 'Aadhaar card', 'GST registration certificate', 'Udyam registration']
export const isPermanent = (name: string) => PERMANENT_DOCS.includes(name)
export const permanentFolder = (clientId: string) => `c:${clientId}/Permanent documents`

export interface MasterFile {
  id: string
  // The folder the file sits in. null means the top level.
  folderId: string | null
  name: string
  fileName: string
  size: string
  date: string
  from: string
}

const sizeOf = (s: string) => {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const kb = (h % 900) + 100
  return kb > 700 ? `${(kb / 400).toFixed(1)} MB` : `${kb} KB`
}

const file = (clientId: string, fy: string, compliance: Service, name: string, date: string, from = 'Earlier'): MasterFile => ({
  id: `${clientId}-${fy}-${name}`,
  folderId: folderIdOf(clientId, fy, compliance),
  name,
  fileName: `${name.replace(/[^\w ]/g, '').trim()}.pdf`,
  size: sizeOf(name + clientId),
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

// PAN for most clients, and Aadhaar for people filing ITR. Some are missing on purpose, as in a real office.
const permanentFiles: MasterFile[] = clients.flatMap((c, i) =>
  [...(i % 5 !== 3 ? ['PAN card'] : []), ...(c.service === 'ITR' && i % 4 !== 1 ? ['Aadhaar card'] : [])].map((name) => ({
    ...file(c.id, 'FY 2024-25', c.service, name, 'Jul 2025'),
    id: `${c.id}-permanent-${name}`,
    folderId: permanentFolder(c.id),
  })),
)

const archive: MasterFile[] = clients.flatMap((c, i) =>
  earlier[c.service].flatMap((y) =>
    y.docs
      // not every client has every file, which is how a real office looks
      .filter((_, k) => (i + k) % 6 !== 5)
      .map((name) => file(c.id, y.fy, c.service, name, y.month)),
  ),
)

const complianceOf = (title: string, fallback: Service): string =>
  title.startsWith('ITR') ? 'ITR' : title.startsWith('GST') ? 'GST' : title.startsWith('TDS') ? 'TDS' : title || fallback

// Everything approved in a request is filed here automatically.
export function buildMaster(requests: DocRequest[]): MasterFile[] {
  const fromRequests = requests.flatMap((r) =>
    r.clients.flatMap((rc) => {
      const client = getClient(rc.clientId)
      if (!client) return []
      return rc.docs
        // a document that was already on file is not filed a second time
        .filter((d) => d.status === 'approved' && !d.reused)
        .map((d) => ({
          id: `${r.id}-${rc.clientId}-${d.id}`,
          folderId: isPermanent(d.name) ? permanentFolder(rc.clientId) : folderIdOf(rc.clientId, 'FY 2025-26', complianceOf(r.title, client.service)),
          name: d.name,
          fileName: d.fileName ?? `${d.name}.pdf`,
          size: sizeOf(d.name + rc.clientId),
          date: d.receivedAt ?? '',
          from: r.ref,
        }))
    }),
  )
  return [...fromRequests, ...permanentFiles, ...archive]
}
