import { render, screen, within } from '@testing-library/react'
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
    outcome: null,
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
  // T025: column order assertions
  it('renders column headers in order: Stage, Title, Category, Submitted By, Date, Actions', () => {
    renderTable([makeIdea()])
    const headers = screen.getAllByRole('columnheader').map(h => h.textContent?.trim())
    expect(headers).toEqual(['Stage', 'Title', 'Category', 'Submitted By', 'Date', 'Actions'])
  })

  it('renders a "View" link in the Actions column', () => {
    renderTable([makeIdea()])
    expect(screen.getByRole('link', { name: /view/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/ideas/i1')
  })

  it('title is plain text (not a link itself)', () => {
    renderTable([makeIdea()])
    expect(screen.queryByRole('link', { name: 'Test Idea' })).not.toBeInTheDocument()
    expect(screen.getByText('Test Idea')).toBeInTheDocument()
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

  it('renders submitter name in "Submitted By" column', () => {
    renderTable([makeIdea({ submitter_name: 'Alice' })])
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})
