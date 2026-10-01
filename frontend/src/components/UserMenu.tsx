import { ChevronUp, CreditCard, LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetup } from '../data/setup'
import { KDK_PROFILE_URL, KDK_SUBSCRIPTION_URL } from '../lib/brand'
import Avatar from './Avatar'

// The signed-in user at the bottom of the sidebar. Clicking opens the account menu, like the rest of the KDK suite.
export default function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { team, firm } = useSetup()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const me = team[0]

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }
  const item = 'flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-canvas'

  return (
    <div className="relative mt-auto">
      {open && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className={`absolute z-20 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_32px_rgba(14,27,44,0.14)] ${
              collapsed ? 'bottom-0 left-full ml-3 w-64' : 'bottom-full left-0 right-0 mb-2'
            }`}
          >
            <div className="border-b border-line px-4 py-3.5">
              <div className="text-[15px] font-bold">{me.name}</div>
              <div className="text-[13px] text-muted">{firm.name}</div>
              <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{me.role}</div>
            </div>
            <a role="menuitem" href={KDK_PROFILE_URL} className={item}>
              <User size={17} className="text-muted" />
              Profile
            </a>
            <a role="menuitem" href={KDK_SUBSCRIPTION_URL} className={item}>
              <CreditCard size={17} className="text-muted" />
              Subscription
            </a>
            <div className="border-t border-line" />
            <button type="button" role="menuitem" className={`${item} text-danger hover:bg-danger-soft`} onClick={() => go('/signed-out')}>
              <LogOut size={17} />
              Sign Out
            </button>
          </div>
        </>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? `${me.name} · ${firm.name}` : undefined}
        className={`flex w-full items-center rounded-2xl text-left ${collapsed ? 'justify-center p-2' : 'gap-3 p-3'} ${open ? 'bg-slate-200/70' : 'bg-canvas hover:bg-slate-100'}`}
      >
        <Avatar name={me.name} size={38} />
        <span className={`min-w-0 flex-1 leading-tight ${collapsed ? 'hidden' : ''}`}>
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{me.name}</span>
            <span className="shrink-0 rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-dark">{me.role}</span>
          </span>
          <span className="block truncate text-xs text-muted">{firm.name}</span>
        </span>
        {!collapsed && <ChevronUp size={17} className={`shrink-0 text-muted transition-transform ${open ? '' : 'rotate-180'}`} />}
      </button>
    </div>
  )
}
