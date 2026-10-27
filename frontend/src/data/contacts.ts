import { useSyncExternalStore } from 'react'
import type { BookClient, Contact, Registration } from './mock'

// Who a registration's messages go to, and on which channel. This follows Client Communication Settings:
// every registration has a contact (the main contact unless another is picked) and an on/off switch for WhatsApp and for email.
// A switch cannot be on when the contact has no number (WhatsApp) or no email.
// For now these are kept for this browser tab only.

interface Channels {
  wa?: boolean
  email?: boolean
}
interface State {
  picked: Record<string, string> // registration id -> contact id
  added: Record<string, Contact[]> // client id -> contacts added by hand
  channels: Record<string, Channels> // registration id -> the switches that were touched
  edited: Record<string, Partial<Contact>> // contact id -> what was changed in the form
  main: Record<string, string> // client id -> the contact made the main contact
}

const KEY = `doccollect:${__BUILD_ID__}:contacts`
const read = (): State => {
  try {
    const saved = sessionStorage.getItem(KEY)
    if (saved) return { picked: {}, added: {}, channels: {}, edited: {}, main: {}, ...(JSON.parse(saved) as Partial<State>) }
  } catch {
    /* start clean */
  }
  return { picked: {}, added: {}, channels: {}, edited: {}, main: {} }
}

let state = read()
const listeners = new Set<() => void>()
const set = (next: State) => {
  state = next
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* not saved, still works */
  }
  listeners.forEach((l) => l())
}

const edited = (c: Contact): Contact => ({ ...c, ...state.edited[c.id] })
export const contactsOf = (client: BookClient): Contact[] => [...client.contacts, ...(state.added[client.id] ?? [])].map(edited)
// The client's main contact: the first contact, unless another was made main.
export const mainContact = (client: BookClient): Contact => contactsOf(client).find((c) => c.id === state.main[client.id]) ?? contactsOf(client)[0]
// A registration has its own contact when one was picked or the sample data gave it one. A registration on the original main contact follows whoever is main now.
export const contactOf = (client: BookClient, reg: Registration): Contact => {
  const all = contactsOf(client)
  const picked = all.find((c) => c.id === state.picked[reg.id])
  if (picked) return picked
  return reg.contact.id === client.contacts[0].id ? mainContact(client) : edited(reg.contact)
}
export const channelsOf = (client: BookClient, reg: Registration) => {
  const c = contactOf(client, reg)
  const t = state.channels[reg.id] ?? {}
  return { wa: !!c.phone && t.wa !== false, email: !!c.email && t.email !== false }
}
// Whether a request message for this registration goes out on WhatsApp.
export const whatsappOn = (client: BookClient, reg: Registration) => channelsOf(client, reg).wa

export const setChannel = (regId: string, channel: 'wa' | 'email', on: boolean) =>
  set({ ...state, channels: { ...state.channels, [regId]: { ...state.channels[regId], [channel]: on } } })
// Picking a contact turns off the switches the new contact cannot use, and the others stay as they were.
export const pickContact = (regId: string, contactId: string) => set({ ...state, picked: { ...state.picked, [regId]: contactId }, channels: { ...state.channels, [regId]: {} } })
// Editing a contact changes it for every registration that uses it.
export const editContact = (contactId: string, patch: Partial<Contact>) => set({ ...state, edited: { ...state.edited, [contactId]: { ...state.edited[contactId], ...patch } } })
export const setMain = (clientId: string, contactId: string) => set({ ...state, main: { ...state.main, [clientId]: contactId } })
export const addContact = (clientId: string, contact: Contact) => set({ ...state, added: { ...state.added, [clientId]: [...(state.added[clientId] ?? []), contact] } })

// Re-renders the page when anything above changes.
export const useContacts = () => useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => state)
