import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'
import { useSetup } from '../data/setup'

const SETUP = '/settings?tab=whatsapp'

// What the firm sees until its own WhatsApp can send: one line under the header, and a dialog when it tries to send anyway.
// Everything else (clients, documents, checklists) works as usual.
export function ConnectBanner() {
  const { sendState } = useSetup()
  const { pathname, search } = useLocation()
  if (sendState === 'ready' || pathname === '/ramwin' || (pathname === '/settings' && search.includes('tab=whatsapp'))) return null
  const bad = sendState === 'off' || sendState === 'lost'
  const text =
    sendState === 'off'
      ? 'Connect your WhatsApp to start sending requests and reminders.'
      : sendState === 'lost'
        ? 'Your WhatsApp got disconnected. Connect it again to send requests and reminders.'
        : 'Your WhatsApp is connected. Waiting for WhatsApp to approve your messages, then you can send.'
  return (
    <div role="status" className={`flex items-center gap-3 border-b px-4 py-2 text-[13px] ${bad ? 'border-[#F3D9A4] bg-[#FFF7E6] text-[#7A4B00]' : 'border-line bg-[#F1F5F9] text-slate-700'}`}>
      <MessageCircle size={16} className="shrink-0" />
      <span className="min-w-0 flex-1">{text}</span>
      <Link to={SETUP} className="shrink-0 rounded-lg bg-white px-3 py-1 text-[13px] font-semibold text-ink ring-1 ring-line hover:ring-brand">
        {sendState === 'off' ? 'Connect WhatsApp' : sendState === 'lost' ? 'Connect again' : 'See status'}
      </Link>
    </div>
  )
}

export function ConnectDialog() {
  const { sendState, connectAsk, askTemplate, closeConnectAsk, messageTemplates } = useSetup()
  const go = useNavigate()
  if (!connectAsk) return null
  // One message that cannot go, while the connection itself is fine.
  const tpl = sendState === 'ready' && askTemplate ? messageTemplates.find((m) => m.id === askTemplate) : undefined
  const title = tpl ? 'This message is waiting for approval' : sendState === 'off' ? 'Connect your WhatsApp first' : sendState === 'lost' ? 'Your WhatsApp is disconnected' : 'Waiting for WhatsApp approval'
  const body = tpl
    ? `"${tpl.name}" is still waiting for WhatsApp to approve it. You can send it as soon as it is approved.`
    : sendState === 'off'
      ? 'Messages go from your own WhatsApp number. Connect it once, and then you can send requests and reminders.'
      : sendState === 'lost'
        ? 'WhatsApp logged your number out, so nothing can be sent. Connect it again and everything works as before.'
        : 'Your number is connected, but WhatsApp has not approved your messages yet. You can send as soon as they are approved.'
  const action = sendState === 'off' ? 'Connect WhatsApp' : sendState === 'lost' ? 'Connect again' : 'See status'
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={closeConnectAsk}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={closeConnectAsk} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-canvas">
            <X size={18} />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={closeConnectAsk} className="h-10 rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand">
            Not now
          </button>
          <button
            type="button"
            onClick={() => {
              closeConnectAsk()
              go(SETUP)
            }}
            className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            {action}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
