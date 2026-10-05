import {
  FileText,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useInbox } from '../data/inbox'
import { APP_NAME } from '../lib/brand'
import GlobalHeader from './GlobalHeader'
import UserMenu from './UserMenu'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const main: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/requests', label: 'Requests', icon: FileText },
  { to: '/inbox', label: 'Inbox', icon: MessageCircle },
  { to: '/master', label: 'Document Master', icon: FolderOpen },
]

const setup: NavItem[] = [
  { to: '/compliances', label: 'Compliances', icon: ListChecks },
  { to: '/documents', label: 'Documents list', icon: FileText },
  { to: '/templates', label: 'Message templates', icon: MessageSquareText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

// `dots` marks a page that has something new, with a small dot. It never shows a number, so the menu stays calm.
function NavGroup({ items, dots = {}, collapsed }: { items: NavItem[]; dots?: Record<string, number>; collapsed: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map(({ to, label, icon: Icon }) => {
        const news = dots[to]
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            aria-label={label}
            className={({ isActive }) =>
              `relative flex items-center rounded-[10px] text-sm font-semibold ${collapsed ? 'h-11 justify-center' : 'gap-3 px-3 py-2.5'} ${
                isActive ? 'bg-brand-soft text-brand-dark' : 'text-slate-600 hover:bg-canvas'
              }`
            }
          >
            <Icon size={19} strokeWidth={1.9} />
            {!collapsed && <span className="flex-1">{label}</span>}
            {news ? (
              <span
                className={collapsed ? 'absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand ring-2 ring-white' : 'h-2 w-2 rounded-full bg-brand'}
                role="img"
                aria-label={`${news} new`}
                title={`${news} new`}
              />
            ) : null}
          </NavLink>
        )
      })}
    </div>
  )
}

const KEY = 'sidebar-collapsed'
const readSaved = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export default function Layout() {
  const { unreadTotal } = useInbox()
  // The sidebar can shrink to icons only, and remembers the choice.
  const [collapsed, setCollapsed] = useState(readSaved)
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(KEY, c ? '0' : '1')
      } catch {
        /* the choice just will not be remembered */
      }
      return !c
    })

  return (
    <div className="flex h-full">
      <aside className={`flex shrink-0 flex-col gap-6 border-r border-line bg-white py-5 transition-[width] duration-200 ${collapsed ? 'w-[76px] px-3' : 'w-64 px-4'}`}>
        <div className={collapsed ? 'flex flex-col items-center gap-3' : 'flex items-center gap-2.5 px-2.5'}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-brand text-white">
            <FolderOpen size={19} strokeWidth={2.1} />
          </span>
          {!collapsed && <span className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight">{APP_NAME}</span>}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <NavGroup items={main} dots={{ '/inbox': unreadTotal }} collapsed={collapsed} />
        <div>
          {collapsed ? <div className="mx-2 mb-3 border-t border-line" /> : <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-widest text-faint">Setup</div>}
          <NavGroup items={setup} collapsed={collapsed} />
        </div>
        <UserMenu collapsed={collapsed} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <GlobalHeader />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
