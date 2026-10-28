import type { ReactNode } from 'react'
import Illustration from './Illustration'
import type { Art } from './Illustration'

// What a place shows when there is nothing in it yet: a picture, what this place is for, what to do first, and the button for it.
// (A search or a filter that finds nothing says so and offers "Clear filters", with the "search" picture.)
export default function EmptyState({ art, title, text, children, compact, align = 'center' }: { art: Art; title: string; text: string; children?: ReactNode; compact?: boolean; align?: 'center' | 'left' }) {
  const left = align === 'left'
  return (
    <div className={`flex flex-col ${left ? 'items-start text-left' : 'items-center text-center'} ${compact ? 'px-6 py-8' : 'px-6 py-14'}`}>
      <Illustration art={art} className={compact ? 'h-28 w-40' : 'h-36 w-52'} />
      <h2 className="mt-3 text-[17px] font-bold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{text}</p>
      {children && <div className={`mt-5 flex flex-wrap items-center gap-3 ${left ? '' : 'justify-center'}`}>{children}</div>}
    </div>
  )
}
