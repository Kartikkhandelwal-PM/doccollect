import { addDays, endOfMonth, todayISO } from '../lib/dates'

// A date box with quick choices, so picking "a week from now" is one tap.
export default function DueDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = todayISO()
  const quick = [
    { label: 'In 3 days', date: addDays(today, 3) },
    { label: 'In 1 week', date: addDays(today, 7) },
    { label: 'In 2 weeks', date: addDays(today, 14) },
    { label: 'End of month', date: endOfMonth(today) },
  ]
  return (
    <div>
      <input
        type="date"
        value={value}
        min={today}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Last date"
        className="mt-1 block h-11 w-56 rounded-xl border border-line px-3.5 text-[15px] font-medium text-ink outline-none focus:border-brand"
      />
      <div className="mt-2.5 flex flex-wrap gap-2">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => onChange(q.date)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${value === q.date ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line hover:bg-canvas'}`}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  )
}
