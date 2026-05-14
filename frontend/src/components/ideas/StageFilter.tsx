import type { Stage } from '@/types/ideas'

interface StageFilterProps {
  value: Stage | undefined
  onChange: (value: Stage | undefined) => void
}

const STAGE_OPTIONS: { value: Stage; label: string }[] = [
  { value: 'new_idea', label: 'New Idea' },
  { value: 'initial_screening', label: 'Initial Screening' },
  { value: 'technical_review', label: 'Technical Review' },
  { value: 'business_impact_assessment', label: 'Business Impact Assessment' },
  { value: 'final_selection', label: 'Final Selection' },
]

export function StageFilter({ value, onChange }: StageFilterProps) {
  return (
    <select
      aria-label="Stage"
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? (e.target.value as Stage) : undefined)}
      className="px-3 py-2 border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
    >
      <option value="">All stages</option>
      {STAGE_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
