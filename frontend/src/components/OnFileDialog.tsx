import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import FileTypeIcon from './FileTypeIcon'
import OpenInTab from './OpenInTab'
import PaperPreview from './PaperPreview'
import { fileLink } from '../lib/fileLink'

export interface OnFileEntry {
  clientId: string
  clientName: string
  pan: string
  fileName: string
  date: string
}

// Shows the copy we already hold of a document, so you can see it before deciding not to ask for it again.
export default function OnFileDialog({ docName, entries, onAskAgain, onClose }: { docName: string; entries: OnFileEntry[]; onAskAgain: () => void; onClose: () => void }) {
  const [picked, setPicked] = useState(entries[0]?.clientId ?? '')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const e = entries.find((x) => x.clientId === picked) ?? entries[0]
  if (!e) return null
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label={`${docName} on file`}>
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold">{docName} on file</div>
            <div className="text-[13px] text-muted">{entries.length === 1 ? 'We already have this, so it is not asked again.' : `We already have this for ${entries.length} of the clients you picked. It is not asked again from them.`}</div>
          </div>
          <OpenInTab iconOnly href={fileLink({ name: docName, fileName: e.fileName, client: e.clientName, pan: e.pan, from: e.date })} />
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas">
            <X size={20} />
          </button>
        </div>
        {entries.length > 1 && (
          <div className="max-h-44 shrink-0 overflow-y-auto border-b border-line">
            {entries.map((x) => (
              <button key={x.clientId} type="button" onClick={() => setPicked(x.clientId)} className={`flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm ${e.clientId === x.clientId ? 'bg-brand-soft font-semibold' : 'hover:bg-canvas'}`}>
                <FileTypeIcon file={x.fileName} size={26} />
                <span className="min-w-0 flex-1 truncate">{x.clientName}</span>
                <span className="shrink-0 text-xs font-normal text-muted">{x.date}</span>
              </button>
            ))}
          </div>
        )}
        <div className="min-h-0 overflow-y-auto bg-[#EDF0F5] px-6 py-6">
          <PaperPreview doc={{ name: docName }} client={{ name: e.clientName, pan: e.pan }} />
          <p className="mt-3 text-center text-[13px] text-muted">
            {e.clientName} · {e.fileName} · {e.date}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
          <button type="button" onClick={onAskAgain} className="text-[13px] font-semibold text-muted hover:text-ink hover:underline">
            {entries.length === 1 ? 'Ask again' : 'Ask all clients again'}
          </button>
          <button type="button" onClick={onClose} className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
