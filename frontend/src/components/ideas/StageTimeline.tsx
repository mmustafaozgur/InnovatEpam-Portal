import type { StageReviewRecord } from '@/types/ideas'

const STAGE_LABEL: Record<string, string> = {
  new_idea: 'New Idea',
  initial_screening: 'Initial Screening',
  technical_review: 'Technical Review',
  business_impact_assessment: 'Business Impact Assessment',
  final_selection: 'Final Selection',
}

const OUTCOME_LABEL: Record<string, string> = {
  accepted: 'Accepted',
  rejected: 'Rejected',
}

const OUTCOME_CLASSES: Record<string, string> = {
  accepted: 'text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium',
  rejected: 'text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium',
}

interface StageTimelineProps {
  stageReviews: StageReviewRecord[]
}

export function StageTimeline({ stageReviews }: StageTimelineProps) {
  if (stageReviews.length === 0) {
    return (
      <ol className="space-y-4" aria-label="Stage timeline">
        <li data-pending className="flex gap-3 opacity-50">
          <div className="mt-1 w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-400">New Idea</p>
            <p className="text-xs text-slate-400 mt-0.5">Pending review</p>
          </div>
        </li>
      </ol>
    )
  }

  return (
    <ol className="space-y-4" aria-label="Stage timeline">
      {stageReviews.map(review => (
        <li key={review.id} className="flex gap-3">
          <div className="mt-1 w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-slate-800">
                {STAGE_LABEL[review.stage] ?? review.stage}
              </p>
              {review.outcome && (
                <span className={OUTCOME_CLASSES[review.outcome] ?? 'text-xs font-medium'}>
                  {OUTCOME_LABEL[review.outcome] ?? review.outcome}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {review.reviewer_name ?? 'Unknown reviewer'} · {review.reviewed_at.slice(0, 10)}
            </p>
            {review.comment && (
              <p className="text-sm text-slate-600 mt-1">{review.comment}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
