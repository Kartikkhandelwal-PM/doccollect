const palette = [
  'bg-[#C9E9E1] text-[#075E52]',
  'bg-[#E6DDF7] text-[#5B21B6]',
  'bg-[#FBE4D5] text-[#9A3412]',
  'bg-[#DCE8FB] text-[#1E40AF]',
  'bg-[#FCEFC7] text-[#92400E]',
  'bg-[#D5F0DF] text-[#065F46]',
]

function pick(seed: string) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
}

// "Kartik Khandelwal" -> "KK", "Priya Textiles Pvt Ltd" -> "PT", "Anand" -> "A"
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

interface Props {
  name: string
  size?: number
}

export default function Avatar({ name, size = 40 }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold ${pick(name)}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
