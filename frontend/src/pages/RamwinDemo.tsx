import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneInput from '../components/PhoneInput'
import WhatsAppIcon from '../components/WhatsAppIcon'
import { useSetup } from '../data/setup'
import { APP_NAME } from '../lib/brand'
import { formatMobile, isMobile } from '../lib/phone'

// A stand-in for the page where Ramwin links a WhatsApp number. In the real flow the user is sent to Ramwin's own page (RAMWIN_CONNECT_URL), links the number
// there, and comes back; the channel ID and API key reach us on the server, so the user never types or sees them. This screen runs the same steps for the demo.
export default function RamwinDemo() {
  const { firm, connectWhatsApp } = useSetup()
  const navigate = useNavigate()
  const [digits, setDigits] = useState('')
  const [name, setName] = useState(firm.name)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    document.title = 'Connect WhatsApp · Ramwin (demo)'
  }, [])

  const ok = isMobile(digits) && name.trim().length > 1 && agree
  const connect = () => {
    setBusy(true)
    // Ramwin links the number, then sends the user back. We get the channel ID on the server; here it is made up.
    window.setTimeout(() => {
      connectWhatsApp({
        number: formatMobile(digits),
        displayName: name.trim(),
        provider: 'Ramwin',
        route: 'ramwin',
        channelId: `ch_${Math.random().toString(36).slice(2, 10)}`,
        connectedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      })
      navigate('/settings?tab=whatsapp&connected=1', { replace: true })
    }, 1400)
  }

  return (
    <div className="min-h-full bg-[#F4F6F8]">
      <div className="bg-ink px-4 py-2.5 text-center text-[13px] font-medium text-white">Demo screen. In the real flow this is Ramwin&apos;s own page, and you come back here when you are done.</div>
      <div className="mx-auto max-w-md px-5 py-10">
        <div className="flex items-center gap-3">
          <WhatsAppIcon size={40} />
          <div>
            <div className="text-[17px] font-bold">Ramwin</div>
            <div className="text-[13px] text-muted">Connect WhatsApp for {APP_NAME}</div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h1 className="text-[20px] font-bold tracking-tight">Link your WhatsApp number</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">Use the number your clients already know. It should be a number you use for work, not your personal one.</p>

          <div className="mt-5 flex flex-col gap-4">
            <PhoneInput label="WhatsApp number" value={digits} onChange={setDigits} autoFocus />
            <label className="block text-[13px] font-semibold text-muted">
              Business name clients see
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] font-medium text-ink outline-none focus:border-brand" />
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-slate-600">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#0F7B6C]" />
              <span>I agree to WhatsApp&apos;s Business terms and Ramwin&apos;s terms.</span>
            </label>
          </div>

          <button type="button" disabled={!ok || busy} onClick={connect} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-semibold text-white disabled:opacity-40">
            {busy ? (
              'Connecting…'
            ) : (
              <>
                <Check size={18} strokeWidth={2.8} /> Connect and go back
              </>
            )}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-muted">
            <ShieldCheck size={14} /> We never ask for a password or an API key.
          </p>
        </div>

        <button type="button" onClick={() => navigate('/settings?tab=whatsapp', { replace: true })} className="mx-auto mt-5 flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
          <ArrowLeft size={15} /> Cancel and go back to {APP_NAME}
        </button>
      </div>
    </div>
  )
}
