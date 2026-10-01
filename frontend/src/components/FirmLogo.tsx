// The firm's logo, or its initials when none is uploaded.
export default function FirmLogo({ name, logo, size = 40 }: { name: string; logo: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  return logo ? (
    <img src={logo} alt={`${name} logo`} className="shrink-0 rounded-xl bg-white object-contain" style={{ width: size, height: size }} />
  ) : (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand font-bold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
