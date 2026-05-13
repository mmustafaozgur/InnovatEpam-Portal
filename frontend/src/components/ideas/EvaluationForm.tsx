import { useState } from 'react'
import type { EvaluateIdeaRequest, EvaluationStatus, IdeaDetailResponse } from '@/types/ideas'
import { CharacterCounter } from './CharacterCounter'

interface EvaluationFormProps {
  idea: IdeaDetailResponse
  onSubmit: (payload: EvaluateIdeaRequest) => void
}

export function EvaluationForm({ idea, onSubmit }: EvaluationFormProps) {
  const isStateA = idea.evaluation.status === 'submitted'
  const [comment, setComment] = useState(idea.evaluation.comment ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const status: EvaluationStatus = isStateA ? 'under_review' : idea.evaluation.status
    onSubmit({ status, comment: comment || undefined })
  }

  return (
    <div className="mt-10 pt-6 border-t border-border">
      <p className="text-sm font-semibold text-slate-700 mb-4">Evaluation</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
          <select
            value={isStateA ? 'under_review' : idea.evaluation.status}
            disabled={!isStateA}
            className={
              isStateA
                ? 'w-full px-4 py-2 border border-border rounded-lg text-sm transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                : 'w-full px-4 py-2 border border-border rounded-lg text-sm bg-slate-50 text-slate-400 cursor-not-allowed'
            }
          >
            {isStateA ? (
              <option value="under_review">Under Review</option>
            ) : (
              <>
                <option value="under_review">Under Review</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">
            Comment <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full px-4 py-3 border border-border rounded-lg text-sm resize-none
                       focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                       transition-colors duration-200"
          />
          <CharacterCounter current={comment.length} max={1000} />
        </div>

        <button
          type="submit"
          className="self-start bg-cta text-white px-6 py-2 rounded-lg font-semibold text-sm
                     hover:opacity-90 hover:-translate-y-px transition-all duration-200 cursor-pointer"
        >
          Save Evaluation
        </button>
      </form>
    </div>
  )
}
