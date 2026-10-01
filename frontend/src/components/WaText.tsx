// WhatsApp writes bold as *like this*. Show it bold, and keep line breaks.
export default function WaText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g)
  return (
    <span className="whitespace-pre-line">
      {parts.map((p, i) =>
        p.length > 2 && p.startsWith('*') && p.endsWith('*') ? <strong key={i} className="font-bold">{p.slice(1, -1)}</strong> : <span key={i}>{p}</span>,
      )}
    </span>
  )
}
