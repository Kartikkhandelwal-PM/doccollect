import { createPortal } from 'react-dom'
import { autoFolderId } from '../data/master'
import { useSetup } from '../data/setup'
import { autoStage } from '../data/requests'
import { useMessenger } from '../data/messenger'
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
  const { onceIds } = useSetup()
  const { autoWarning } = useMessenger()
  // The last required document of this client: approving it sends "All documents approved" by itself. Say beforehand if that cannot go.
  const rc = request.clients.find((c) => c.clientId === clientId)
  const isLast = !!rc && !doc.optional && autoStage({ ...rc, docs: rc.docs.map((d) => (d.id === doc.id ? { ...d, status: 'approved' } : d)) }) === 'approved'
  const warn = isLast ? (autoWarning('approved') ?? undefined) : undefined
  const suggested = typeof doc.filedTo === 'string' ? doc.filedTo : autoFolderId(request, clientId, onceIds.has(doc.id))
  const files = [doc.fileName ?? `${doc.name}.pdf`, ...(doc.moreFiles ?? [])]
  return createPortal(
    <FolderPickerDialog
      title={`Approve ${doc.name}`}
      warn={warn}
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
