// The product's name, in one place. Change it in .env and the whole app follows.
const env = import.meta.env

// What the product is called (sidebar, browser tab).
export const APP_NAME: string = env.VITE_APP_NAME ?? 'DocCollect'

// The name clients see when a message comes from the shared WhatsApp number. This is KDK's number, and it is called CA Connect, not the name of this module.
export const SHARED_NUMBER: string = env.VITE_SHARED_NUMBER ?? '+91 98765 00000'
export const SHARED_NUMBER_NAME: string = env.VITE_SHARED_NUMBER_NAME ?? 'CA Connect'

// The web address that upload links start with.
export const LINK_DOMAIN: string = env.VITE_LINK_DOMAIN ?? 'doccollect.in'

// Profile and Subscription are KDK's own pages. The menu simply links to them.
export const KDK_PROFILE_URL: string = env.VITE_KDK_PROFILE_URL ?? 'https://www.kdksoftware.com/profile'
export const KDK_SUBSCRIPTION_URL: string = env.VITE_KDK_SUBSCRIPTION_URL ?? 'https://www.kdksoftware.com/subscription'

// The page where a firm links its own WhatsApp number. The real flow sends the user there, and Ramwin gives us back the channel ID and API key on the server,
// so nothing is typed or pasted here. In this demo the same steps run on our own screen (/ramwin).
export const RAMWIN_CONNECT_URL: string = env.VITE_RAMWIN_CONNECT_URL ?? '/ramwin'
