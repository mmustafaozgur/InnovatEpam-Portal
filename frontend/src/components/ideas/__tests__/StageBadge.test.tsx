import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StageBadge } from '../StageBadge'
import type { Stage, Outcome } from '@/types/ideas'

const STAGE_LABELS: Record<Stage, string> = {
  new_idea: 'New Idea',
  initial_screening: 'Initial Screening',
  technical_review: 'Technical Review',
  business_impact_assessment: 'Business Impact Assessment',
  final_selection: 'Final Selection',
}

describe('StageBadge', () => {
  it.each(Object.entries(STAGE_LABELS) as [Stage, string][])(
    'renders label "%s" for stage %s',
    (stage, label) => {
      render(<StageBadge stage={stage} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  )

  it('applies slate classes for new_idea', () => {
    const { container } = render(<StageBadge stage="new_idea" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toMatch(/slate/)
  })

  it('applies blue classes for initial_screening', () => {
    const { container } = render(<StageBadge stage="initial_screening" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toMatch(/blue/)
  })

  it('applies blue classes for technical_review', () => {
    const { container } = render(<StageBadge stage="technical_review" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toMatch(/blue/)
  })

  it('applies primary/indigo classes for business_impact_assessment', () => {
    const { container } = render(<StageBadge stage="business_impact_assessment" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toMatch(/blue|indigo|primary/)
  })

  it('applies amber classes for final_selection without outcome', () => {
    const { container } = render(<StageBadge stage="final_selection" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toMatch(/amber/)
  })

  it('applies green classes for final_selection with outcome=accepted', () => {
    const { container } = render(<StageBadge stage="final_selection" outcome="accepted" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toMatch(/green/)
  })

  it('applies red classes for final_selection with outcome=rejected', () => {
    const { container } = render(<StageBadge stage="final_selection" outcome="rejected" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toMatch(/red/)
  })

  it('renders as an inline span element', () => {
    const { container } = render(<StageBadge stage="new_idea" />)
    expect(container.firstChild?.nodeName).toBe('SPAN')
  })

  it('accepts optional outcome prop without error for non-final stages', () => {
    expect(() =>
      render(<StageBadge stage="initial_screening" outcome={null} />)
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// T034a — StageBadge: smooth color transition classes
// ---------------------------------------------------------------------------

describe('StageBadge — transition classes (T034a)', () => {
  it('badge has transition-colors class', () => {
    const { container } = render(<StageBadge stage="new_idea" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('transition-colors')
  })

  it('badge has duration-150 class', () => {
    const { container } = render(<StageBadge stage="new_idea" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('duration-150')
  })
})
