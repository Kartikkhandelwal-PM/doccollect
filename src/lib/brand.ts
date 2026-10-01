// The product's name, in one place. Change it in .env and the whole app follows.
const env = import.meta.env

// What the product is called (sidebar, browser tab).
export const APP_NAME: string = env.VITE_APP_NAME ?? 'DocCollect'

// The name clients see when a message comes from the shared WhatsApp number.
export const SHARED_NUMBER_NAME: string = env.VITE_SHARED_NUMBER_NAME ?? APP_NAME

// The web address that upload links start with.
export const LINK_DOMAIN: string = env.VITE_LINK_DOMAIN ?? 'doccollect.in'

// Profile and Subscription are KDK's own pages. The menu simply links to them.
export const KDK_PROFILE_URL: string = env.VITE_KDK_PROFILE_URL ?? 'https://www.kdksoftware.com/profile'
export const KDK_SUBSCRIPTION_URL: string = env.VITE_KDK_SUBSCRIPTION_URL ?? 'https://www.kdksoftware.com/subscription'
