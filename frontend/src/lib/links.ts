// The address a client opens: /u/r-1042-ramesh-itr-v1  (request, client, and which version of the link).
// A new link for the same client has a new version, which switches the old one off.
export const linkToken = (ref: string, clientId: string, version = 1) => `${ref.toLowerCase()}-${clientId}-v${version}`

export function parseToken(token: string): { ref: string; clientId: string; version: number } | null {
  const m = token.match(/^(r-\d+)-(.+)-v(\d+)$/)
  return m ? { ref: m[1], clientId: m[2], version: Number(m[3]) } : null
}

// The same link, as it opens inside this app (the real domain does not exist yet).
export const appPath = (token: string) => `${import.meta.env.BASE_URL}u/${token}`

// The full address, which opens in any browser: what "Copy link" copies.
export const fullLink = (token: string) => `${window.location.origin}${appPath(token)}`
