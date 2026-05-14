import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getIdea, evaluateIdea } from '@/api/ideas'
import type { IdeaDetailResponse, EvaluateIdeaRequest } from '@/types/ideas'
import { CategoryBadge } from '@/components/ideas/CategoryBadge'
import { AttachmentsSection } from '@/components/ideas/AttachmentsSection'
import { EvaluationStatusBadge } from '@/components/ideas/EvaluationStatusBadge'
import { EvaluationForm } from '@/components/ideas/EvaluationForm'
import { ExtraDataDetails } from '@/components/ideas/ExtraDataDetails'

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
  // Admin can evaluate when: idea is unassigned (submitted) or they are the assigned admin
  const canEvaluate =
    user?.role === 'admin' &&
    !['accepted', 'rejected'].includes(idea.evaluation.status) &&
    (idea.evaluation.status === 'submitted' || idea.evaluation.assigned_admin_id === user?.id)
  // Show the read-only comment block only when the form (which shows the comment in textarea) is not visible
  const showComment = idea.evaluation.comment !== null && !canEvaluate

  const handleEvaluate = async (payload: EvaluateIdeaRequest) => {
    if (!id) return
    const updated = await evaluateIdea(id, payload)
    setIdea(updated)
  }

  return (
    <div className="px-6 py-8">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="font-heading font-semibold text-2xl text-primary">{idea.title}</h1>
            <EvaluationStatusBadge status={idea.evaluation.status} />
          </div>
          <CategoryBadge category={idea.category} />
          <p className="flex items-center gap-2 text-sm text-slate-400 mt-2">
            <span>{idea.submitter_name}</span>
            <span>·</span>
            <span>{idea.submitted_at.slice(0, 10)}</span>
            <span>·</span>
            <span>Reviewer: {idea.evaluation.assigned_admin_name ?? '—'}</span>
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

        {showComment && (
          <div data-testid="evaluation-comment" className="mt-10 pt-6 border-t border-border">
            <p className="text-sm font-semibold text-slate-700 mb-2">Evaluator's Comment</p>
            <p className="text-sm text-slate-600">{idea.evaluation.comment}</p>
          </div>
        )}

        {canEvaluate && <EvaluationForm idea={idea} onSubmit={handleEvaluate} />}
      </div>
    </div>
  )
}
