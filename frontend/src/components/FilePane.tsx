import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { RequestDoc } from '../data/requests'
import type { Client } from '../data/types'
import FileTypeIcon from './FileTypeIcon'
import PaperPreview from './PaperPreview'

// Only these open in a browser. Everything else (Excel, Word, ZIP, HEIC...) is seen after it is downloaded.
const SHOWN = /\.(pdf|jpe?g|png|gif|webp)$/i
export const canPreview = (name: string) => SHOWN.test(name)

const kindOf = (name: string) => {
  const ext = (name.split('.').pop() ?? '').toLowerCase()
  if (['xls', 'xlsx', 'xlsm', 'csv'].includes(ext)) return 'Excel sheet'
  if (['doc', 'docx'].includes(ext)) return 'Word document'
  if (['zip', 'rar', '7z'].includes(ext)) return 'Compressed folder'
  if (['heic', 'heif'].includes(ext)) return 'HEIC photo'
  if (['txt'].includes(ext)) return 'Text file'
  return ext ? `${ext.toUpperCase()} file` : 'File'
}

// The file itself: a preview when the browser can show it, otherwise a card that says so, with a Download button.
export default function FilePane({ fileName, docName, client }: { fileName: string; docName: Pick<RequestDoc, 'name'>['name']; client: Pick<Client, 'name' | 'pan'> }) {
  const [started, setStarted] = useState(false)
  useEffect(() => setStarted(false), [fileName])
  if (canPreview(fileName))
    return (
      <div>
        <PaperPreview doc={{ name: docName }} client={client} />
        <p className="mt-4 text-center text-xs text-muted">Sample page. The client&apos;s real file shows here.</p>
      </div>
    )
  return (
    <div className="mx-auto flex w-[360px] flex-col items-center rounded-2xl bg-white px-8 py-10 text-center shadow-[0_2px_18px_rgba(14,27,44,0.16)]">
      <FileTypeIcon file={fileName} size={72} />
      <div className="mt-4 max-w-full truncate text-[15px] font-bold">{fileName}</div>
      <div className="mt-0.5 text-[13px] text-muted">{kindOf(fileName)}</div>
      <p className="mt-4 text-[14px] leading-relaxed text-slate-600">This kind of file cannot be shown here. Download it to look at it, then come back to approve or reject.</p>
      <button type="button" onClick={() => setStarted(true)} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-dark">
        <Download size={17} /> Download
      </button>
      {started && <p className="mt-2 text-[12px] text-muted">Download started (in this demo no real file is saved).</p>}
    </div>
  )
}
