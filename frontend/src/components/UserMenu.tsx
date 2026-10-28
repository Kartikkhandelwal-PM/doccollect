import { motion } from 'framer-motion'
import { ChevronUp, CreditCard, Database, LogOut, Trash2, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetup } from '../data/setup'
import { KDK_PROFILE_URL, KDK_SUBSCRIPTION_URL } from '../lib/brand'
import { emptyOn, setSampleData } from '../lib/demo'
import { backdropProps, panelProps } from '../lib/motion'
import Avatar from './Avatar'

// The signed-in user at the bottom of the sidebar. Clicking opens the account menu, like the rest of the KDK suite.
export default function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { team, firm } = useSetup()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const empty = emptyOn()
  const me = team[0]

  useEffect(() => {
    if (!open && !confirming) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (setOpen(false), setConfirming(false))
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, confirming])

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
              <div className="mt-0.5 text-[12px] font-semibold uppercase tracking-wider text-faint">{me.role}</div>
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
            {/* Only the one that makes sense now: with data, delete it; with nothing, add the sample data. */}
            {empty ? (
              <button type="button" role="menuitem" className={item} onClick={() => setSampleData(true)}>
                <Database size={17} className="text-muted" />
                Add sample data
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                className={item}
                onClick={() => {
                  setOpen(false)
                  setConfirming(true)
                }}
              >
                <Trash2 size={17} className="text-muted" />
                Delete all data
              </button>
            )}
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
        className={`flex w-full items-center rounded-2xl text-left ${collapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-3'} ${open ? 'bg-slate-200/70' : 'bg-canvas hover:bg-slate-100'}`}
      >
        <Avatar name={me.name} size={34} />
        <span className={`min-w-0 flex-1 leading-tight ${collapsed ? 'hidden' : ''}`}>
          <span className="block truncate text-sm font-semibold">{me.name}</span>
          <span className="block truncate text-xs text-muted" title={`${me.role} · ${firm.name}`}>
            {me.role} · {firm.name}
          </span>
        </span>
        {!collapsed && <ChevronUp size={17} className={`shrink-0 text-muted transition-transform ${open ? '' : 'rotate-180'}`} />}
      </button>
      {confirming && (
        <motion.div {...backdropProps} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Delete all data" onClick={() => setConfirming(false)}>
          <motion.div {...panelProps} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-2xl">
            <h2 className="text-lg font-bold">Delete all data?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              This removes the clients, requests, chats, files and folders, and disconnects WhatsApp, so you can see the app as a new firm. Your checklists, documents, message templates and settings stay. You can bring the sample data back any time from this menu.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" autoFocus onClick={() => setConfirming(false)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold hover:bg-canvas">
                Cancel
              </button>
              <button type="button" onClick={() => setSampleData(false)} className="h-11 rounded-xl bg-danger px-5 text-sm font-semibold text-white">
                Delete all data
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
