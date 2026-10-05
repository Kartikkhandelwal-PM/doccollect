import { Bell, Check, ChevronLeft, ChevronRight, MessageCircle, Plus, UserPlus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import ReminderDialog from '../components/ReminderDialog'
import { useMessenger } from '../data/messenger'
import { useAttention } from '../data/attention'
import { useSetup } from '../data/setup'
import { getClient } from '../data/mock'
import type { DocRequest as Request } from '../data/requests'
import { progress, requestState, useRequests } from '../data/requests'
import { daysUntil, iso, parseISO, todayISO } from '../lib/dates'
import { serviceColor } from '../lib/status'

type Tab = 'all' | 'received' | 'no_response'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// One row height for every kind of item, so the table reads as a clean grid.
const ROW = 'grid grid-cols-[18px_minmax(0,1fr)_112px_148px_92px] items-center gap-4 px-6'

// A month calendar. Every day is a box. Days with requests due show a coloured bar, and a click opens that day below.
function MiniCalendar({ requests }: { requests: Request[] }) {
  const [offset, setOffset] = useState(0)
  const today = todayISO()
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const lead = (first.getDay() + 6) % 7 // weeks start on Monday
  const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const weeks = Math.ceil((lead + total) / 7)

  const due = useMemo(() => {
    const map = new Map<string, Request[]>()
    for (const r of requests) {
      if (requestState(r) === 'completed') continue
      map.set(r.due, [...(map.get(r.due) ?? []), r])
    }
    return map
  }, [requests])

  const cells = Array.from({ length: weeks * 7 }, (_, n) => new Date(first.getFullYear(), first.getMonth(), 1 - lead + n))
  const tone = (day: string) => (day < today ? 'bg-danger' : daysUntil(day) <= 3 ? 'bg-[#D9822B]' : 'bg-brand')
  const arrow = 'flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-canvas hover:text-ink'
  const navigate = useNavigate()

  return (
    <section className="rounded-[18px] border border-line bg-white px-5 pb-4 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight">{first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
        <div className="flex items-center gap-1">
          {offset !== 0 && (
            <button type="button" onClick={() => setOffset(0)} className="mr-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-soft">
              Today
            </button>
          )}
          <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="Previous month" className={arrow}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="Next month" className={arrow}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-7 border-b border-line bg-slate-50 text-center text-[11px] font-bold uppercase tracking-wide text-faint">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span key={d} className="py-1.5">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, n) => {
            const day = iso(d)
            const here = due.get(day) ?? []
            const inMonth = d.getMonth() === first.getMonth()
            const isToday = day === today
            const weekend = n % 7 >= 5
            return (
              <button
                key={day}
                type="button"
                onClick={() => here.length && navigate(here.length === 1 ? `/requests/${here[0].id}` : '/requests')}
                title={here.length ? `${here.slice(0, 5).map((r) => r.title).join(', ')}${here.length > 5 ? ` and ${here.length - 5} more` : ''}` : undefined}
                aria-label={`${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}${here.length ? `, ${here.length} due` : ''}`}
                className={`flex h-[46px] flex-col items-center justify-center gap-1 border-b border-r border-line transition [&:nth-child(7n)]:border-r-0 ${
                  here.length ? 'cursor-pointer hover:bg-brand-soft/50' : 'cursor-default'
                } ${inMonth ? (weekend ? 'bg-slate-50/70' : 'bg-white') : 'bg-slate-50/70'}`}
              >
                <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] tabular-nums ${isToday ? 'bg-brand font-bold text-white' : inMonth ? 'font-semibold' : 'text-faint/70'}`}>{d.getDate()}</span>
                <span className="flex h-3 items-center gap-1">
                  {here.length > 0 && <span className={`h-1.5 w-1.5 rounded-full ${tone(day)}`} />}
                  {here.length > 1 && <span className="text-[10px] font-bold leading-none tabular-nums text-muted">{here.length}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 whitespace-nowrap text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" />
          Late
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#D9822B]" />
          Within 3 days
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" />
          Later
        </span>
      </div>

    </section>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { team } = useSetup()
  const firstName = team[0].name.split(' ')[0]
  const { items, stats } = useAttention()
  const { sendUpdate, preview } = useMessenger()
  const [tab, setTab] = useState<Tab>('all')
  const { requests } = useRequests()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const counts = useMemo(
    () => ({
      all: items.length,
      received: items.filter((i) => i.kind === 'received').length,
      no_response: items.filter((i) => i.kind === 'no_response').length,
    }),
    [items],
  )

  const visible = items
    .filter((i) => tab === 'all' || i.kind === tab)

  // Requests that are due in the next 7 days, or already late.
  const dueSoon = requests
    .filter((r) => requestState(r) !== 'completed')
    .map((r) => ({ r, days: daysUntil(r.due) }))
    .filter((x) => x.days <= 7)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4)

  // Only the first few. The full list, with search and paging, lives on its own page.
  const SHOW = 9
  const shown = visible.slice(0, SHOW)
  const viewAll = tab === 'received' ? '/requests?tab=review' : tab === 'no_response' ? '/requests?tab=waiting' : '/requests'

  const picked = items.filter((i) => selected.has(i.id))
  const toRemind = picked.filter((i) => i.kind === 'no_response')
  const [asking, setAsking] = useState(false)
  const allShown = shown.length > 0 && shown.every((i) => selected.has(i.id))

  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleAll = () => setSelected(allShown ? new Set() : new Set(shown.map((i) => i.id)))

  const sendReminders = () => {
    toRemind.forEach((i) => sendUpdate(i.requestId!, i.clientId!))
    setToast(`Reminder sent to ${toRemind.length} ${toRemind.length === 1 ? 'client' : 'clients'} on WhatsApp`)
    setSelected(new Set())
    setAsking(false)
  }
  const remindOne = (i: (typeof items)[number]) => {
    sendUpdate(i.requestId!, i.clientId!)
    setToast(`Reminder sent to ${i.title} on WhatsApp`)
  }

  const tabs: { key: Tab; label: string; danger?: boolean }[] = [
    { key: 'all', label: 'All' },
    { key: 'received', label: 'To review' },
    { key: 'no_response', label: 'Waiting' },
  ]

  const dateText = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex min-h-full flex-col gap-5 px-8 py-6">
      <section className="flex items-center justify-between rounded-[22px] border border-[#D3E9E4] bg-gradient-to-r from-[#DDF3EC] via-[#E7F4F6] to-[#E6EEFC] px-8 py-7">
        <div>
          <div className="text-[13px] font-semibold text-brand-dark">{dateText}</div>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight">{greeting()}, {firstName}</h1>
          <p className="mt-1.5 text-[15px] text-slate-600">
            {counts.received} {counts.received === 1 ? 'client has' : 'clients have'} sent documents to review, and {stats.overdue} {stats.overdue === 1 ? 'is' : 'are'} overdue.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/clients" className="flex h-12 shrink-0 items-center whitespace-nowrap gap-2 rounded-xl border border-[#CFE3DE] bg-white px-5 text-sm font-semibold">
            <UserPlus size={17} />
            Add client
          </Link>
          <Link to="/requests/new" className="flex h-12 shrink-0 items-center whitespace-nowrap gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)]">
            <Plus size={17} strokeWidth={2.3} />
            New request
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-12 items-stretch gap-5">
        <div className="col-span-8 flex min-w-0 scroll-mt-4 flex-col">

      <section className="flex min-h-[420px] flex-1 flex-col rounded-[18px] border border-line bg-white">
        <div className="sticky top-0 z-10 rounded-t-[18px] bg-white">
        <div className="flex h-14 shrink-0 items-center justify-between gap-4 px-6">
          <h2 className="text-base font-bold tracking-tight">Work queue</h2>
        </div>
        <div className="flex h-12 shrink-0 items-center gap-6 border-b border-line px-6 text-sm font-semibold text-muted">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex h-12 items-center border-b-[3px] ${tab === t.key ? 'border-brand text-brand-dark' : 'border-transparent hover:text-ink'}`}
            >
              {t.label}
              <span className={`ml-1.5 rounded-md px-1.5 py-px text-xs ${t.danger ? 'bg-danger-soft text-danger' : 'bg-canvas'}`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {picked.length > 0 && (
          <div className="flex items-center gap-3 border-b border-[#BFDDD2] bg-brand-soft px-6 py-2.5" role="toolbar" aria-label="Bulk actions">
            <span className="text-sm font-semibold text-brand-dark">{picked.length} selected</span>
            <button
              type="button"
              onClick={() => setAsking(true)}
              disabled={toRemind.length === 0}
              title={toRemind.length === 0 ? 'Pick clients who still owe documents' : undefined}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              <Bell size={14} />
              Remind{toRemind.length ? ` (${toRemind.length})` : ''}
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold text-slate-600 hover:bg-white">
              <X size={14} />
              Clear
            </button>
          </div>
        )}
        <div className={`${ROW} border-b border-t border-line bg-slate-50/80 py-2 text-[11px] font-bold uppercase tracking-wider text-faint`}>
          <button
            type="button"
            role="checkbox"
            aria-checked={allShown}
            aria-label="Select all rows"
            onClick={toggleAll}
            className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] ${allShown ? 'bg-brand text-white' : 'border-[1.5px] border-slate-300 bg-white'}`}
          >
            {allShown && <Check size={12} strokeWidth={3.4} />}
          </button>
          <span>Client</span>
          <span>Received</span>
          <span>Needs</span>
          <span />
        </div>

        </div>

        <div className="flex-1">
          {visible.length === 0 && <p className="p-8 text-sm text-muted">Nothing here right now.</p>}
          {shown.map((i) => {
            const on = selected.has(i.id)
            const pct = i.total ? (i.got / i.total) * 100 : 0
            const chip =
              i.kind === 'received'
                ? { text: `${i.toReview} to review`, cls: 'bg-warn-soft text-warn' }
                : i.kind === 'unassigned'
                  ? { text: 'Unassigned', cls: 'bg-canvas text-slate-600' }
                  : i.status === 'overdue'
                    ? { text: 'Overdue', cls: 'bg-danger-soft text-danger' }
                    : { text: 'Waiting', cls: 'bg-info-soft text-info' }
            return (
              <div
                key={i.id}
                onClick={() => navigate(i.href)}
                className={`${ROW} group h-[68px] cursor-pointer border-b border-line last:border-b-0 ${on ? 'bg-brand-soft/60' : 'hover:bg-slate-50'}`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`Select ${i.title}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleOne(i.id)
                  }}
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] ${on ? 'bg-brand text-white' : 'border-[1.5px] border-slate-300 bg-white group-hover:border-slate-400'}`}
                >
                  {on && <Check size={12} strokeWidth={3.4} />}
                </button>

                <div className="flex min-w-0 items-center gap-3">
                  {i.kind === 'unassigned' ? (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-muted">
                      <MessageCircle size={17} />
                    </span>
                  ) : (
                    <Avatar name={i.title} size={36} />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {i.title}
                      {i.service && <span className={`ml-2 text-xs font-bold ${serviceColor[i.service]}`}>{i.service}</span>}
                    </div>
                    <div className="mt-0.5 truncate text-[13px] text-muted">{i.kind === 'unassigned' ? i.sub : `${i.request} · ${i.sub}`}</div>
                  </div>
                </div>

                <div>
                  {i.total > 0 ? (
                    <>
                      <div className="text-[13px] font-semibold tabular-nums">
                        {i.got} <span className="font-medium text-muted">of {i.total}</span>
                      </div>
                      <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <span className={`block h-full rounded-full ${i.status === 'overdue' ? 'bg-danger' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
                      </span>
                    </>
                  ) : (
                    <span className="text-[13px] text-faint">–</span>
                  )}
                </div>

                <div className="min-w-0">
                  <span className={`inline-block rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${chip.cls}`}>{chip.text}</span>
                  <div className={`mt-1 truncate text-xs ${i.activityTone === 'danger' ? 'font-semibold text-danger' : 'text-muted'}`}>{i.activity}</div>
                </div>

                <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
                  {i.kind === 'no_response' ? (
                    <button
                      type="button"
                      onClick={() => remindOne(i)}
                      title="Send a reminder on WhatsApp"
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold hover:border-brand hover:text-brand-dark"
                    >
                      <Bell size={14} />
                      Remind
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(i.href)}
                      className="flex h-9 items-center rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <Link to={viewAll} className="flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-b-[18px] border-t border-line bg-slate-50/80 text-[13px] font-semibold text-brand hover:bg-canvas">
          {visible.length > SHOW ? `View all ${visible.length} ${tab === 'all' ? 'items' : 'clients'}` : 'Open Requests'}
          <ChevronRight size={15} />
        </Link>
      </section>
        </div>

        <aside className="col-span-4 flex flex-col gap-5">
          <MiniCalendar requests={requests} />
          <section className="flex-1 rounded-[18px] border border-line bg-white px-5 pb-3 pt-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-bold tracking-tight">Due this week</h2>
              <Link to="/requests" className="text-[13px] font-semibold text-brand hover:underline">
                All requests
              </Link>
            </div>
            {dueSoon.length === 0 && <p className="py-4 text-sm text-muted">Nothing is due in the next 7 days.</p>}
            <div className="mt-2">
              {dueSoon.map(({ r, days }) => {
                const p = progress(r)
                const names = r.clients.map((c) => getClient(c.clientId)?.name).filter(Boolean) as string[]
                const late = days < 0
                const d = parseISO(r.due)
                const label = late ? `${-days} ${days === -1 ? 'day' : 'days'} late` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`
                return (
                  <Link key={r.id} to={`/requests/${r.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
                    <div className="flex w-12 shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(14,27,44,0.06)]" aria-hidden="true">
                      <span className={`py-0.5 text-center text-[9px] font-bold uppercase tracking-widest text-white ${late ? 'bg-danger' : days <= 1 ? 'bg-[#D9822B]' : 'bg-brand'}`}>{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
                      <span className={`py-1 text-center text-[19px] font-bold leading-none tabular-nums ${late ? 'text-danger' : ''}`}>{d.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{r.title}</span>
                        <span className={`shrink-0 text-xs font-semibold ${late ? 'text-danger' : days <= 1 ? 'text-warn' : 'text-muted'}`}>{label}</span>
                      </div>
                      <div className="truncate text-xs text-muted">
                        {names[0]}
                        {names.length > 1 && ` +${names.length - 1}`}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <span className={`block h-full rounded-full ${late ? 'bg-danger' : 'bg-brand'}`} style={{ width: `${p.total ? (p.received / p.total) * 100 : 0}%` }} />
                        </span>
                        <span className="text-[11px] tabular-nums text-muted">
                          {p.received}/{p.total}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

        </aside>
      </div>
      {asking && toRemind.length > 0 && <ReminderDialog targets={toRemind.map((i) => ({ requestId: i.requestId!, clientId: i.clientId! }))} text={preview(toRemind[0].requestId!, toRemind[0].clientId!)} onSend={sendReminders} onClose={() => setAsking(false)} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl" role="status">
          <Check size={16} className="text-emerald-300" />
          {toast}
        </div>
      )}
    </div>
  )
}
