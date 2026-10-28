import type { DocRequest } from '../data/requests'

// One request is a batch with one number (R-1050). Each client in it also gets a number of their own (R-1050-01, R-1050-02...), by their place in the batch,
// to use when talking about one client: on their upload page, in their chat, in search.
export const lineRef = (r: Pick<DocRequest, 'ref' | 'clients'>, clientId: string) => {
  const i = r.clients.findIndex((c) => c.clientId === clientId)
  return i < 0 ? r.ref : `${r.ref}-${String(i + 1).padStart(2, '0')}`
}
