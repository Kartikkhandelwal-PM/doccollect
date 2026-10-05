import { Download } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import FileTypeIcon from '../components/FileTypeIcon'
import PaperPreview from '../components/PaperPreview'
import { APP_NAME } from '../lib/brand'

// A file on a page of its own, for opening in a new tab. No sidebar and no login.
export default function FileView() {
  const [q] = useSearchParams()
  const name = q.get('name') ?? 'Document'
  const file = q.get('file') ?? name
  const files = [file, ...q.getAll('more')]
  return (
    <div className="flex min-h-full flex-col bg-[#EDF0F5]">
      <header className="flex items-center gap-3 border-b border-line bg-white px-6 py-3.5">
        <FileTypeIcon file={file} size={36} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold">{name}</h1>
          <p className="truncate text-[13px] text-muted">
            {q.get('client')}
            {q.get('from') ? ` · ${q.get('from')}` : ''} · {APP_NAME}
          </p>
        </div>
        <button type="button" className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-canvas">
          <Download size={16} />
          Download
        </button>
      </header>
      {files.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-6 py-2 text-[13px]">
          <span className="font-semibold text-muted">{files.length} files:</span>
          {files.map((f) => (
            <span key={f} className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2 py-1 font-medium text-slate-700">
              <FileTypeIcon file={f} size={16} />
              {f}
            </span>
          ))}
        </div>
      )}
      <main className="flex-1 overflow-auto px-6 py-10">
        <PaperPreview doc={{ name }} client={{ name: q.get('client') ?? '', pan: q.get('pan') ?? '' }} />
        <p className="mt-6 text-center text-xs text-muted">Sample preview. The client&apos;s real file shows here.</p>
      </main>
    </div>
  )
}
