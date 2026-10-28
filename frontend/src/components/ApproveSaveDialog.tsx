import { createPortal } from 'react-dom'
import { autoFolderId } from '../data/master'
import type { DocRequest, RequestDoc } from '../data/requests'
import { parentIdOf } from '../data/mock'
import FolderPickerDialog from './FolderPickerDialog'

// Approving a document asks where to keep it. The folder we would suggest (the client, the year, the kind of work, or where the CA saved it before) is
// already chosen. Three ways out, none of them hidden: approve and save there, approve without saving, or cancel and do not approve.
export interface Approving {
  requestId: string
  clientId: string
  docId: string
}

export default function ApproveSaveDialog({ request, doc, clientId, onApprove, onClose }: { request: DocRequest; doc: RequestDoc; clientId: string; onApprove: (folderId: string | null) => void; onClose: () => void }) {
  const suggested = typeof doc.filedTo === 'string' ? doc.filedTo : autoFolderId(request.title, clientId)
  const files = [doc.fileName ?? `${doc.name}.pdf`, ...(doc.moreFiles ?? [])]
  return createPortal(
    <FolderPickerDialog
      title={`Approve ${doc.name}`}
      fileName={files[0]}
      more={files.slice(1)}
      suggested={suggested}
      clientIds={[parentIdOf(clientId)]}
      saveLabel="Approve and save here"
      alt={{ label: 'Approve without saving', onClick: () => onApprove(null) }}
      onSave={(folderId) => onApprove(folderId)}
      onClose={onClose}
    />,
    document.body,
  )
}
