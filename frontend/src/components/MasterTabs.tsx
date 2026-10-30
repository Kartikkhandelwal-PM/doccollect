import { useSearchParams } from 'react-router-dom'

// Document Master has two views of the same files: the folders (where each file is kept) and the Tracker (who has sent what).
export default function MasterTabs() {
  const [params, setParams] = useSearchParams()
  const tracker = params.get('view') === 'tracker'
  const pick = (view: 'folders' | 'tracker') => setParams(view === 'tracker' ? { view: 'tracker' } : {}, { replace: true })
  const tab = (on: boolean) => `h-9 rounded-lg px-4 text-sm font-semibold ${on ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`
  return (
    <div role="tablist" aria-label="Document Master view" className="inline-flex gap-1 rounded-xl bg-slate-200/70 p-1">
      <button type="button" role="tab" aria-selected={!tracker} onClick={() => pick('folders')} className={tab(!tracker)}>
        Folders
      </button>
      <button type="button" role="tab" aria-selected={tracker} onClick={() => pick('tracker')} className={tab(tracker)}>
        Tracker
      </button>
    </div>
  )
}
