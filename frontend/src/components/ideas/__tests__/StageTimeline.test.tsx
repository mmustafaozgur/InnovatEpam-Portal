import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StageTimeline } from '../StageTimeline'
import type { StageReviewRecord } from '@/types/ideas'

const reviews: StageReviewRecord[] = [
  {
    id: 'sr1',
    stage: 'initial_screening',
    outcome: null,
    comment: 'Looks promising',
    reviewer_name: 'Admin One',
    reviewed_at: '2026-05-01T09:00:00Z',
  },
  {
    id: 'sr2',
    stage: 'technical_review',
    outcome: null,
    comment: null,
    reviewer_name: 'Admin One',
    reviewed_at: '2026-05-02T10:00:00Z',
  },
  {
    id: 'sr3',
    stage: 'final_selection',
    outcome: 'accepted',
    comment: 'Great work!',
    reviewer_name: 'Admin One',
    reviewed_at: '2026-05-03T11:00:00Z',
  },
]

describe('StageTimeline', () => {
  it('renders a greyed pending "New Idea" entry when stage_reviews is empty', () => {
    render(<StageTimeline stageReviews={[]} />)
    expect(screen.getByText(/new idea/i)).toBeInTheDocument()
  })

  it('marks the empty state entry as pending (greyed out)', () => {
    const { container } = render(<StageTimeline stageReviews={[]} />)
    const entry = container.querySelector('[data-pending]') ?? container.querySelector('.text-slate-400,.text-gray-400,.opacity-50')
    expect(entry).toBeInTheDocument()
  })

  it('renders all stage review entries when provided', () => {
    render(<StageTimeline stageReviews={reviews} />)
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
  })

  it('renders stage name for each entry', () => {
    render(<StageTimeline stageReviews={reviews} />)
    expect(screen.getByText(/initial screening/i)).toBeInTheDocument()
    expect(screen.getByText(/technical review/i)).toBeInTheDocument()
    expect(screen.getByText(/final selection/i)).toBeInTheDocument()
  })

  it('renders reviewer name for each entry', () => {
    render(<StageTimeline stageReviews={reviews} />)
    expect(screen.getAllByText(/Admin One/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders timestamps for each entry', () => {
    render(<StageTimeline stageReviews={reviews} />)
    expect(screen.getByText(/2026-05-01/)).toBeInTheDocument()
    expect(screen.getByText(/2026-05-02/)).toBeInTheDocument()
    expect(screen.getByText(/2026-05-03/)).toBeInTheDocument()
  })

  it('renders comments when present', () => {
    render(<StageTimeline stageReviews={reviews} />)
    expect(screen.getByText('Looks promising')).toBeInTheDocument()
    expect(screen.getByText('Great work!')).toBeInTheDocument()
  })

  it('does not render a comment node when comment is null', () => {
    render(<StageTimeline stageReviews={[reviews[1]]} />)  // technical_review has null comment
    expect(screen.queryByText(/null/)).not.toBeInTheDocument()
  })

  it('renders outcome label when present on final_selection entry', () => {
    render(<StageTimeline stageReviews={[reviews[2]]} />)
    expect(screen.getByText(/accept/i)).toBeInTheDocument()
  })

  it('renders entries in chronological (document) order', () => {
    render(<StageTimeline stageReviews={reviews} />)
    const items = screen.getAllByRole('listitem')
    const texts = items.map(el => el.textContent ?? '')
    const screeningIdx = texts.findIndex(t => /initial screening/i.test(t))
    const finalIdx = texts.findIndex(t => /final selection/i.test(t))
    expect(screeningIdx).toBeLessThan(finalIdx)
  })
})
