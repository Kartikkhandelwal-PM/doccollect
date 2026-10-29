import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// Shows its content whole, shrunk to fit the space it is given (never bigger than it is), so a page is seen in full without scrolling.
export default function FitBox({ children, className = '', max = 1.15 }: { children: ReactNode; className?: string; max?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const fit = () => {
      if (!box.current || !inner.current) return
      const w = inner.current.offsetWidth
      const h = inner.current.offsetHeight
      if (!w || !h) return
      const s = Math.min(max, box.current.clientWidth / w, box.current.clientHeight / h)
      setScale(s)
      setSize({ w: w * s, h: h * s })
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (box.current) ro.observe(box.current)
    if (inner.current) ro.observe(inner.current)
    return () => ro.disconnect()
  }, [children, max])
  return (
    <div ref={box} className={`flex items-center justify-center overflow-hidden ${className}`}>
      <div style={size ? { width: size.w, height: size.h } : undefined}>
        <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 'max-content' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
