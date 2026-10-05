import { useId, useState } from 'react'
import { mobileDigits, mobileError } from '../lib/phone'

// A mobile number field. +91 is fixed in front, only digits go in, and it stops at 10.
// `value` can be digits or a number saved as "+91 98765 43210". `onChange` gives the 10 digits.
export default function PhoneInput({ label, hint, value, onChange, error: extra, placeholder = '98765 43210', autoFocus }: { label: string; hint?: string; value: string; onChange: (digits: string) => void; error?: string; placeholder?: string; autoFocus?: boolean }) {
  const id = useId()
  const [left, setLeft] = useState(false)
  const digits = mobileDigits(value)
  const error = mobileError(digits, left) || (digits.length === 10 ? (extra ?? '') : '')
  return (
    <div className="block text-[13px] font-semibold text-muted">
      <label htmlFor={id}>{label}</label>
      <div className={`mt-1 flex h-11 overflow-hidden rounded-xl border bg-white focus-within:border-brand ${error ? 'border-danger' : 'border-line'}`}>
        <span className="flex items-center border-r border-line bg-canvas px-3 text-[15px] font-medium text-slate-600" aria-hidden="true">
          +91
        </span>
        <input
          id={id}
          value={digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits}
          onChange={(e) => onChange(mobileDigits(e.target.value))}
          onBlur={() => setLeft(true)}
          inputMode="numeric"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] font-medium text-ink outline-none placeholder:text-faint"
        />
      </div>
      {error ? (
        <span id={`${id}-error`} role="alert" className="mt-1 block text-xs font-medium text-danger">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-hint`} className="mt-1 block text-xs font-normal leading-snug text-muted">
            {hint}
          </span>
        )
      )}
    </div>
  )
}
