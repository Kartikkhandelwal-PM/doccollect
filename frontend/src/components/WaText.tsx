import { LINK_DOMAIN } from '../lib/brand'
import { appPath } from '../lib/links'

// WhatsApp writes bold as *like this*. Show it bold, keep line breaks, and make our upload links open.
const split = new RegExp(`(\\*[^*\\n]+\\*|${LINK_DOMAIN.replace(/\./g, '\\.')}/u/[\\w-]+)`, 'g')
export default function WaText({ text }: { text: string }) {
  const parts = text.split(split)
  const link = new RegExp(`^${LINK_DOMAIN.replace(/\./g, '\\.')}/u/([\\w-]+)$`)
  return (
    <span className="whitespace-pre-line">
      {parts.map((p, i) => {
        const l = p.match(link)
        if (l)
          return (
            <a key={i} href={appPath(l[1])} target="_blank" rel="noopener noreferrer" className="text-[#027EB5] underline">
              {p}
            </a>
          )
        return p.length > 2 && p.startsWith('*') && p.endsWith('*') ? <strong key={i} className="font-bold">{p.slice(1, -1)}</strong> : <span key={i}>{p}</span>
      })}
    </span>
  )
}
