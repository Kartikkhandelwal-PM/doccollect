import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { APP_NAME } from '../lib/brand'
import './splash.css'

const SHOW_FOR = 3600 // how long the whole animation plays
const FADE = 600 // how long it takes to disappear

// Three documents, three directions. [x, y of the sheet, where it starts from, its start tilt, its final tilt, delay, tag colour, tag text]
const sheets = [
  { x: 44, y: 44, fx: '-190px', fy: '-120px', fr: '-50deg', r: '-9deg', delay: '650ms', tag: '#D92D20', label: 'PDF', widths: [44, 36, 40] },
  { x: 90, y: 34, fx: '10px', fy: '-210px', fr: '14deg', r: '0deg', delay: '850ms', tag: '#12A150', label: 'XLS', widths: [46, 40, 34] },
  { x: 136, y: 46, fx: '200px', fy: '-110px', fr: '52deg', r: '9deg', delay: '1050ms', tag: '#2563EB', label: 'IMG', widths: [42, 34, 44] },
]

// Tiny drifting documents in the background. Fixed values, so it looks the same every time.
const bits = [
  { l: 8, w: 9, h: 12, c: '#0B7A6B', op: 0.28, dur: '9s', delay: '0.6s', rot: '40deg' },
  { l: 17, w: 7, h: 9, c: '#2563EB', op: 0.22, dur: '11s', delay: '2.1s', rot: '-30deg' },
  { l: 26, w: 10, h: 13, c: '#F59E0B', op: 0.25, dur: '10s', delay: '1.2s', rot: '55deg' },
  { l: 35, w: 6, h: 8, c: '#0B7A6B', op: 0.3, dur: '8s', delay: '3.2s', rot: '-45deg' },
  { l: 44, w: 8, h: 11, c: '#7C3AED', op: 0.2, dur: '12s', delay: '0.9s', rot: '30deg' },
  { l: 53, w: 9, h: 12, c: '#0B7A6B', op: 0.26, dur: '9.5s', delay: '2.6s', rot: '-60deg' },
  { l: 62, w: 7, h: 9, c: '#F59E0B', op: 0.24, dur: '10.5s', delay: '1.6s', rot: '45deg' },
  { l: 71, w: 10, h: 13, c: '#2563EB', op: 0.2, dur: '11.5s', delay: '0.3s', rot: '-35deg' },
  { l: 80, w: 6, h: 8, c: '#0B7A6B', op: 0.3, dur: '8.5s', delay: '2.9s', rot: '50deg' },
  { l: 88, w: 9, h: 12, c: '#7C3AED', op: 0.18, dur: '12.5s', delay: '1.9s', rot: '-25deg' },
  { l: 13, w: 6, h: 8, c: '#F59E0B', op: 0.22, dur: '10s', delay: '4.2s', rot: '35deg' },
  { l: 58, w: 7, h: 10, c: '#2563EB', op: 0.2, dur: '9s', delay: '3.8s', rot: '-50deg' },
]

type Vars = CSSProperties & Record<`--${string}`, string | number>

// Shown once when the app opens. A click or any key skips it.
export default function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => setLeaving(true), calm ? 900 : SHOW_FOR)
    const skip = () => setLeaving(true)
    window.addEventListener('keydown', skip)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', skip)
    }
  }, [])

  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(onDone, FADE)
    return () => clearTimeout(t)
  }, [leaving, onDone])

  return (
    <div className={`sp ${leaving ? 'sp-leave' : ''}`} onClick={() => setLeaving(true)} role="status" aria-label={`Opening ${APP_NAME}`}>
      <div className="sp-grid" />
      <div className="sp-glow" />
      <div className="sp-glow b" />
      <div className="sp-bits">
      {bits.map((b, i) => (
        <span key={i} className="sp-bit" style={{ left: `${b.l}%`, width: b.w, height: b.h, background: b.c, '--op': b.op, '--dur': b.dur, '--delay': b.delay, '--rot': b.rot } as Vars} />
      ))}
      </div>
      <span className="sp-ring" style={{ '--delay': '1500ms' } as Vars} />
      <span className="sp-ring" style={{ '--delay': '1750ms' } as Vars} />

      <div className="sp-center">
      <div className="sp-stage">
        <svg className="sp-art" viewBox="0 0 240 200" aria-hidden="true">
          <defs>
            <linearGradient id="spBack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0C6F61" />
              <stop offset="1" stopColor="#075E52" />
            </linearGradient>
            <linearGradient id="spFront" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#17A892" />
              <stop offset="1" stopColor="#0B7A6B" />
            </linearGradient>
            <filter id="spSoft" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0E1B2C" floodOpacity="0.18" />
            </filter>
          </defs>

          <ellipse className="sp-shadow" cx="120" cy="188" rx="86" ry="8" fill="rgba(7,94,82,0.2)" />

          <g className="sp-folder">
            <path fill="url(#spBack)" d="M32 46H80Q85 46 88 50L97 61H208Q220 61 220 73V160Q220 172 208 172H32Q20 172 20 160V58Q20 46 32 46Z" />

            {sheets.map((s) => (
              <g key={s.label} className="sp-sheet" style={{ '--fx': s.fx, '--fy': s.fy, '--fr': s.fr, '--r': s.r, '--delay': s.delay } as Vars} filter="url(#spSoft)">
                <rect x={s.x} y={s.y} width="62" height="84" rx="7" fill="#fff" />
                <rect x={s.x + 8} y={s.y + 9} width="22" height="10" rx="3" fill={s.tag} />
                <text x={s.x + 19} y={s.y + 17} textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#fff" fontFamily="Instrument Sans, sans-serif">
                  {s.label}
                </text>
                {s.widths.map((w, i) => (
                  <rect key={i} x={s.x + 8} y={s.y + 27 + i * 10} width={w} height="4.5" rx="2.25" fill="#E3E8EF" />
                ))}
              </g>
            ))}

            <g className="sp-front">
              <path fill="url(#spFront)" d="M20 100Q20 88 32 88H208Q220 88 220 100V160Q220 172 208 172H32Q20 172 20 160Z" />
              <path d="M32 89.5H208" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M34 164H206" stroke="rgba(7,94,82,0.35)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </g>

            <g className="sp-badge">
              <circle cx="206" cy="92" r="21" fill="#fff" filter="url(#spSoft)" />
              <circle className="sp-draw" cx="206" cy="92" r="16" fill="#12A150" style={{ '--len': 101, '--delay': '1650ms', '--time': '900ms' } as Vars} stroke="#0C7A3E" strokeWidth="0" />
              <path className="sp-draw" d="M198.5 92.5l5.5 5.5l10.5-11.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ '--len': 30, '--delay': '2050ms', '--time': '450ms' } as Vars} />
            </g>
          </g>
        </svg>

        <div className="sp-name" aria-label={APP_NAME}>
          {APP_NAME.split('').map((ch, i) => (
            <span key={i} className={i >= 3 ? 'accent' : ''} style={{ '--i': i } as Vars}>
              {ch}
            </span>
          ))}
        </div>
        <div className="sp-line" />
        <p className="sp-tag">Collect documents, without the chasing.</p>
      </div>
      </div>

      <div className="sp-bottom">
      <div className="sp-load">
        <div className="sp-track">
          <div className="sp-fill" />
        </div>
        <div className="sp-status">
          <span className="one">Getting your documents ready</span>
          <span className="two">Almost there</span>
        </div>
      </div>
      <div className="sp-foot">A KDK SOFTWARE PRODUCT</div>
      </div>
    </div>
  )
}
