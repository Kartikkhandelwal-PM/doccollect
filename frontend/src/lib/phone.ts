// Indian mobile numbers: 10 digits, starting with 6, 7, 8 or 9.

// Just the 10 digits, from anything a person types or pastes: "+91 98765 43210", "09876543210", "98765-43210".
export function mobileDigits(input: string): string {
  const raw = input.trim()
  let d = raw.replace(/\D/g, '')
  if (raw.startsWith('+91') || (d.length === 12 && d.startsWith('91'))) d = d.slice(2)
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}

export const isMobile = (digits: string) => /^[6-9]\d{9}$/.test(digits)

// "9876543210" -> "+91 98765 43210". A number still being typed is grouped the same way.
export function formatMobile(digits: string): string {
  const d = digits.slice(0, 10)
  return d.length > 5 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : d ? `+91 ${d}` : ''
}

// What is wrong with it, in words a person understands. Empty when it is fine.
// A wrong first digit is flagged at once. A short number is only flagged once the field has been left.
export function mobileError(digits: string, left: boolean): string {
  if (digits && !/^[6-9]/.test(digits)) return 'A mobile number starts with 6, 7, 8 or 9.'
  if (isMobile(digits)) return ''
  if (!left) return ''
  return digits ? `Enter all 10 digits. You have typed ${digits.length}.` : 'Enter a 10-digit mobile number.'
}
