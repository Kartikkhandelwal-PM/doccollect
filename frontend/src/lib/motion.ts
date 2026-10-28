import type { Transition, Variants } from 'framer-motion'

// One set of timings for the whole app, so everything moves the same way.
export const spring: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }
export const ease: Transition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] }

// A screen arriving.
export const pageIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
}

// A row or card in a list: the first few come in one after another, the rest at once.
// The same object for the same position every time. A row that stays on screen while the page re-renders (a tab is switched, a filter typed) is then not
// told to fade in again; only a row that is really new animates.
const rowCache = new Map<number, { initial: { opacity: number; y: number }; animate: { opacity: number; y: number }; transition: { duration: number; ease: [number, number, number, number]; delay: number } }>()
export const rowIn = (i: number) => {
  const k = Math.min(i, 9)
  let v = rowCache.get(k)
  if (!v) {
    v = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1], delay: k * 0.035 } }
    rowCache.set(k, v)
  }
  return v
}

// A dialog: the dim background fades in, and the box rises a little and settles.
export const backdropProps = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.18 } }
export const panelProps = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: spring,
}
