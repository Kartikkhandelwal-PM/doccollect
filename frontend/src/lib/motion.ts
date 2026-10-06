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
export const rowIn = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: Math.min(i, 9) * 0.035 },
})

// A dialog: the dim background fades in, and the box rises a little and settles.
export const backdropProps = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.18 } }
export const panelProps = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: spring,
}
