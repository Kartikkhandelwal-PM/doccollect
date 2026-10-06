import { motion } from 'framer-motion'
import Toast from '../components/Toast'
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
import { rowIn } from '../lib/motion'

type Tab = 'all' | 'received' | 'no_response'

const MotionLink = motion.create(Link)

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// One row height for every kind of item, so the table reads as a clean grid.
// On a phone each row becomes a small card: who and the button on top, then how far along and what is needed.
const ROW = 'grid grid-cols-[18px_minmax(0,1fr)_112px_148px_92px] items-center gap-4 px-6 @max-2xl:flex @max-2xl:flex-wrap @max-2xl:gap-x-3 @max-2xl:gap-y-2.5 @max-2xl:px-4'

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

  // Requests that are due in the next 7 days, plus the one or two that are most late. Late ones never crowd out what is coming.
  const open = requests
    .filter((r) => requestState(r) !== 'completed')
    .map((r) => ({ r, days: daysUntil(r.due) }))
    .filter((x) => x.days <= 7)
  const late = open.filter((x) => x.days < 0).sort((a, b) => a.days - b.days)
  const coming = open.filter((x) => x.days >= 0).sort((a, b) => a.days - b.days)
  const lateShown = late.slice(0, Math.min(2, Math.max(1, 4 - coming.length)))
  // Keep one that is a few days away in the list, so it is not all red and amber.
  const room = 4 - lateShown.length
  const next = coming.slice(0, room)
  const later = coming.find((x) => x.days >= 3)
  if (later && next.length === room && !next.some((x) => x.days >= 3)) next[room - 1] = later
  const dueSoon = [...lateShown, ...next]

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
    <div className="flex min-h-full flex-col gap-4 px-4 py-4 pb-8 max-md:pb-28 md:gap-5 md:px-8 md:py-6 md:pb-8">
      <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-4 rounded-[22px] border border-[#D3E9E4] bg-gradient-to-r from-[#DDF3EC] via-[#E7F4F6] to-[#E6EEFC] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-8 md:py-7">
        <div>
          <div className="text-[13px] font-semibold text-brand-dark">{dateText}</div>
          <h1 className="mt-1 text-[24px] font-bold tracking-tight md:text-[28px]">{greeting()}, {firstName}</h1>
          <p className="mt-1.5 text-[15px] text-slate-600">
            {counts.received} {counts.received === 1 ? 'client has' : 'clients have'} sent documents to review, and {stats.overdue} {stats.overdue === 1 ? 'is' : 'are'} overdue.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex">
          <Link to="/clients" className="flex h-12 shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-xl border border-[#CFE3DE] bg-white px-5 text-sm font-semibold">
            <UserPlus size={17} />
            Add client
          </Link>
          <Link to="/requests/new" className="flex h-12 shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(11,122,107,0.25)]">
            <Plus size={17} strokeWidth={2.3} />
            New request
          </Link>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 items-stretch gap-4 md:gap-5 lg:grid-cols-12">
        <div className="flex min-w-0 lg:col-span-8 scroll-mt-4 flex-col">

      <section className="@container flex min-h-[420px] flex-1 flex-col rounded-[18px] border border-line bg-white">
        <div className="sticky top-0 z-10 rounded-t-[18px] bg-white">
        <div className="flex h-14 shrink-0 items-center justify-between gap-4 px-4 md:px-6">
          <h2 className="text-base font-bold tracking-tight">Work queue</h2>
        </div>
        <div className="flex h-12 shrink-0 items-center gap-6 overflow-x-auto border-b border-line px-4 text-sm font-semibold text-muted md:px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex h-12 shrink-0 items-center whitespace-nowrap border-b-[3px] ${tab === t.key ? 'border-brand text-brand-dark' : 'border-transparent hover:text-ink'}`}
            >
              {t.label}
              <span className={`ml-1.5 rounded-md px-1.5 py-px text-xs ${t.danger ? 'bg-danger-soft text-danger' : 'bg-canvas'}`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {picked.length > 0 && (
          <div className="flex items-center gap-3 border-b border-[#BFDDD2] bg-brand-soft px-4 py-2.5 md:px-6 @max-2xl:hidden" role="toolbar" aria-label="Bulk actions">
            <span className="whitespace-nowrap text-sm font-semibold text-brand-dark">{picked.length} selected</span>
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
            <span className="min-w-0 flex-1 truncate text-[13px] text-brand-dark">
              {picked.length > toRemind.length && (toRemind.length === 0 ? 'Nothing to remind: these wait for your review' : `${picked.length - toRemind.length} skipped, waiting for your review`)}
            </span>
            <button type="button" onClick={() => setSelected(new Set())} className="flex h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold text-slate-600 hover:bg-white">
              <X size={14} />
              Clear
            </button>
          </div>
        )}
        <div className={`${ROW} @max-2xl:hidden border-b border-t border-line bg-slate-50/80 py-2 text-[11px] font-bold uppercase tracking-wider text-faint`}>
          <button
            type="button"
            role="checkbox"
            aria-checked={allShown}
            aria-label="Select all rows"
            onClick={toggleAll}
            className="-m-3 flex items-center justify-center p-3"
          >
            <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] ${allShown ? 'bg-brand text-white' : 'border-[1.5px] border-slate-300 bg-white'}`}>{allShown && <Check size={12} strokeWidth={3.4} />}</span>
          </button>
          <span>Client</span>
          <span>Received</span>
          <span>Needs</span>
          <span />
        </div>

        </div>

        <div className="flex-1">
          {visible.length === 0 && <p className="p-8 text-sm text-muted">Nothing here right now.</p>}
          {shown.map((i, index) => {
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
              <motion.div
                key={i.id}
                {...rowIn(index)}
                onClick={() => navigate(i.href)}
                className={`${ROW} group h-[68px] cursor-pointer border-b border-line transition-colors last:border-b-0 @max-2xl:h-auto @max-2xl:py-3.5 ${on ? 'bg-brand-soft/60' : 'hover:bg-slate-50'}`}
              >
                {/* the whole height of the row beside the box counts as the checkbox, so nobody opens a request by mistake */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`Select ${i.title}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleOne(i.id)
                  }}
                  className="-mx-3 -my-[25px] flex items-center justify-center px-3 py-[25px] @max-2xl:hidden"
                >
                  <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] ${on ? 'bg-brand text-white' : 'border-[1.5px] border-slate-300 bg-white group-hover:border-slate-400'}`}>{on && <Check size={12} strokeWidth={3.4} />}</span>
                </button>

                <div className="flex min-w-0 items-center gap-3 @max-2xl:order-1 @max-2xl:flex-[1_1_60%]">
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

                <div className="@max-2xl:order-3 @max-2xl:basis-[44%]">
                  {i.total > 0 ? (
                    <>
                      <div className="text-[13px] font-semibold tabular-nums">
                        {i.got} <span className="font-medium text-muted">of {i.total}</span>
                      </div>
                      <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.span className={`block h-full rounded-full ${i.status === 'overdue' ? 'bg-danger' : 'bg-brand'}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }} />
                      </span>
                    </>
                  ) : (
                    <span className="text-[13px] text-faint">–</span>
                  )}
                </div>

                <div className="min-w-0 @max-2xl:order-4 @max-2xl:flex-1 @max-2xl:basis-[45%]">
                  <span className={`inline-block rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${chip.cls}`}>{chip.text}</span>
                  <div className={`mt-1 truncate text-xs ${i.activityTone === 'danger' ? 'font-semibold text-danger' : 'text-muted'}`}>{i.activity}</div>
                </div>

                <div onClick={(e) => e.stopPropagation()} className="flex justify-end @max-2xl:order-2 @max-2xl:shrink-0">
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
              </motion.div>
            )
          })}
        </div>

        <Link to={viewAll} className="flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-b-[18px] border-t border-line bg-slate-50/80 text-[13px] font-semibold text-brand hover:bg-canvas">
          {visible.length > SHOW ? `View all ${visible.length} ${tab === 'all' ? 'items' : 'clients'}` : 'Open Requests'}
          <ChevronRight size={15} />
        </Link>
      </section>
        </div>

        <aside className="flex flex-col gap-4 md:gap-5 lg:col-span-4">
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
              {dueSoon.map(({ r, days }, n) => {
                const p = progress(r)
                const names = r.clients.map((c) => getClient(c.clientId)?.name).filter(Boolean) as string[]
                const late = days < 0
                const d = parseISO(r.due)
                const label = late ? `${-days} ${days === -1 ? 'day' : 'days'} late` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`
                return (
                  <MotionLink key={r.id} {...rowIn(n + 2)} to={`/requests/${r.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50">
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
                          <motion.span className={`block h-full rounded-full ${late ? 'bg-danger' : 'bg-brand'}`} initial={{ width: 0 }} animate={{ width: `${p.total ? (p.received / p.total) * 100 : 0}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.3 }} />
                        </span>
                        <span className="text-[11px] tabular-nums text-muted">
                          {p.received}/{p.total}
                        </span>
                      </div>
                    </div>
                  </MotionLink>
                )
              })}
            </div>
          </section>

        </aside>
      </div>
      {asking && toRemind.length > 0 && <ReminderDialog targets={toRemind.map((i) => ({ requestId: i.requestId!, clientId: i.clientId! }))} text={preview(toRemind[0].requestId!, toRemind[0].clientId!)} onSend={sendReminders} onClose={() => setAsking(false)} />}

      <Toast message={toast} />
    </div>
  )
}
