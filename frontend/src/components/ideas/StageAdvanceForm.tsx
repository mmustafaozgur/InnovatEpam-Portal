import { useState } from 'react'
import { advanceStage } from '@/api/ideas'
import type { IdeaDetailResponse, Outcome, Stage } from '@/types/ideas'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'

interface StageAdvanceFormProps {
  ideaId: string
  nextStage: Stage
  onSuccess: (updated: IdeaDetailResponse) => void
}

export function StageAdvanceForm({ ideaId, nextStage, onSuccess }: StageAdvanceFormProps) {
  const [comment, setComment] = useState('')
  const [outcome, setOutcome] = useState<Outcome | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const isFinalSelection = nextStage === 'final_selection'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDialogOpen(true)
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      const body = {
        comment: comment || undefined,
        ...(isFinalSelection && outcome ? { outcome: outcome as Outcome } : {}),
      }
      const updated = await advanceStage(ideaId, body)
      setDialogOpen(false)
      onSuccess(updated)
    } catch (err: unknown) {
      setDialogOpen(false)
      setError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="advance-comment" className="block text-sm font-medium text-gray-700 mb-1">
            Comment (optional)
          </label>
          <textarea
            id="advance-comment"
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200 resize-none"
            placeholder="Add a review comment…"
          />
        </div>

        {isFinalSelection && (
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">Outcome</legend>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="outcome"
                  value="accepted"
                  checked={outcome === 'accepted'}
                  onChange={() => setOutcome('accepted')}
                  className="accent-primary"
                />
                <span className="text-sm text-green-700 font-medium">Accept</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="outcome"
                  value="rejected"
                  checked={outcome === 'rejected'}
                  onChange={() => setOutcome('rejected')}
                  className="accent-primary"
                />
                <span className="text-sm text-red-700 font-medium">Reject</span>
              </label>
            </div>
          </fieldset>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
        >
          {loading ? 'Submitting…' : 'Advance Stage'}
        </button>
      </form>

      <ConfirmationDialog
        open={dialogOpen}
        title="Advance Stage"
        description="Are you sure you want to advance this idea to the next stage? This action cannot be undone."
        confirmLabel="Confirm"
        onConfirm={handleConfirm}
        onCancel={() => setDialogOpen(false)}
        isLoading={loading}
      />
    </>
  )
}
