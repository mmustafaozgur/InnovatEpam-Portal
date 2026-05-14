import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StageAdvanceForm } from '../StageAdvanceForm'
import type { IdeaDetailResponse } from '@/types/ideas'

vi.mock('@/api/ideas', () => ({
  advanceStage: vi.fn(),
}))

import { advanceStage } from '@/api/ideas'

const mockIdea: IdeaDetailResponse = {
  id: 'idea-1',
  title: 'Test Idea',
  description: 'A test idea',
  category: 'technology',
  submitter_id: 'user-1',
  submitter_name: 'Alice',
  submitted_at: '2026-01-01T00:00:00Z',
  attachments: [],
  current_stage: 'initial_screening',
  assigned_admin_id: 'admin-1',
  assigned_admin_name: 'Admin One',
  stage_reviews: [],
  extra_data: null,
}

describe('StageAdvanceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a comment textarea', () => {
    render(<StageAdvanceForm ideaId="idea-1" nextStage="technical_review" onSuccess={() => {}} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('enforces max 1000 chars on comment textarea', () => {
    render(<StageAdvanceForm ideaId="idea-1" nextStage="technical_review" onSuccess={() => {}} />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('maxLength', '1000')
  })

  it('does NOT show outcome radio group for non-final stages', () => {
    const stages = ['initial_screening', 'technical_review', 'business_impact_assessment'] as const
    stages.forEach(stage => {
      const { unmount } = render(<StageAdvanceForm ideaId="idea-1" nextStage={stage} onSuccess={() => {}} />)
      expect(screen.queryByRole('radio')).not.toBeInTheDocument()
      unmount()
    })
  })

  it('shows outcome radio group when nextStage is final_selection', () => {
    render(<StageAdvanceForm ideaId="idea-1" nextStage="final_selection" onSuccess={() => {}} />)
    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBeGreaterThanOrEqual(2)
  })

  it('outcome radio group has "accepted" and "rejected" options', () => {
    render(<StageAdvanceForm ideaId="idea-1" nextStage="final_selection" onSuccess={() => {}} />)
    expect(screen.getByRole('radio', { name: /accept/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /reject/i })).toBeInTheDocument()
  })

  it('has a submit button', () => {
    render(<StageAdvanceForm ideaId="idea-1" nextStage="technical_review" onSuccess={() => {}} />)
    expect(screen.getByRole('button', { name: /advance|submit/i })).toBeInTheDocument()
  })

  it('calls advanceStage with ideaId, comment, and no outcome for non-final stage', async () => {
    const onSuccess = vi.fn()
    const updatedIdea = { ...mockIdea, current_stage: 'technical_review' as const }
    vi.mocked(advanceStage).mockResolvedValueOnce(updatedIdea)

    render(<StageAdvanceForm ideaId="idea-1" nextStage="technical_review" onSuccess={onSuccess} />)
    await userEvent.type(screen.getByRole('textbox'), 'Looks good')
    await userEvent.click(screen.getByRole('button', { name: /advance|submit/i }))

    await waitFor(() => {
      expect(advanceStage).toHaveBeenCalledWith('idea-1', { comment: 'Looks good' })
    })
    expect(onSuccess).toHaveBeenCalledWith(updatedIdea)
  })

  it('calls advanceStage with outcome when advancing to final_selection', async () => {
    const onSuccess = vi.fn()
    const updatedIdea = { ...mockIdea, current_stage: 'final_selection' as const }
    vi.mocked(advanceStage).mockResolvedValueOnce(updatedIdea)

    render(<StageAdvanceForm ideaId="idea-1" nextStage="final_selection" onSuccess={onSuccess} />)
    await userEvent.click(screen.getByRole('radio', { name: /accept/i }))
    await userEvent.click(screen.getByRole('button', { name: /advance|submit/i }))

    await waitFor(() => {
      expect(advanceStage).toHaveBeenCalledWith('idea-1', expect.objectContaining({ outcome: 'accepted' }))
    })
  })
})
