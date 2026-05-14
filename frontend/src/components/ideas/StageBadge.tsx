import type { Stage, Outcome } from '@/types/ideas'

interface StageBadgeProps {
  stage: Stage
  outcome?: Outcome | null
}

const STAGE_LABEL: Record<Stage, string> = {
  new_idea: 'New Idea',
  initial_screening: 'Initial Screening',
  technical_review: 'Technical Review',
  business_impact_assessment: 'Business Impact Assessment',
  final_selection: 'Final Selection',
}

function resolveClasses(stage: Stage, outcome?: Outcome | null): string {
  if (stage === 'final_selection') {
    if (outcome === 'accepted') return 'bg-green-100 text-green-700'
    if (outcome === 'rejected') return 'bg-red-100 text-red-700'
    return 'bg-amber-100 text-amber-700'
  }
  if (stage === 'new_idea') return 'bg-slate-100 text-slate-600'
  if (stage === 'initial_screening' || stage === 'technical_review') return 'bg-blue-100 text-blue-700'
  // business_impact_assessment
  return 'bg-blue-600/10 text-blue-800'
}

export function StageBadge({ stage, outcome }: StageBadgeProps) {
  const classes = resolveClasses(stage, outcome)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-150 ${classes}`}>
      {STAGE_LABEL[stage]}
    </span>
  )
}
