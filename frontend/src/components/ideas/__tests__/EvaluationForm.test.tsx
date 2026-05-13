import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { EvaluationForm } from '../EvaluationForm'
import type { IdeaDetailResponse } from '@/types/ideas'

function makeIdea(overrides: Partial<IdeaDetailResponse> = {}): IdeaDetailResponse {
  return {
    id: 'idea-1',
    title: 'Test Idea',
    description: 'A description',
    category: 'technology',
    submitter_id: 'u1',
    submitter_name: 'Alice',
    submitted_at: '2026-05-13T10:00:00Z',
    file: null,
    evaluation: {
      status: 'submitted',
      comment: null,
      evaluated_at: null,
      assigned_admin_id: null,
    },
    ...overrides,
  }
}

describe('EvaluationForm — State A (submitted)', () => {
  it('renders the form when idea is submitted', () => {
    render(<EvaluationForm idea={makeIdea()} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /save evaluation/i })).toBeInTheDocument()
  })

  it('State A: status select shows Under Review pre-selected', () => {
    render(<EvaluationForm idea={makeIdea()} onSubmit={vi.fn()} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('under_review')
  })

  it('State A: only Under Review option is available', () => {
    render(<EvaluationForm idea={makeIdea()} onSubmit={vi.fn()} />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveValue('under_review')
  })

  it('State A: submitting fires onSubmit with status under_review', () => {
    const onSubmit = vi.fn()
    render(<EvaluationForm idea={makeIdea()} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /save evaluation/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'under_review' })
    )
  })

  it('1000-char counter shows 0 / 1000 initially', () => {
    render(<EvaluationForm idea={makeIdea()} onSubmit={vi.fn()} />)
    expect(screen.getByText('0 / 1000')).toBeInTheDocument()
  })

  it('counter decrements as user types in textarea', () => {
    render(<EvaluationForm idea={makeIdea()} onSubmit={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'hello' } })
    expect(screen.getByText('5 / 1000')).toBeInTheDocument()
  })
})

describe('EvaluationForm — State B (under_review)', () => {
  const underReviewIdea = makeIdea({
    evaluation: {
      status: 'under_review',
      comment: 'Current comment',
      evaluated_at: '2026-05-13T10:00:00Z',
      assigned_admin_id: 'admin1',
    },
  })

  it('State B: status select is disabled', () => {
    render(<EvaluationForm idea={underReviewIdea} onSubmit={vi.fn()} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select).toBeDisabled()
  })

  it('State B: comment textarea is enabled', () => {
    render(<EvaluationForm idea={underReviewIdea} onSubmit={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).not.toBeDisabled()
  })

  it('State B: submitting fires onSubmit with status under_review', () => {
    const onSubmit = vi.fn()
    render(<EvaluationForm idea={underReviewIdea} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /save evaluation/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'under_review' })
    )
  })

  it('State B: counter shows current comment length', () => {
    render(<EvaluationForm idea={underReviewIdea} onSubmit={vi.fn()} />)
    expect(screen.getByText('15 / 1000')).toBeInTheDocument()
  })
})
