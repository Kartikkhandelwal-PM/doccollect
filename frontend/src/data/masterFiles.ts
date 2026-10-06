import { useMemo } from 'react'
import { buildMaster } from './master'
import type { MasterFile } from './master'
import { useMasterStore } from './masterStore'
import { useRequests } from './requests'

// Every file in Document Master as it stands now: approved documents and uploads, with the CA's own renames, moves and deletes applied.
// Everything that looks at the files (the Master page, a client's repository, search, "on file") reads this, so they all agree.
export function useMasterFiles(): MasterFile[] {
  const { requests } = useRequests()
  const { uploads, fileEdits } = useMasterStore()
  return useMemo(
    () =>
      [...buildMaster(requests), ...uploads]
        .filter((f) => !fileEdits[f.id]?.deleted)
        .map((f) => {
          const e = fileEdits[f.id]
          return e ? { ...f, name: e.name ?? f.name, folderId: e.folderId !== undefined ? e.folderId : f.folderId } : f
        }),
    [requests, uploads, fileEdits],
  )
}
