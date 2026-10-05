import { ExternalLink } from 'lucide-react'

// Opens a file on its own page, in a new tab, so it does not have to be looked at inside the panel.
export default function OpenInTab({ href, label = 'Open in new tab', iconOnly }: { href: string; label?: string; iconOnly?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={iconOnly ? 'flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white' : 'flex h-11 shrink-0 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold hover:bg-canvas'}
    >
      <ExternalLink size={iconOnly ? 17 : 16} />
      {!iconOnly && label}
    </a>
  )
}
