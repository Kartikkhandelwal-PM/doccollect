// A row that opens something. On hover it takes a clear green tint and a bar at its left edge, so it reads as clickable (a faint grey did not).
// For a div or a link:
export const rowHover = 'cursor-pointer transition-[background-color,box-shadow] hover:bg-[#EAF5F0] hover:shadow-[inset_3px_0_0_#0B7A6B]'
// For a table row (a <tr> cannot take a shadow in a collapsed table, so the bar goes on its first cell):
export const trHover = 'cursor-pointer transition-colors hover:bg-[#EAF5F0] [&:hover>td:first-child]:shadow-[inset_3px_0_0_#0B7A6B]'

// A whole row that opens something also has to open from the keyboard: it can be reached with Tab and opened with Enter or Space,
// and it shows where the focus is.
export const rowKeys = (open: () => void) => ({
  tabIndex: 0,
  onKeyDown: (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return // a button or link inside the row keeps its own keys
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  },
})
export const rowFocus = 'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand'
