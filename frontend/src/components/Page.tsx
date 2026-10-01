import type { ReactNode } from 'react'

interface Props {
  header: ReactNode
  tabs?: ReactNode
  // true when the body holds panes that scroll on their own
  fixed?: boolean
  children: ReactNode
}

// A page whose header stays put. Only the body scrolls (or each pane inside it, when `fixed`).
export default function Page({ header, tabs, fixed, children }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 bg-canvas px-8 pt-6">
        <div className={tabs ? '' : 'border-b border-line pb-4'}>{header}</div>
        {tabs && <div className="mt-4">{tabs}</div>}
      </div>
      <div className={`min-h-0 flex-1 px-8 py-5 ${fixed ? '' : 'overflow-y-auto'}`}>{children}</div>
    </div>
  )
}
