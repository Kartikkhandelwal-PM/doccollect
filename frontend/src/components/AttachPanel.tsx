import { FilePlus2, FolderOpen, ListChecks, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import FolderPickerDialog from './FolderPickerDialog'
import RequestPickerDialog from './RequestPickerDialog'

// A file that is not on any document. One slim bar: what we think it is (one click to accept), or two buttons that open
// a window like a computer's Save dialog, to add it to a request's checklist or to save it in a folder with no request.
export interface AttachRequest { key: string; requestId: string; title: string; ref: string; due: string; place: string; docs: { key: string; name: string; extra?: boolean; multiple?: boolean; status?: string }[] }
export interface AttachSuggest { key: string; docName: string; requestTitle: string; ref: string }
export interface FolderChoice { id: string; label: string }
export interface AttachData { requests: AttachRequest[]; suggest?: AttachSuggest; folders: FolderChoice[]; suggestedFolder?: string; clientIds: string[]; fileName: string; forClient?: { name: string; guess: boolean; known?: boolean }; warn?: string; onStartRequest?: () => void; onWindow?: (open: boolean) => void }

export default function AttachPanel({ requests, suggest, suggestedFolder, clientIds, fileName, forClient, warn, onStartRequest, onWindow, onAttach, onSave }: AttachData & { onAttach: (key: string) => void; onSave: (folderId: string) => void }) {
  const [dialog, setDialog] = useState<'request' | 'folder' | null>(null)
  // While the Save-as / Add-to window is open, the preview under it hides, so one window is on screen at a time.
  useEffect(() => {
    onWindow?.(dialog !== null)
    return () => onWindow?.(false)
  }, [dialog, onWindow])
  const btnMain = 'flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-dark'
  const btn = 'flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold hover:border-brand disabled:opacity-40 disabled:hover:border-line'
  return (
    <div className="flex flex-col gap-2.5">
      {warn && <p className="rounded-xl bg-[#FEF1DC] px-3.5 py-2.5 text-[13px] font-semibold leading-snug text-warn">{warn}</p>}
      {suggest && (
        <div className="flex items-center gap-3 rounded-xl border border-brand/40 bg-brand-soft px-3.5 py-2.5">
          <Sparkles size={16} className="shrink-0 text-brand-dark" />
          <div className="min-w-0 flex-1 text-[13px] leading-snug">
            <div className="truncate font-semibold">Looks like {suggest.docName}</div>
            <div className="truncate text-muted">
              {suggest.requestTitle} · {suggest.ref}
            </div>
          </div>
          <button type="button" onClick={() => onAttach(suggest.key)} className="h-9 shrink-0 rounded-lg bg-brand px-4 text-[13px] font-semibold text-white">
            Add
          </button>
        </div>
      )}
      {requests.length === 0 && forClient === undefined && <p className="-mb-1 text-[13px] text-muted">We could not tell whose file this is. Save it in a folder, or save the number as a contact first.</p>}
      {requests.length === 0 && forClient !== undefined && <p className="-mb-1 text-[13px] text-muted">No open request for {forClient.name}. Keep the file in a folder, or start a request with it.</p>}
      <div className="flex gap-2.5">
        {requests.length === 0 ? (
          <>
            <button type="button" onClick={() => setDialog('folder')} className={btnMain}>
              <FolderOpen size={17} /> Save in a folder…
            </button>
            {onStartRequest && (
              <button type="button" onClick={onStartRequest} className={btn}>
                <FilePlus2 size={17} className="text-brand-dark" /> Start a request…
              </button>
            )}
          </>
        ) : (
          <>
            <button type="button" onClick={() => setDialog('request')} className={btn}>
              <ListChecks size={17} className="text-brand-dark" /> Add to a request…
            </button>
            <button type="button" onClick={() => setDialog('folder')} className={btn}>
              <FolderOpen size={17} className="text-brand-dark" /> Save in a folder…
            </button>
          </>
        )}
      </div>
      {requests.length > 0 && onStartRequest && (
        <button type="button" onClick={onStartRequest} className="-mb-1 self-center px-2 py-1 text-[13px] font-semibold text-muted hover:text-brand-dark hover:underline">
          None of these? Start a new request with this file
        </button>
      )}
      {dialog === 'request' && createPortal(<RequestPickerDialog fileName={fileName} requests={requests} suggestedKey={suggest?.key} onClose={() => setDialog(null)} onAdd={onAttach} />, document.body)}
      {dialog === 'folder' && createPortal(<FolderPickerDialog fileName={fileName} suggested={suggestedFolder} clientIds={clientIds} onClose={() => setDialog(null)} onSave={onSave} />, document.body)}
    </div>
  )
}
