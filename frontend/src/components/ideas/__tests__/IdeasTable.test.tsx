import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { IdeasTable } from '../IdeasTable'
import type { IdeaSummaryResponse } from '@/types/ideas'

function makeIdea(overrides: Partial<IdeaSummaryResponse> = {}): IdeaSummaryResponse {
  return {
    id: 'i1',
    title: 'Test Idea',
    category: 'technology',
    submitter_name: 'Alice',
    submitted_at: '2026-05-13T10:00:00Z',
    attachment_count: 0,
    current_stage: 'new_idea',
    reviewer_name: null,
    extra_data: null,
    ...overrides,
  }
}

function renderTable(ideas: IdeaSummaryResponse[]) {
  return render(
    <MemoryRouter>
      <IdeasTable ideas={ideas} />
    </MemoryRouter>
  )
}

describe('IdeasTable', () => {
  it('renders idea title as a link', () => {
    renderTable([makeIdea()])
    expect(screen.getByRole('link', { name: 'Test Idea' })).toBeInTheDocument()
  })

  it('shows attachment count badge when attachment_count > 0', () => {
    renderTable([makeIdea({ attachment_count: 3 })])
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('does NOT show attachment badge when attachment_count is 0', () => {
    renderTable([makeIdea({ attachment_count: 0 })])
    const badges = screen.queryAllByText('0')
    expect(badges).toHaveLength(0)
  })

  it('renders StageBadge with "New Idea" for new_idea stage', () => {
    renderTable([makeIdea({ current_stage: 'new_idea' })])
    expect(screen.getByText('New Idea')).toBeInTheDocument()
  })

  it('renders StageBadge with "Final Selection" for final_selection stage', () => {
    renderTable([makeIdea({ current_stage: 'final_selection' })])
    expect(screen.getByText('Final Selection')).toBeInTheDocument()
  })

  it('renders reviewer name when present', () => {
    renderTable([makeIdea({ reviewer_name: 'Bob Admin' })])
    expect(screen.getByText('Bob Admin')).toBeInTheDocument()
  })

  it('renders "—" when reviewer_name is null', () => {
    renderTable([makeIdea({ reviewer_name: null })])
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
