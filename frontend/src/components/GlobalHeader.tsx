import { AlertTriangle, Bell, BellOff, File, FileText, FolderOpen, LayoutDashboard, MessageCircle, Search, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications } from '../data/notifications'
import type { Notice } from '../data/notifications'
import { useMasterFiles } from '../data/masterFiles'
import { clients, getClient } from '../data/mock'
import { useRequests } from '../data/requests'

interface Result {
  id: string
  group: string
  title: string
  sub: string
  to: string
  icon: ReactNode
}

const pages = [
  { title: 'Dashboard', to: '/' },
  { title: 'Clients', to: '/clients' },
  { title: 'Requests', to: '/requests' },
  { title: 'New request', to: '/requests/new' },
  { title: 'Inbox', to: '/inbox' },
  { title: 'Document Master', to: '/master' },
  { title: 'Compliances', to: '/compliances' },
  { title: 'Documents list', to: '/documents' },
  { title: 'Message templates', to: '/templates' },
  { title: 'Settings', to: '/settings' },
]

const MAX_PER_GROUP = 4
const iconBox = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-canvas text-slate-600'

// One search for the whole app: clients, requests, the documents inside them, approved files, and pages.
function GlobalSearch() {
  const { requests } = useRequests()
  const masterFiles = useMasterFiles()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const query = q.trim().toLowerCase()

  // "/" or Ctrl/Cmd+K jumps to the search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        input.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo<Result[]>(() => {
    if (!query) return []
    const has = (...parts: (string | undefined)[]) => parts.join(' ').toLowerCase().includes(query)
    const out: Result[] = []

    clients
      .filter((c) => has(c.name, c.pan, c.gstin, c.phone, c.email, c.service))
      .slice(0, MAX_PER_GROUP)
      .forEach((c) =>
        out.push({ id: `c-${c.id}`, group: 'Clients', title: c.name, sub: `${c.service} · ${c.phone} · PAN ${c.pan}`, to: `/clients/${c.id}`, icon: <Users size={17} /> }),
      )

    requests
      .filter((r) => has(r.title, r.ref, ...r.clients.map((c) => getClient(c.clientId)?.name)))
      .slice(0, MAX_PER_GROUP)
      .forEach((r) =>
        out.push({
          id: `r-${r.id}`,
          group: 'Requests',
          title: `${r.title} · ${r.ref}`,
          sub: r.clients.map((c) => getClient(c.clientId)?.name).join(', '),
          to: `/requests/${r.id}`,
          icon: <FileText size={17} />,
        }),
      )

    const docs = requests.flatMap((r) =>
      r.clients.flatMap((rc) =>
        rc.docs
          .filter((d) => d.status !== 'pending' && has(d.name, d.fileName))
          .map((d) => ({ r, rc, d })),
      ),
    )
    docs.slice(0, MAX_PER_GROUP).forEach(({ r, rc, d }) =>
      out.push({
        id: `d-${r.id}-${rc.clientId}-${d.id}`,
        group: 'Documents',
        title: d.name,
        sub: `${getClient(rc.clientId)?.name} · ${r.title}`,
        to: `/requests/${r.id}?doc=${rc.clientId}:${d.id}`,
        icon: <File size={17} />,
      }),
    )

    masterFiles
      .filter((f) => has(f.name, f.fileName))
      .slice(0, MAX_PER_GROUP)
      .forEach((f) => {
        const m = f.folderId?.match(/^c:([^/]+)\/([^/]+)\//)
        const clientId = m?.[1]
        const year = m?.[2]
        out.push({
          id: `f-${f.id}`,
          group: 'Approved files',
          title: f.name,
          sub: [clientId ? getClient(clientId)?.name : 'Document Master', year].filter(Boolean).join(' · '),
          to: clientId ? `/clients/${clientId}?tab=documents` : '/master',
          icon: <FolderOpen size={17} />,
        })
      })

    pages
      .filter((p) => has(p.title))
      .slice(0, MAX_PER_GROUP)
      .forEach((p) => out.push({ id: `p-${p.to}`, group: 'Go to', title: p.title, sub: 'Page', to: p.to, icon: <LayoutDashboard size={17} /> }))

    return out
  }, [query, requests, masterFiles])

  const go = (r: Result) => {
    navigate(r.to)
    setOpen(false)
    setQ('')
    input.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      input.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      go(results[active])
    }
  }

  const groups = [...new Set(results.map((r) => r.group))]

  return (
    <div className="relative w-[520px] max-w-full">
      {open && <button type="button" aria-label="Close search" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />}
      <label className="relative z-20 flex h-10 items-center gap-2.5 rounded-xl border border-line bg-canvas px-3.5 text-sm text-muted focus-within:border-brand focus-within:bg-white">
        <Search size={17} className="shrink-0" />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls="global-search-results"
          aria-label="Search"
          placeholder="Search clients, requests, documents"
          className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
        />
        <kbd className="hidden shrink-0 rounded-md border border-line bg-canvas px-1.5 py-0.5 text-xs font-semibold text-muted md:block">/</kbd>
      </label>

      {open && (
        <div id="global-search-results" role="listbox" className="absolute left-0 right-0 top-11 z-20 max-h-[460px] overflow-y-auto rounded-2xl border border-line bg-white py-2 shadow-[0_16px_40px_rgba(14,27,44,0.16)]">
          {!query && <p className="px-4 py-3 text-sm text-muted">Type a client name, PAN, number, request or document.</p>}
          {query && results.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">Nothing found for “{q.trim()}”.</p>}
          {groups.map((g) => (
            <div key={g}>
              <div className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-faint">{g}</div>
              {results.map((r, i) =>
                r.group !== g ? null : (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left ${i === active ? 'bg-brand-soft' : ''}`}
                  >
                    <span className={iconBox}>{r.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{r.title}</span>
                      <span className="block truncate text-xs text-muted">{r.sub}</span>
                    </span>
                  </button>
                ),
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const noticeLook: Record<Notice['kind'], { icon: ReactNode; tone: string }> = {
  overdue: { icon: <AlertTriangle size={18} />, tone: 'bg-danger-soft text-danger' },
  unmatched: { icon: <MessageCircle size={18} />, tone: 'bg-warn-soft text-warn' },
  documents: { icon: <FileText size={18} />, tone: 'bg-brand-soft text-brand-dark' },
}

// The bell. It only lists what needs a look right now, and its number counts what is new since it was last opened.
function Notifications() {
  const items = useNotifications()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(new Set())
  // What was new at the moment the bell was opened, so those rows stay marked while the list is on screen.
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const unread = items.filter((i) => !seen.has(i.id)).length

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const toggle = () => {
    if (!open) {
      setFresh(new Set(items.filter((i) => !seen.has(i.id)).map((i) => i.id)))
      setSeen(new Set(items.map((i) => i.id)))
    }
    setOpen((v) => !v)
  }

  return (
    <div className="relative">
      {open && <button type="button" aria-label="Close notifications" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />}
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={toggle}
        className={`relative z-20 flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-canvas ${open ? 'bg-canvas' : ''}`}
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div role="region" aria-label="Notifications" className="absolute right-0 top-12 z-20 w-[380px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_44px_rgba(14,27,44,0.18)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[15px] font-bold tracking-tight">Notifications</span>
            {fresh.size > 0 && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-dark">{fresh.size} new</span>}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-faint">
                <BellOff size={22} />
              </span>
              <p className="text-sm font-semibold">You are all caught up</p>
              <p className="text-xs text-muted">Late requests and new documents will show up here.</p>
            </div>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto py-1">
              {items.map((n) => (
                <li key={n.id}>
                  <Link to={n.href} onClick={() => setOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-canvas">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${noticeLook[n.kind].tone}`}>{noticeLook[n.kind].icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                      <span className="mt-0.5 block text-[13px] text-muted">{n.sub}</span>
                    </span>
                    {fresh.has(n.id) && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="New" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link to="/" onClick={() => setOpen(false)} className="flex items-center justify-center border-t border-line bg-slate-50/80 py-3 text-[13px] font-semibold text-brand hover:bg-canvas">
            Open Dashboard
          </Link>
        </div>
      )}
    </div>
  )
}

// The bar across the top of every page.
export default function GlobalHeader() {
  return (
    <header className="app-header flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line bg-white px-3 md:gap-4 md:px-8">
      <GlobalSearch />
      <div className="flex shrink-0 items-center gap-3">
        <Notifications />
      </div>
    </header>
  )
}
