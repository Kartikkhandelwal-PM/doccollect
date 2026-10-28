// Small flat pictures for places that have nothing in them yet. One style: soft green ground, white paper, one amber spot of colour.
export type Art = 'clients' | 'requests' | 'inbox' | 'folder' | 'search' | 'done' | 'files'

const G = '#0B7A6B' // brand
const GS = '#E6F5F1' // brand soft
const GM = '#BFE3DA' // mint
const INK = '#0E1B2C'
const LINE = '#D9E2EA'
const AMB = '#F2A93B'

function Ground() {
  return (
    <>
      <ellipse cx="100" cy="122" rx="74" ry="9" fill={GS} />
      <circle cx="30" cy="40" r="3" fill={GM} />
      <circle cx="176" cy="30" r="4" fill={GM} />
      <circle cx="168" cy="98" r="2.5" fill={AMB} />
      <path d="M22 86l4 0M24 84l0 4" stroke={GM} strokeWidth="2" strokeLinecap="round" />
    </>
  )
}

const Paper = ({ x, y, w, h, rot = 0 }: { x: number; y: number; w: number; h: number; rot?: number }) => (
  <rect x={x} y={y} width={w} height={h} rx="7" fill="#fff" stroke={LINE} strokeWidth="2" transform={rot ? `rotate(${rot} ${x + w / 2} ${y + h / 2})` : undefined} />
)

export default function Illustration({ art, className = '' }: { art: Art; className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} role="img" aria-hidden="true" fill="none">
      <Ground />
      {art === 'clients' && (
        <>
          <Paper x={92} y={34} w={76} h={62} />
          <rect x="104" y="48" width="40" height="6" rx="3" fill={LINE} />
          <rect x="104" y="62" width="52" height="6" rx="3" fill={LINE} />
          <rect x="104" y="76" width="30" height="6" rx="3" fill={LINE} />
          <circle cx="64" cy="58" r="17" fill={G} />
          <path d="M34 112c2-20 14-30 30-30s28 10 30 30z" fill={G} />
          <circle cx="64" cy="58" r="17" fill={G} />
          <circle cx="104" cy="74" r="13" fill={AMB} />
          <path d="M82 114c2-15 11-22 22-22s20 7 22 22z" fill={AMB} />
          <circle cx="64" cy="53" r="5" fill={GS} opacity=".35" />
        </>
      )}
      {art === 'requests' && (
        <>
          <Paper x={58} y={22} w={84} h={96} rot={-4} />
          <rect x="72" y="40" width="56" height="7" rx="3.5" fill={INK} opacity=".8" />
          {[58, 76, 94].map((y, i) => (
            <g key={y}>
              <circle cx="78" cy={y + 3} r="7" fill={i === 0 ? G : GS} />
              {i === 0 && <path d="M74.5 61l3 3 5-6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
              <rect x="92" y={y} width={i === 1 ? 34 : 42} height="6" rx="3" fill={LINE} />
            </g>
          ))}
          <path d="M146 46l30-14-9 34-9-9-9 5z" fill={AMB} />
          <path d="M146 46l21 11-3 10" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" opacity=".7" />
        </>
      )}
      {art === 'inbox' && (
        <>
          <rect x="34" y="34" width="86" height="44" rx="14" fill="#fff" stroke={LINE} strokeWidth="2" />
          <path d="M52 78v14l16-14z" fill="#fff" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
          <rect x="48" y="48" width="52" height="6" rx="3" fill={LINE} />
          <rect x="48" y="60" width="34" height="6" rx="3" fill={LINE} />
          <rect x="86" y="62" width="82" height="46" rx="14" fill={G} />
          <path d="M148 108v14l-16-14z" fill={G} />
          <rect x="100" y="76" width="30" height="20" rx="4" fill="#fff" />
          <path d="M104 82h22M104 88h14" stroke={G} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="150" cy="82" r="5" fill={AMB} />
        </>
      )}
      {art === 'folder' && (
        <>
          <Paper x={74} y={26} w={52} h={60} rot={-6} />
          <Paper x={92} y={22} w={52} h={60} rot={7} />
          <path d="M40 54a8 8 0 018-8h30l10 12h64a8 8 0 018 8v44a8 8 0 01-8 8H48a8 8 0 01-8-8z" fill={G} />
          <path d="M40 70h128v36a8 8 0 01-8 8H48a8 8 0 01-8-8z" fill="#12907F" />
          <rect x="82" y="84" width="44" height="6" rx="3" fill="#fff" opacity=".55" />
          <circle cx="150" cy="40" r="6" fill={AMB} />
        </>
      )}
      {art === 'search' && (
        <>
          <Paper x={50} y={28} w={70} h={86} />
          <rect x="62" y="44" width="40" height="6" rx="3" fill={LINE} />
          <rect x="62" y="58" width="46" height="6" rx="3" fill={LINE} />
          <rect x="62" y="72" width="28" height="6" rx="3" fill={LINE} />
          <circle cx="124" cy="78" r="24" fill="#fff" fillOpacity=".7" stroke={G} strokeWidth="6" />
          <path d="M142 96l20 20" stroke={G} strokeWidth="8" strokeLinecap="round" />
          <path d="M116 70l16 16M132 70l-16 16" stroke={AMB} strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {art === 'done' && (
        <>
          <circle cx="100" cy="66" r="40" fill={GS} />
          <circle cx="100" cy="66" r="30" fill={G} />
          <path d="M85 67l11 11 20-23" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M150 34l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill={AMB} />
          <path d="M48 96l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={AMB} opacity=".8" />
        </>
      )}
      {art === 'files' && (
        <>
          <Paper x={50} y={40} w={56} h={70} rot={-8} />
          <Paper x={84} y={30} w={56} h={70} rot={6} />
          <rect x="96" y="48" width="32" height="6" rx="3" fill={LINE} />
          <rect x="96" y="62" width="24" height="6" rx="3" fill={LINE} />
          <circle cx="140" cy="96" r="16" fill={G} />
          <path d="M140 104V90m-7 6l7-7 7 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}
