import { AnimatePresence, motion } from 'framer-motion'
import { FileText, FolderOpen, LayoutDashboard, ListChecks, MessageCircle, MessageSquareText, MoreHorizontal, Settings, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useInbox } from '../data/inbox'
import { spring } from '../lib/motion'
import { resetDemo } from '../lib/session'
import UserMenu from './UserMenu'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
}

// The five places you use all day. Everything else is under "More".
const tabs: Tab[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/requests', label: 'Requests', icon: FileText },
  { to: '/inbox', label: 'Inbox', icon: MessageCircle },
  { to: '/clients', label: 'Clients', icon: Users },
]

const more: Tab[] = [
  { to: '/master', label: 'Document Master', icon: FolderOpen },
  { to: '/compliances', label: 'Compliances', icon: ListChecks },
  { to: '/documents', label: 'Documents list', icon: FileText },
  { to: '/templates', label: 'Message templates', icon: MessageSquareText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

// On a phone the sidebar is replaced by a bar at the bottom, the way a mobile app works.
export default function MobileNav() {
  const { unreadTotal } = useInbox()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const inMore = more.some((m) => pathname.startsWith(m.to))

  // moving to another page closes the sheet
  useEffect(() => setOpen(false), [pathname])

  const tab = 'relative flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 text-[11px] font-semibold'

  return (
    <>
      <nav aria-label="Main" className="mobile-tabbar fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `${tab} h-16 ${isActive ? 'text-brand-dark' : 'text-slate-500'}`}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="tab-line" transition={spring} className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-brand" />}
                <span className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.3 : 1.9} />
                  {to === '/inbox' && unreadTotal > 0 && <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-white" role="img" aria-label="New messages" />}
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className={`${tab} h-16 ${inMore ? 'text-brand-dark' : 'text-slate-500'}`}>
          <MoreHorizontal size={22} strokeWidth={inMore ? 2.3 : 1.9} />
          More
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div key="more" className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="More" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={spring}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 80 && setOpen(false)}
              className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-base font-bold">More</span>
                <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas">
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col">
                {more.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3.5 rounded-xl px-3 py-3.5 text-[15px] font-semibold ${isActive ? 'bg-brand-soft text-brand-dark' : 'text-ink active:bg-canvas'}`}>
                    <Icon size={20} strokeWidth={1.9} />
                    {label}
                  </NavLink>
                ))}
              </div>
              <div className="mt-3 border-t border-line pt-3">
                <UserMenu />
              </div>
              <button type="button" onClick={resetDemo} className="mt-2 w-full rounded-xl px-3 py-3 text-left text-[13px] font-semibold text-muted active:bg-canvas">
                Start the demo again from the sample data
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
