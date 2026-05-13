import type { EvaluationStatus } from '@/types/ideas'

const STATUS_CONFIG: Record<EvaluationStatus, { label: string; classes: string }> = {
  submitted:    { label: 'Submitted',    classes: 'bg-slate-100 text-slate-600' },
  under_review: { label: 'Under Review', classes: 'bg-blue-100 text-blue-700' },
  accepted:     { label: 'Accepted',     classes: 'bg-green-100 text-green-700' },
  rejected:     { label: 'Rejected',     classes: 'bg-red-100 text-red-700' },
}

export function EvaluationStatusBadge({ status }: { status: EvaluationStatus }) {
  const { label, classes } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}
