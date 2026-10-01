import { siWhatsapp } from 'simple-icons'

// The WhatsApp logo (simple-icons, CC0) on its brand-green circle.
export default function WhatsAppIcon({ size = 36 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="currentColor">
        <path d={siWhatsapp.path} />
      </svg>
    </span>
  )
}
