import { ArrowLeft, ChevronRight, Mail, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { addContact, channelsOf, contactOf, contactsOf, editContact, mainContact, pickContact, setMain, setChannel, useContacts } from '../data/contacts'
import type { BookClient, Registration } from '../data/mock'
import type { Service } from '../data/types'
import { serviceColor } from '../lib/status'
import Avatar from './Avatar'
import WhatsAppIcon from './WhatsAppIcon'

export const regTitle = (r: Registration) => (r.type === 'ITR' ? 'ITR' : `${r.type}${r.label ? ` · ${r.label}` : ''}`)

function Switch({ on, disabled, label, onChange }: { on: boolean; disabled?: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!on)
      }}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-slate-300'} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}

type Kind = 'All' | Service
const kindName: Record<Service, string> = { ITR: 'ITR', GST: 'GST', TDS: 'TDS' }

// Each kind keeps one colour everywhere in the tree: its node, its lines and its badge.
const tone = {
  ITR: { line: 'border-violet-300', node: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  GST: { line: 'border-blue-300', node: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500' },
  TDS: { line: 'border-amber-300', node: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
} as const

// The lines of a tree with rounded elbows: the first item turns down from the top, the last turns up from the bottom,
// the ones between hang off one straight upright. One item gets a single straight line.
function Branch({ items, line = 'border-slate-300', gap = 'py-2' }: { items: { key: string; node: ReactNode }[]; line?: string; gap?: string }) {
  const n = items.length
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {items.map((it, i) => (
        <div key={it.key} className={`relative min-w-0 pl-7 ${gap}`}>
          {n === 1 ? (
            <span className={`absolute left-0 top-1/2 w-7 border-t-[1.5px] ${line}`} />
          ) : i === 0 ? (
            <span className={`absolute bottom-0 left-0 top-1/2 w-7 rounded-tl-2xl border-l-[1.5px] border-t-[1.5px] ${line}`} />
          ) : i === n - 1 ? (
            <span className={`absolute bottom-1/2 left-0 top-0 w-7 rounded-bl-2xl border-b-[1.5px] border-l-[1.5px] ${line}`} />
          ) : (
            <>
              <span className={`absolute inset-y-0 left-0 border-l-[1.5px] ${line}`} />
              <span className={`absolute left-0 top-1/2 w-7 border-t-[1.5px] ${line}`} />
            </>
          )}
          {it.node}
        </div>
      ))}
    </div>
  )
}

const Stub = ({ line = 'border-slate-300' }: { line?: string }) => (
  <span className="relative w-7 shrink-0 self-stretch">
    <span className={`absolute inset-x-0 top-1/2 border-t-[1.5px] ${line}`} />
  </span>
)

// The client drawn as a tree, read left to right like Compliance Tracker's Structure view:
// the client, then Income tax / GST / TDS, then each GSTIN or TAN. A registration opens a side panel with its contact and switches.
export default function ClientRegistrations({ client, openBy, onOpen, onDone }: { client: BookClient; openBy: Record<string, number>; initialKind?: Kind; onOpen: (regId: string) => void; onDone: (message: string) => void }) {
  useContacts()
  const [changing, setChanging] = useState<Registration | null>(null)
  const [viewing, setViewing] = useState<Registration | null>(null)
  // How many people get messages, and how many requests are open across everything: the one picture of the whole client.
  const contactCount = new Set(client.registrations.map((r) => contactOf(client, r).id)).size
  const totalOpen = client.registrations.reduce((n, r) => n + (openBy[r.id] ?? 0), 0)
  const main = mainContact(client)
  const none = { ITR: 'Not on file', GST: 'Not registered for GST', TDS: 'No TAN' } as const
  const many = { ITR: 'PAN', GST: 'GSTINs', TDS: 'TANs' } as const
  const one = { ITR: 'PAN', GST: 'GSTIN', TDS: 'TAN' } as const

  const leaf = (r: Registration, width = 'w-full') => {
    const c = contactOf(client, r)
    const open = openBy[r.id] ?? 0
    return (
      <button
        type="button"
        onClick={() => setViewing(r)}
        className={`group flex ${width} items-center gap-3.5 rounded-xl border border-line bg-white px-4 py-3 text-left shadow-[0_1px_3px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-px hover:border-brand hover:shadow-md`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2.5">
            <span className="truncate text-[15px] font-bold leading-tight">{r.type === 'ITR' ? 'PAN' : (r.label ?? r.type)}</span>
            <span className="truncate font-mono text-[13px] tracking-tight text-slate-500">{r.number}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-[13px]">
            <span className="truncate font-medium text-slate-700">{c.name}</span>
            {c.phone && <span className="shrink-0 text-muted">{c.phone}</span>}
          </span>
        </span>
        {open > 0 && <span className="shrink-0 rounded-full bg-warn-soft px-3 py-1 text-[12px] font-semibold text-warn">{open} open</span>}
        <ChevronRight size={16} className="shrink-0 text-slate-300 transition-colors group-hover:text-brand" />
      </button>
    )
  }

  const heads = (['ITR', 'GST', 'TDS'] as const).map((t) => {
    const regs = client.registrations.filter((r) => r.type === t)
    const open = regs.reduce((n, r) => n + (openBy[r.id] ?? 0), 0)
    const head = regs.length ? (
      <div className="flex w-[230px] shrink-0 items-center gap-3 rounded-xl border border-line bg-[#F1F3F6] px-4 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.07)]">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold ring-1 ${tone[t].node}`}>{t}</span>
        <span className="min-w-0 flex-1">
          <span className="block whitespace-nowrap text-[15px] font-bold leading-tight">{kindName[t]}</span>
          <span className="mt-0.5 block truncate text-xs text-slate-500">{t === 'ITR' ? 'Filed on the PAN' : `${regs.length} ${regs.length === 1 ? one[t] : many[t]}`}</span>
        </span>
        {/* With one registration, its own card already says it. */}
        {open > 0 && regs.length > 1 && <span className="shrink-0 rounded-full bg-warn-soft px-2.5 py-0.5 text-[12px] font-semibold text-warn">{open} open</span>}
      </div>
    ) : (
      <div className="flex w-[230px] shrink-0 items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3.5 text-muted">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[12px] font-bold text-slate-500">{t}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold leading-tight">{kindName[t]}</span>
          <span className="mt-0.5 block truncate text-xs">{none[t]}</span>
        </span>
      </div>
    )
    return {
      key: t,
      node: (
        <div className="flex w-full min-w-0 items-center">
          {head}
          {regs.length > 0 && (
            <>
              <Stub line={tone[t].line} />
              <Branch line={tone[t].line} gap="py-2" items={regs.map((r) => ({ key: r.id, node: leaf(r) }))} />
            </>
          )}
        </div>
      ),
    }
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-[18px] border border-line bg-white">
        <div className="overflow-x-auto bg-[#F8FAFB] bg-[radial-gradient(rgba(15,23,42,0.06)_1px,transparent_1px)] px-5 py-8 [background-size:20px_20px] max-md:hidden">
          <div className="flex w-full min-w-[900px] items-center">
            <div className="relative w-[290px] shrink-0 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-400 via-blue-400 to-amber-400" />
              <div className="px-5 pb-4 pt-6">
                <div className="text-[12px] font-bold uppercase tracking-widest text-faint">Client</div>
                <div className="mt-1 text-[19px] font-bold leading-tight">{client.name}</div>
                <div className="mt-1.5 text-xs text-muted">{client.kind === 'firm' ? 'Business' : 'Individual'}</div>
              </div>
              <div className="flex flex-col gap-2 border-t border-line px-5 py-3.5 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">PAN</span>
                  <span className="font-mono font-semibold text-slate-800">{client.pan}</span>
                </div>
                {main.phone && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted">Mobile</span>
                    <span className="font-semibold text-slate-800">{main.phone}</span>
                  </div>
                )}
                {main.email && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted">Email</span>
                    <span className="min-w-0 truncate font-semibold text-slate-800" title={main.email}>
                      {main.email}
                    </span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 divide-x divide-line border-t border-line bg-slate-50/70">
                {[
                  { n: client.registrations.length, label: 'registrations', tone: '' },
                  { n: contactCount, label: contactCount === 1 ? 'contact' : 'contacts', tone: '' },
                  { n: totalOpen, label: 'open', tone: totalOpen > 0 ? 'text-warn' : '' },
                ].map((x) => (
                  <div key={x.label} className="px-2 py-3 text-center">
                    <div className={`text-[17px] font-bold leading-none ${x.tone}`}>{x.n}</div>
                    <div className="mt-1 text-[12px] text-muted">{x.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <Stub />
            <Branch items={heads} gap="py-2.5" />
          </div>
        </div>
      </div>

      {/* On a phone the tree reads top to bottom: each kind, then its registrations under it. */}
      <div className="flex flex-col gap-5 md:hidden">
        {(['ITR', 'GST', 'TDS'] as const).map((t) => {
          const regs = client.registrations.filter((r) => r.type === t)
          if (regs.length === 0) return null
          return (
            <div key={t}>
              <div className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-bold ring-1 ${tone[t].node}`}>{t}</span>
                <span className="text-sm font-bold">{kindName[t]}</span>
                <span className="text-xs text-muted">{t === 'ITR' ? 'On the PAN' : `${regs.length} ${regs.length === 1 ? one[t] : many[t]}`}</span>
              </div>
              <div className={`ml-[18px] mt-1 border-l ${tone[t].line}`}>
                {regs.map((r) => (
                  <div key={r.id} className="relative py-1.5 pl-5">
                    <span className={`absolute left-0 top-1/2 w-5 border-t ${tone[t].line}`} />
                    {leaf(r, 'w-full')}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {viewing && (
        <RegistrationPanel
          client={client}
          reg={viewing}
          open={openBy[viewing.id] ?? 0}
          onClose={() => setViewing(null)}
          onChange={() => setChanging(viewing)}
          onOpenRequests={() => {
            setViewing(null)
            onOpen(viewing.id)
          }}
        />
      )}
      {changing && <ChangeContact client={client} reg={changing} onClose={() => setChanging(null)} onDone={onDone} />}
    </div>
  )
}

// One registration in a side panel: what it is, who gets its messages and on which channel, and its open requests.
function RegistrationPanel({ client, reg, open, onClose, onChange, onOpenRequests }: { client: BookClient; reg: Registration; open: number; onClose: () => void; onChange: () => void; onOpenRequests: () => void }) {
  useContacts()
  const c = contactOf(client, reg)
  const ch = channelsOf(client, reg)
  const label = 'text-[12px] font-bold uppercase tracking-wider text-faint'
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div role="dialog" aria-label={regTitle(reg)} onClick={(e) => e.stopPropagation()} className="flex h-full w-full flex-col overflow-y-auto bg-white shadow-2xl md:w-[420px]">
        <div className="flex items-start gap-3 border-b border-line p-5">
          <span className={`mt-0.5 w-10 shrink-0 rounded-md bg-slate-100 py-0.5 text-center text-[12px] font-bold ${serviceColor[reg.type]}`}>{reg.type}</span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold">{reg.type === 'ITR' ? 'ITR' : regTitle(reg)}</h2>
            <p className="truncate text-[13px] text-muted">{reg.number}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-6 p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className={label}>Contact for messages</span>
              <button type="button" onClick={onChange} className="text-[13px] font-semibold text-brand-dark hover:underline">
                Change contact
              </button>
            </div>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-line p-3.5">
              <Avatar name={c.name} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="truncate">{c.name}</span>
                  {c.id === mainContact(client).id && <span className="shrink-0 rounded bg-slate-100 px-1.5 py-px text-[12px] font-bold uppercase tracking-wide text-muted">Main</span>}
                </div>
                <div className="truncate text-[13px] text-muted">{c.phone || 'No mobile number'}</div>
                <div className="truncate text-[13px] text-muted">{c.email || 'No email'}</div>
              </div>
            </div>
          </div>
          <div>
            <span className={label}>Messages go on</span>
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5">
                <WhatsAppIcon size={18} />
                <span className="flex-1 text-sm font-medium">WhatsApp{!c.phone && <span className="block text-xs font-normal text-muted">No mobile number</span>}</span>
                <Switch on={ch.wa} disabled={!c.phone} label={`WhatsApp for ${regTitle(reg)}`} onChange={(on) => setChannel(reg.id, 'wa', on)} />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5">
                <Mail size={18} className="text-muted" />
                <span className="flex-1 text-sm font-medium">Email{!c.email && <span className="block text-xs font-normal text-muted">No email</span>}</span>
                <Switch on={ch.email} disabled={!c.email} label={`Email for ${regTitle(reg)}`} onChange={(on) => setChannel(reg.id, 'email', on)} />
              </div>
            </div>
          </div>
          <div>
            <span className={label}>Requests</span>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3">
              <span className="text-sm">{open > 0 ? `${open} open ${open === 1 ? 'request' : 'requests'}` : 'No open requests'}</span>
              {open > 0 && (
                <button type="button" onClick={onOpenRequests} className="h-8 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-dark">
                  See requests
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Pick another contact of this client for one registration, add a new one, or edit one. Editing changes it for every registration that uses it.
export function ChangeContact({ client, reg, onClose, onDone }: { client: BookClient; reg?: Registration; onClose: () => void; onDone: (message: string) => void }) {
  useContacts()
  const list = contactsOf(client)
  // With a registration this picks its contact. Without one it picks the client's main contact.
  const current = reg ? contactOf(client, reg) : mainContact(client)
  const [choice, setChoice] = useState(current.id)
  // null: just picking. 'new': adding a contact. Otherwise the id of the contact being edited.
  const [form, setForm] = useState<{ id: string | 'new'; name: string; phone: string; email: string } | null>(null)
  const digits = form ? form.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '') : ''
  const problem = !form
    ? ''
    : form.name.trim() === ''
      ? 'Name is required.'
      : !digits && !form.email.trim()
        ? 'Add a mobile number or an email.'
        : digits && digits.length !== 10
          ? 'Mobile number must be 10 digits.'
          : form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())
            ? 'Email does not look right.'
            : ''
  const usedBy = (id: string) => client.registrations.filter((r) => contactOf(client, r).id === id)
  const phoneOf = () => (digits ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : '')

  const save = () => {
    if (!form || problem) return
    if (form.id === 'new') {
      const id = `${client.id}:new:${Date.now()}`
      addContact(client.id, { id, name: form.name.trim(), phone: phoneOf(), email: form.email.trim() })
      choose(id, form.name.trim())
      onClose()
    } else {
      editContact(form.id, { name: form.name.trim(), phone: phoneOf(), email: form.email.trim() })
      const n = usedBy(form.id).length
      onDone(`${form.name.trim()} updated for ${n} ${n === 1 ? 'registration' : 'registrations'}.`)
      setForm(null)
    }
  }
  const choose = (id: string, name: string) => {
    if (reg) {
      pickContact(reg.id, id)
      onDone(`${regTitle(reg)} now goes to ${name}. Messages already sent are not changed.`)
    } else {
      setMain(client.id, id)
      onDone(`${name} is now the main contact. Registrations without their own contact follow.`)
    }
  }
  const use = () => {
    choose(choice, list.find((c) => c.id === choice)?.name ?? '')
    onClose()
  }

  const input = 'h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-brand'
  // Editing a contact is its own view: the list steps aside so it is clear what is being changed.
  const editing = form && form.id !== 'new' ? list.find((c) => c.id === form.id) : undefined
  if (form && editing)
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center" onClick={onClose}>
        <div role="dialog" aria-label="Edit contact" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full overflow-y-auto rounded-t-[20px] bg-white p-5 shadow-2xl md:w-[460px] md:rounded-[20px]">
          <div className="flex items-start gap-3">
            <button type="button" aria-label="Back to contacts" onClick={() => setForm(null)} className="-ml-1.5 mt-0.5 rounded-lg p-1.5 text-muted hover:bg-slate-100">
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold">Edit contact</h2>
              <p className="truncate text-[13px] text-muted">
                {editing.name}
                {editing.id === mainContact(client).id && ' · Main contact'}
              </p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3.5">
            <label className="text-[13px] font-semibold text-slate-600">
              Name
              <input className={`${input} mt-1 h-11`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="text-[13px] font-semibold text-slate-600">
              Mobile number
              <input className={`${input} mt-1 h-11`} placeholder="10 digits" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="text-[13px] font-semibold text-slate-600">
              Email
              <input className={`${input} mt-1 h-11`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
          </div>
          {problem && form.name !== '' && <p className="mt-2 text-xs text-danger">{problem}</p>}
          {usedBy(editing.id).length > 1 && <p className="mt-3 text-xs text-muted">Applies to {usedBy(editing.id).length} registrations.</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setForm(null)} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={!!problem} className="h-10 rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-50">
              Save changes
            </button>
          </div>
        </div>
      </div>
    )
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center" onClick={onClose}>
      <div role="dialog" aria-label="Change contact" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full overflow-y-auto rounded-t-[20px] bg-white p-5 shadow-2xl md:w-[460px] md:rounded-[20px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">{reg ? `Contact for ${regTitle(reg)}` : 'Main contact'}</h2>
            <p className="text-[13px] text-muted">{reg ? reg.number : client.name}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <p className="mt-3 text-[13px] text-slate-600">{reg ? 'Pick who gets the messages for this registration, or add someone new.' : 'The main contact gets the messages of every registration that has no contact of its own.'}</p>
        <div className="mt-2 flex flex-col gap-2">
          {list.map((c) => {
            const regs = usedBy(c.id).map((r) => regTitle(r))
            return (
              <label key={c.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 ${!form && choice === c.id ? 'border-brand bg-brand-soft/40' : 'border-line hover:border-slate-400'}`}>
                <input type="radio" name="contact" checked={choice === c.id} onChange={() => (setForm(null), setChoice(c.id))} className="mt-1 accent-[#0B7A6B]" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">{c.name}</span>
                  {c.id === mainContact(client).id && <span className="ml-2 text-[12px] font-bold text-slate-500">MAIN</span>}
                  {c.id === current.id && <span className="ml-2 text-[12px] font-bold text-brand-dark">CURRENT</span>}
                  <span className="block text-xs text-muted">
                    {c.phone || 'No mobile'} · {c.email || 'No email'}
                  </span>
                  <span className="block text-xs text-muted">{regs.length ? `Handles ${regs.length > 3 ? `${regs.length} registrations` : regs.join(', ')}` : 'Not handling any registration'}</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setForm({ id: c.id, name: c.name, phone: c.phone, email: c.email })
                  }}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-brand-dark hover:bg-brand-soft"
                >
                  Edit
                </button>
              </label>
            )
          })}
          <button type="button" onClick={() => setForm({ id: 'new', name: '', phone: '', email: '' })} className={`flex items-center gap-2 rounded-xl border border-dashed px-3.5 py-3 text-sm font-semibold ${form?.id === 'new' ? 'border-brand text-brand-dark' : 'border-slate-300 text-brand'}`}>
            <Plus size={16} /> Add a new contact
          </button>
          {form && (
            <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-600">
                {form.id === 'new' ? 'New contact' : `Edit ${list.find((c) => c.id === form.id)?.name}`}
                {form.id !== 'new' && usedBy(form.id).length > 1 && <span className="font-medium text-muted"> · changes it for {usedBy(form.id).length} registrations</span>}
              </div>
              <input className={input} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className={input} placeholder="Mobile number (10 digits)" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className={input} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {problem && form.name !== '' && <p className="text-xs text-danger">{problem}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setForm(null)} className="h-9 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold">
                  Cancel
                </button>
                <button type="button" onClick={save} disabled={!!problem} className="h-9 rounded-lg bg-brand px-4 text-[13px] font-semibold text-white disabled:opacity-50">
                  {form.id === 'new' ? 'Add and use' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">{reg ? 'Messages for this registration go to this contact from now on. A switch the contact cannot use (no mobile or no email) is turned off.' : 'Messages already sent are not changed.'}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold">
            Cancel
          </button>
          <button type="button" onClick={use} disabled={choice === current.id || !!form} className="h-10 rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-50">
            Use this contact
          </button>
        </div>
      </div>
    </div>
  )
}
