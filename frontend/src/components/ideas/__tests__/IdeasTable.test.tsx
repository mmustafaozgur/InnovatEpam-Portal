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
    evaluation_status: 'submitted',
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
    // "0" should not appear as a badge — it would be confusing
    const badges = screen.queryAllByText('0')
    expect(badges).toHaveLength(0)
  })

  it('does not reference has_attachment field in rendered output', () => {
    renderTable([makeIdea({ attachment_count: 2 })])
    // has_attachment is the old boolean field — should not appear anywhere
    expect(screen.queryByText(/has_attachment/i)).not.toBeInTheDocument()
  })
})
