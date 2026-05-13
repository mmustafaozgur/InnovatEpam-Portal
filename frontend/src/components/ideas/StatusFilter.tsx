import type { EvaluationStatus } from '@/types/ideas'

interface StatusFilterProps {
  value: EvaluationStatus | undefined
  onChange: (value: EvaluationStatus | undefined) => void
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? (e.target.value as EvaluationStatus) : undefined)}
      className="px-3 py-2 border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
    >
      <option value="">All statuses</option>
      <option value="submitted">Submitted</option>
      <option value="under_review">Under Review</option>
      <option value="accepted">Accepted</option>
      <option value="rejected">Rejected</option>
    </select>
  )
}
