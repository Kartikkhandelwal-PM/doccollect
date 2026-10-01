import type { Service, Status } from '../data/types'

export const statusMeta: Record<Status, { label: string; className: string }> = {
  to_review: { label: 'To review', className: 'bg-warn-soft text-warn' },
  awaiting: { label: 'Awaiting client', className: 'bg-info-soft text-info' },
  overdue: { label: 'Overdue', className: 'bg-danger-soft text-danger' },
  approved: { label: 'Approved', className: 'bg-ok-soft text-ok' },
  rejected: { label: 'Rejected', className: 'bg-danger-soft text-danger' },
  pending: { label: 'Pending', className: 'bg-canvas text-muted' },
  unassigned: { label: 'Unassigned', className: 'bg-canvas text-muted' },
  na: { label: 'Not applicable', className: 'bg-canvas text-muted' },
}

export const serviceColor: Record<Service, string> = {
  GST: 'text-info',
  TDS: 'text-amber-700',
  ITR: 'text-violet-700',
}

// Statuses a CA can move a document to from the table.
export const changeableStatuses: Status[] = ['to_review', 'approved', 'rejected', 'awaiting']
