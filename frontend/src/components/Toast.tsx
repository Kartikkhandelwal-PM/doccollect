import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { spring } from '../lib/motion'

// The small message at the bottom of the screen. It rises in and slips away.
export default function Toast({ message }: { message: string | null }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            role="status"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.16 } }}
            transition={spring}
            className="flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white shadow-xl"
          >
            <Check size={16} className="text-emerald-300" />
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
