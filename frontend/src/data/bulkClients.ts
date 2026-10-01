// A large block of made-up GST clients, so the app can be tried the way a busy office would use it: one request to many clients.
export const slugOf = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const first = ['Shree', 'Royal', 'Global', 'Modern', 'Star', 'Unique', 'Classic', 'Elite', 'National', 'Sunrise', 'Metro', 'Apex']
const second = ['Traders', 'Enterprises', 'Industries', 'Agencies', 'Distributors', 'Fabrics', 'Hardware', 'Chemicals', 'Motors', 'Foods']

// 60 distinct names: walk the grid with a step that does not repeat.
export const bulkNames: string[] = Array.from({ length: 60 }, (_, i) => `${first[(i * 5) % first.length]} ${second[(i * 3 + Math.floor(i / 10)) % second.length]}`).filter((n, i, a) => a.indexOf(n) === i)
