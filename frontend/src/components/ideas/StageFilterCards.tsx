import type { Stage } from '@/types/ideas'
import { cn } from '@/lib/utils'

export const STAGE_OPTIONS: ReadonlyArray<{ value: Stage; label: string }> = [
  { value: 'new_idea', label: 'New Idea' },
  { value: 'initial_screening', label: 'Initial Screening' },
  { value: 'technical_review', label: 'Technical Review' },
  { value: 'business_impact_assessment', label: 'Business Impact Assessment' },
  { value: 'final_selection', label: 'Final Selection' },
]

interface StageFilterCardsProps {
  value: Stage[]
  onChange: (stages: Stage[]) => void
}

export function StageFilterCards({ value, onChange }: StageFilterCardsProps) {
  const toggle = (stage: Stage) => {
    if (value.includes(stage)) {
      onChange(value.filter(s => s !== stage))
    } else {
      onChange([...value, stage])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STAGE_OPTIONS.map(({ value: stage, label }) => {
        const selected = value.includes(stage)
        return (
          <button
            key={stage}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(stage)}
            className={cn(
              'min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg border text-sm font-medium transition-colors duration-150 cursor-pointer',
              'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-white text-slate-600 hover:border-primary/40 hover:bg-slate-50'
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
