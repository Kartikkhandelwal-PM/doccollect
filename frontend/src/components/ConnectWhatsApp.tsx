import { backdropProps, panelProps } from '../lib/motion'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Check, Copy, Eye, EyeOff, Loader2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import PhoneInput from './PhoneInput'
import WhatsAppIcon from './WhatsAppIcon'
import { useSetup } from '../data/setup'
import type { WhatsAppLink } from '../data/setup'
import { APP_NAME, LINK_DOMAIN } from '../lib/brand'
import { formatMobile, isMobile } from '../lib/phone'

type Have = 'business-app' | 'normal' | 'none' | 'provider'
type Step = 'have' | 'switch' | 'number' | 'otp' | 'channel' | 'test' | 'provider' | 'webhook'

const providers = ['Gupshup', 'Interakt', 'WATI', 'AiSensy', 'Twilio', '360dialog', 'Meta Cloud API (direct)', 'Another provider']

const rand = (n: number) => Array.from({ length: n }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('')
const clock = () => `Today, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`
const digits = (s: string) => s.replace(/\D/g, '')

const input = 'mt-1 block h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] font-medium text-ink outline-none focus:border-brand'

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-[13px] font-semibold text-muted">
      {label}
      {children}
      {hint && <span className="mt-1 block text-xs font-normal leading-snug text-muted">{hint}</span>}
    </label>
  )
}

function Note({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  const cls = tone === 'warn' ? 'border-[#F5DFA8] bg-[#FEF6E4] text-[#7A3B00]' : 'border-[#D3E9E4] bg-[#EEF8F5] text-slate-700'
  return <div className={`rounded-xl border p-3.5 text-[13px] leading-relaxed ${cls}`}>{children}</div>
}

function CopyBox({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false)
  return (
    <div>
      <div className="text-[13px] font-semibold text-muted">{label}</div>
      <div className="mt-1 flex items-center gap-2 rounded-xl border border-line bg-canvas py-1.5 pl-3.5 pr-1.5">
        <code className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{value}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(value).catch(() => undefined)
            setDone(true)
            setTimeout(() => setDone(false), 1500)
          }}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold shadow-sm hover:bg-slate-50"
        >
          {done ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
          {done ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function Choice({ title, desc, selected, onClick, badge, children }: { title: string; desc: string; selected?: boolean; onClick?: () => void; badge?: string; children?: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={!!selected}
      onClick={onClick}
      className={`w-full rounded-2xl p-4 text-left transition ${selected ? 'border-2 border-brand bg-[#EEF8F5]' : 'border border-line hover:bg-canvas'}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[15px] font-semibold">{title}</span>
        {badge && <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-dark">{badge}</span>}
        {selected && <Check size={18} className="ml-auto text-brand" />}
      </div>
      <p className="mt-0.5 text-[13px] leading-snug text-muted">{desc}</p>
      {children}
    </button>
  )
}

// Connects the firm's own WhatsApp. Two ways in: through Ramwin (we set everything up), or with a provider the firm already has.
// This is the front end of the flow. The real calls to Meta and the providers come with the backend.
export default function ConnectWhatsApp({ onClose, onConnected }: { onClose: () => void; onConnected: (link: WhatsAppLink) => void }) {
  const { firm } = useSetup()
  const [have, setHave] = useState<Have>('business-app')
  const [step, setStep] = useState<Step>('have')

  // Through Ramwin
  const [number, setNumber] = useState('')
  const [displayName, setDisplayName] = useState(firm.name)
  const [workOnly, setWorkOnly] = useState(false)
  const [terms, setTerms] = useState(false)
  const [code, setCode] = useState('')
  const [codeNote, setCodeNote] = useState('')
  const [progress, setProgress] = useState(0)
  const [channelId, setChannelId] = useState('')

  // With a provider the firm already has
  const [provider, setProvider] = useState(providers[0])
  const [otherName, setOtherName] = useState('')
  const [senderId, setSenderId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [language, setLanguage] = useState('en')
  const webhookUrl = useMemo(() => `https://api.${LINK_DOMAIN}/webhooks/whatsapp/${rand(8)}`, [])
  const verifyToken = useMemo(() => `dc_verify_${rand(12)}`, [])
  const [webhook, setWebhook] = useState<'idle' | 'checking' | 'ok'>('idle')

  // The test message
  const [testTo, setTestTo] = useState('')
  const [sent, setSent] = useState<'idle' | 'sending' | 'delivered'>('idle')
  const [sentAt, setSentAt] = useState('')
  const [notArrived, setNotArrived] = useState(false)

  const viaProvider = have === 'provider'
  const providerLabel = provider === 'Another provider' ? otherName.trim() || 'Your provider' : provider
  const first = (firm.name || 'there').split(' ')[0]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // The channel is created in a few steps. Each one shows when it is done.
  useEffect(() => {
    if (step !== 'channel') return
    setProgress(0)
    setChannelId(`ch_${rand(8)}`)
    const t = setInterval(() => setProgress((p) => (p >= 5 ? p : p + 1)), 650)
    return () => clearInterval(t)
  }, [step])

  const stages = viaProvider
    ? [
        ['Details', ['provider']],
        ['Webhook', ['webhook']],
        ['Test', ['test']],
      ]
    : [
        ['Your number', ['have', 'switch', 'number']],
        ['Verify', ['otp']],
        ['Channel', ['channel']],
        ['Test', ['test']],
      ]
  const at = Math.max(0, stages.findIndex(([, ids]) => (ids as string[]).includes(step)))

  const sendTest = () => {
    setSent('sending')
    setNotArrived(false)
    setTimeout(() => {
      setSent('delivered')
      setSentAt(clock())
    }, 1300)
  }

  const finish = () => {
    onConnected({
      number: formatMobile(number),
      displayName: viaProvider ? firm.name : displayName.trim(),
      provider: viaProvider ? providerLabel : 'Ramwin',
      route: viaProvider ? 'provider' : 'ramwin',
      channelId: viaProvider ? senderId.trim() : channelId,
    })
  }

  const numberOk = isMobile(number)
  const providerOk = numberOk && senderId.trim().length >= 4 && apiKey.trim().length >= 8 && /^[a-z0-9_]+$/.test(templateName.trim()) && (provider !== 'Another provider' || otherName.trim().length >= 2)
  const testOk = isMobile(testTo) && testTo !== number
  const templateText = `Hello ${first}, this is a test message from ${viaProvider ? firm.name : displayName.trim() || firm.name}. Your WhatsApp is now connected to ${APP_NAME}. You do not need to reply.`

  const back: Partial<Record<Step, Step>> = {
    switch: 'have',
    number: 'have',
    otp: 'number',
    provider: 'have',
    webhook: 'provider',
    test: viaProvider ? 'webhook' : 'channel',
  }

  const title: Record<Step, string> = {
    have: 'Connect your WhatsApp',
    switch: 'One change is needed first',
    number: 'Your WhatsApp number',
    otp: 'Verify your number',
    channel: 'Setting up your channel',
    test: 'Send a test message',
    provider: 'Your WhatsApp provider',
    webhook: 'Tell your provider where to send replies',
  }

  return (
    <motion.div {...backdropProps} className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-6" role="dialog" aria-modal="true" aria-label="Connect your WhatsApp">
      <motion.div {...panelProps} className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-line px-6 pb-4 pt-5">
          <div className="flex items-start gap-3">
            <WhatsAppIcon size={40} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">{title[step]}</h2>
              <p className="text-[13px] text-muted">Your own WhatsApp number</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-canvas">
              <X size={18} />
            </button>
          </div>
          <ol className="mt-4 flex items-center gap-2" aria-label="Steps">
            {stages.map(([label], i) => (
              <li key={label as string} className="flex flex-1 items-center gap-2" aria-current={i === at ? 'step' : undefined}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i < at ? 'bg-brand text-white' : i === at ? 'bg-brand-soft text-brand-dark ring-2 ring-brand' : 'bg-canvas text-faint'}`}>
                  {i < at ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
                <span className={`truncate text-[13px] font-semibold ${i === at ? 'text-ink' : 'text-muted'}`}>{label as string}</span>
                {i < stages.length - 1 && <span className={`h-px flex-1 ${i < at ? 'bg-brand' : 'bg-line'}`} />}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          {step === 'have' && (
            <>
              <p className="text-sm text-slate-600">Which WhatsApp is on the number you want to use? Pick the closest one. We will tell you what to do next.</p>
              <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Which WhatsApp is on your number">
                <Choice title="WhatsApp Business app" desc="The green WhatsApp Business app on a phone, with a business profile." selected={have === 'business-app'} onClick={() => setHave('business-app')} />
                <Choice title="Normal WhatsApp" desc="The usual WhatsApp. It needs one small change first." selected={have === 'normal'} onClick={() => setHave('normal')} />
                <Choice title="No WhatsApp on it yet" desc="A new number, or a SIM that was never used on WhatsApp." selected={have === 'none'} onClick={() => setHave('none')} badge="Easiest" />
                <Choice title="I already have a WhatsApp API account" desc="With a provider such as Gupshup, Interakt, WATI or AiSensy. You will need your keys." selected={have === 'provider'} onClick={() => setHave('provider')} />
              </div>
              <Note tone="warn">
                <b>Use a number only for work.</b> Do not connect your personal number. Everything sent to it reaches {APP_NAME}.
              </Note>
            </>
          )}

          {step === 'switch' && (
            <>
              <p className="text-sm leading-relaxed text-slate-600">WhatsApp does not let a number on normal WhatsApp be connected to business tools as it is. Choose one way:</p>
              <Choice title="Use a new number for DocCollect" badge="Recommended" desc="Your personal chats stay exactly as they are. This is the safest choice." onClick={() => {
                setHave('none')
                setStep('number')
              }} />
              <div className="rounded-2xl border border-line p-4">
                <div className="text-[15px] font-semibold">Switch this number to the WhatsApp Business app first</div>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] leading-snug text-muted">
                  <li>Install the WhatsApp Business app on your phone.</li>
                  <li>Open it and verify the same number. Your chats move across.</li>
                  <li>Come back here and choose “WhatsApp Business app”.</li>
                </ol>
                <button
                  type="button"
                  onClick={() => {
                    setHave('business-app')
                    setStep('number')
                  }}
                  className="mt-3 h-10 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-canvas"
                >
                  I have switched
                </button>
              </div>
              <Note tone="warn">
                <b>Not recommended: deleting WhatsApp on this number.</b> You would lose every chat on it.
              </Note>
            </>
          )}

          {step === 'number' && (
            <>
              {have === 'business-app' ? (
                <Note>
                  <b>Before you start</b>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    <li>The WhatsApp Business app is up to date (version 2.24.17 or newer).</li>
                    <li>The number has been used on it for at least 7 days.</li>
                    <li>You can log in as an admin of your Meta (Facebook) business account.</li>
                  </ul>
                  <p className="mt-2">If WhatsApp allows it for your number, the Business app keeps working next to {APP_NAME}. If it does not, the number moves fully to {APP_NAME} and the app stops working on it. Ramwin tells you before anything changes.</p>
                </Note>
              ) : (
                <Note>
                  <b>Before you start</b>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    <li>The number can receive an SMS or a call for a code.</li>
                    <li>It is not on any WhatsApp today.</li>
                  </ul>
                </Note>
              )}
              <PhoneInput label="WhatsApp number" value={number} onChange={setNumber} autoFocus />
              <Field label="Name clients see on WhatsApp" hint="It must match your business name or website. WhatsApp reviews it, usually within a day.">
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={input} />
              </Field>
              <label className="flex items-start gap-2.5 text-[13px] leading-snug text-slate-700">
                <input type="checkbox" checked={workOnly} onChange={(e) => setWorkOnly(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0B7A6B]" />
                This is a number I use only for work. It is not my personal WhatsApp.
              </label>
              <label className="flex items-start gap-2.5 text-[13px] leading-snug text-slate-700">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0B7A6B]" />
                I agree to WhatsApp’s Business terms and Ramwin’s terms.
              </label>
            </>
          )}

          {step === 'otp' && (
            <>
              <p className="text-sm leading-relaxed text-slate-600">
                {have === 'business-app' ? (
                  <>Open the WhatsApp Business app on <b>{formatMobile(number)}</b>. WhatsApp shows a 6-digit code. Type it here.</>
                ) : (
                  <>Ramwin sent a 6-digit code to <b>{formatMobile(number)}</b> by SMS. Type it here.</>
                )}
              </p>
              <Field label="6-digit code">
                <input value={code} onChange={(e) => setCode(digits(e.target.value).slice(0, 6))} inputMode="numeric" autoFocus placeholder="000000" className={`${input} max-w-[200px] text-center text-xl font-bold tracking-[0.4em]`} />
              </Field>
              <div className="flex flex-wrap items-center gap-4 text-[13px]">
                <button type="button" onClick={() => setCodeNote('A new code was sent by SMS.')} className="font-semibold text-brand hover:underline">
                  Send the code again
                </button>
                <button type="button" onClick={() => setCodeNote('You will get a call with the code in a minute.')} className="font-semibold text-brand hover:underline">
                  Call me instead
                </button>
                {codeNote && <span className="text-muted">{codeNote}</span>}
              </div>
              <p className="text-xs text-muted">Demo: any 6 digits work.</p>
            </>
          )}

          {step === 'channel' && (
            <>
              <ul className="flex flex-col gap-2.5">
                {[
                  'Connecting your Facebook business account',
                  'Creating your WhatsApp Business account',
                  `Adding ${formatMobile(number)}`,
                  `Sending the name “${displayName.trim()}” for review`,
                  'Creating your channel',
                ].map((label, i) => (
                  <li key={label} className="flex items-center gap-3 text-sm">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${i < progress ? 'bg-brand text-white' : i === progress ? 'bg-brand-soft text-brand' : 'bg-canvas text-faint'}`}>
                      {i < progress ? <Check size={14} strokeWidth={3} /> : i === progress ? <Loader2 size={14} className="animate-spin" /> : null}
                    </span>
                    <span className={i <= progress ? 'font-medium' : 'text-muted'}>{label}</span>
                  </li>
                ))}
              </ul>
              {progress >= 5 && (
                <div className="mt-1 flex flex-col gap-3 rounded-2xl border border-[#BFDDD2] bg-[#EEF8F5] p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-brand-dark">
                    <Check size={18} strokeWidth={3} /> Your channel is ready
                  </div>
                  <CopyBox label="Channel ID" value={channelId} />
                  <p className="text-[13px] leading-snug text-slate-600">
                    The name “{displayName.trim()}” is in review with WhatsApp. You can send messages while it is reviewed. New accounts can message up to <b>250 new clients a day</b> until your business is verified with Meta.
                  </p>
                </div>
              )}
            </>
          )}

          {step === 'provider' && (
            <>
              <Note>
                <b>What you need from your provider:</b> the channel or sender ID, an API key or access token, and the name of one approved template for the test. Your provider’s dashboard has all of these.
              </Note>
              <Field label="Provider">
                <select value={provider} onChange={(e) => setProvider(e.target.value)} className={input}>
                  {providers.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              {provider === 'Another provider' && (
                <Field label="Provider name">
                  <input value={otherName} onChange={(e) => setOtherName(e.target.value)} placeholder="Name of your provider" className={input} />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-4">
                <PhoneInput label="WhatsApp number" value={number} onChange={setNumber} />
                <Field label="Channel / sender ID" hint="Your provider may call it Channel ID, Sender ID or Phone Number ID.">
                  <input value={senderId} onChange={(e) => setSenderId(e.target.value)} className={input} />
                </Field>
              </div>
              <Field label="API key or access token" hint="Use a permanent token, not a 24-hour test token. We keep it encrypted and never show it again.">
                <div className="relative">
                  <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type={showKey ? 'text' : 'password'} autoComplete="off" className={`${input} pr-11`} />
                  <button type="button" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? 'Hide the key' : 'Show the key'} className="absolute right-1.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-canvas">
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <div className="grid grid-cols-[1fr_160px] gap-4">
                <Field label="Template for the test message" hint="The name of an approved template, in lowercase with underscores.">
                  <input value={templateName} onChange={(e) => setTemplateName(e.target.value.toLowerCase())} placeholder="hello_world" className={input} />
                </Field>
                <Field label="Language">
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className={input}>
                    <option value="en">English (en)</option>
                    <option value="en_US">English US (en_US)</option>
                    <option value="hi">Hindi (hi)</option>
                  </select>
                </Field>
              </div>
            </>
          )}

          {step === 'webhook' && (
            <>
              <p className="text-sm leading-relaxed text-slate-600">Your provider needs to send client messages and delivery updates to {APP_NAME}. Do this in your provider’s dashboard, under <b>Webhooks</b> (or Callback URL):</p>
              <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-snug text-slate-600">
                <li>Paste the webhook URL below.</li>
                <li>If it asks for a verify token, paste the token below.</li>
                <li>Turn on <b>messages</b> and <b>message status</b> updates.</li>
              </ol>
              <CopyBox label="Webhook URL" value={webhookUrl} />
              <CopyBox label="Verify token" value={verifyToken} />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={webhook === 'checking'}
                  onClick={() => {
                    setWebhook('checking')
                    setTimeout(() => setWebhook('ok'), 1200)
                  }}
                  className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-canvas disabled:opacity-60"
                >
                  {webhook === 'checking' && <Loader2 size={15} className="animate-spin" />}
                  Check connection
                </button>
                {webhook === 'ok' && (
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ok">
                    <Check size={15} strokeWidth={3} /> {providerLabel} is sending events to {APP_NAME}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">Demo: pressing the button shows the connection working.</p>
            </>
          )}

          {step === 'test' && (
            <>
              <p className="text-sm leading-relaxed text-slate-600">We send one message to a phone you choose, so you see it work before any client gets a message.</p>
              <PhoneInput label="Send the test to" hint="Your own mobile number. Use a different number from the one you just connected." value={testTo} onChange={setTestTo} error={testTo === number ? 'Use a different number from the one you connected.' : ''} />
              <div>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="font-semibold text-muted">What they will get</span>
                  <span className="text-xs text-muted">Template: {viaProvider ? `${templateName} (${language})` : 'doccollect_test (approved)'}</span>
                </div>
                <div className="mt-1.5 rounded-2xl bg-[#EFEAE2] p-3.5">
                  <div className="ml-auto w-fit max-w-[92%] rounded-[10px] rounded-tr-none bg-[#D9FDD3] px-3 py-2 text-[14px] leading-snug shadow-[0_1px_1px_rgba(17,27,33,0.13)]">
                    {templateText}
                    <div className="pt-0.5 text-right text-[11px] text-slate-500">
                      {sent === 'delivered' ? (
                        <span className="inline-flex items-center gap-1 text-[#53BDEB]">
                          {sentAt} <Check size={12} strokeWidth={3} />
                          <Check size={12} strokeWidth={3} className="-ml-2.5" />
                        </span>
                      ) : sent === 'sending' ? (
                        'Sending…'
                      ) : (
                        'Not sent yet'
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {sent === 'idle' && (
                <button type="button" disabled={!testOk} onClick={sendTest} className="h-11 self-start rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-40">
                  Send test message
                </button>
              )}
              {sent === 'sending' && (
                <span className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 size={16} className="animate-spin" /> Sending to {formatMobile(testTo)}…
                </span>
              )}
              {sent === 'delivered' && (
                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ok">
                    <Check size={16} strokeWidth={3} /> Delivered to {formatMobile(testTo)}. Check your phone.
                  </span>
                  <button type="button" onClick={() => setNotArrived((v) => !v)} className="self-start text-[13px] font-semibold text-brand hover:underline">
                    It did not arrive
                  </button>
                  {notArrived && (
                    <Note tone="warn">
                      <b className="flex items-center gap-1.5">
                        <AlertTriangle size={14} /> Things to check
                      </b>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5">
                        <li>The test number is correct and has WhatsApp.</li>
                        <li>{viaProvider ? 'The template name is approved and the language matches.' : 'The channel was created without a warning on the previous step.'}</li>
                        <li>{viaProvider ? 'The token is permanent and has not expired.' : 'A new account can take a few minutes to start sending.'}</li>
                      </ul>
                      <button type="button" onClick={sendTest} className="mt-2 font-semibold text-brand hover:underline">
                        Send it again
                      </button>
                    </Note>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-slate-50/70 px-6 py-4">
          <div>
            {back[step] && (
              <button type="button" onClick={() => setStep(back[step]!)} className="flex h-11 items-center gap-1.5 rounded-xl border border-line bg-white px-4 text-sm font-semibold">
                <ArrowLeft size={16} /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 'test' && sent !== 'delivered' && (
              <button type="button" onClick={() => finish()} className="h-11 rounded-xl px-4 text-sm font-semibold text-muted hover:bg-white">
                Skip for now
              </button>
            )}
            {step === 'webhook' && webhook !== 'ok' && (
              <button type="button" onClick={() => setStep('test')} className="h-11 rounded-xl px-4 text-sm font-semibold text-muted hover:bg-white">
                I will do this later
              </button>
            )}
            {step === 'have' && (
              <button type="button" onClick={() => setStep(have === 'normal' ? 'switch' : have === 'provider' ? 'provider' : 'number')} className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white">
                Continue
              </button>
            )}
            {step === 'number' && (
              <button type="button" disabled={!numberOk || displayName.trim().length < 3 || !workOnly || !terms} onClick={() => setStep('otp')} className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white disabled:opacity-40">
                Continue with Ramwin
              </button>
            )}
            {step === 'otp' && (
              <button type="button" disabled={code.length < 6} onClick={() => setStep('channel')} className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white disabled:opacity-40">
                Verify
              </button>
            )}
            {step === 'channel' && (
              <button type="button" disabled={progress < 5} onClick={() => setStep('test')} className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white disabled:opacity-40">
                Continue
              </button>
            )}
            {step === 'provider' && (
              <button type="button" disabled={!providerOk} onClick={() => setStep('webhook')} className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white disabled:opacity-40">
                Continue
              </button>
            )}
            {step === 'webhook' && webhook === 'ok' && (
              <button type="button" onClick={() => setStep('test')} className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white">
                Continue
              </button>
            )}
            {step === 'test' && sent === 'delivered' && (
              <button type="button" onClick={() => finish()} className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold text-white">
                Finish
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
