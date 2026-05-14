import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getIdea } from '@/api/ideas'
import type { IdeaDetailResponse, Stage } from '@/types/ideas'
import { CategoryBadge } from '@/components/ideas/CategoryBadge'
import { AttachmentsSection } from '@/components/ideas/AttachmentsSection'
import { StageBadge } from '@/components/ideas/StageBadge'
import { StageAdvanceForm } from '@/components/ideas/StageAdvanceForm'
import { StageTimeline } from '@/components/ideas/StageTimeline'
import { ExtraDataDetails } from '@/components/ideas/ExtraDataDetails'

const STAGES: Stage[] = [
  'new_idea',
  'initial_screening',
  'technical_review',
  'business_impact_assessment',
  'final_selection',
]

function nextStageOf(current: Stage): Stage | null {
  const idx = STAGES.indexOf(current)
  return idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1] : null
}

export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [idea, setIdea] = useState<IdeaDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getIdea(id)
      .then(setIdea)
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return <div className="px-6 py-8 text-slate-400 text-sm">Loading…</div>
  }

  if (!idea) {
    return <div className="px-6 py-8 text-slate-500">Idea not found.</div>
  }

  const canDownload = user?.id === idea.submitter_id || user?.role === 'admin'

  const isLocked = idea.current_stage === 'final_selection'
  const isUnassigned = idea.assigned_admin_id === null
  const isAssignedAdmin = user?.role === 'admin' && idea.assigned_admin_id === user?.id

  // Any admin can claim an unassigned idea; only the assigned admin can continue from there
  const canAdvance =
    user?.role === 'admin' &&
    !isLocked &&
    (isUnassigned || isAssignedAdmin)

  const next = canAdvance ? nextStageOf(idea.current_stage) : null

  // FR-009: show timeline to admins and the original submitter
  const canSeeTimeline = user?.role === 'admin' || user?.id === idea.submitter_id

  return (
    <div className="px-6 py-8">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="font-heading font-semibold text-2xl text-primary">{idea.title}</h1>
            <StageBadge
              stage={idea.current_stage}
              outcome={idea.stage_reviews.at(-1)?.outcome ?? null}
            />
          </div>
          <CategoryBadge category={idea.category} />
          <p className="flex items-center gap-2 text-sm text-slate-400 mt-2">
            <span>{idea.submitter_name}</span>
            <span>·</span>
            <span>{idea.submitted_at.slice(0, 10)}</span>
            <span>·</span>
            <span>Reviewer: {idea.assigned_admin_name ?? '—'}</span>
          </p>
        </div>

        <p className="font-body text-base text-slate-700 leading-relaxed max-w-prose mt-6">
          {idea.description}
        </p>

        <ExtraDataDetails category={idea.category} extra_data={idea.extra_data} />

        {idea.attachments.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border">
            <AttachmentsSection
              attachments={idea.attachments}
              ideaId={idea.id}
              canDownload={canDownload}
            />
          </div>
        )}

        {canSeeTimeline && (
          <div className="mt-10 pt-6 border-t border-border">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Review History</h2>
            <StageTimeline stageReviews={idea.stage_reviews} />
          </div>
        )}

        {canAdvance && next && (
          <div className="mt-10 pt-6 border-t border-border">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Advance to {next.replace(/_/g, ' ')}</h2>
            <StageAdvanceForm
              ideaId={idea.id}
              nextStage={next}
              onSuccess={setIdea}
            />
          </div>
        )}
      </div>
    </div>
  )
}
