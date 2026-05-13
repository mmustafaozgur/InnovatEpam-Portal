import { render, screen } from '@testing-library/react'
import { EvaluationStatusBadge } from '../EvaluationStatusBadge'

describe('EvaluationStatusBadge', () => {
  it('renders "Submitted" for status submitted', () => {
    render(<EvaluationStatusBadge status="submitted" />)
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('renders "Under Review" for status under_review', () => {
    render(<EvaluationStatusBadge status="under_review" />)
    expect(screen.getByText('Under Review')).toBeInTheDocument()
  })

  it('renders "Accepted" for status accepted', () => {
    render(<EvaluationStatusBadge status="accepted" />)
    expect(screen.getByText('Accepted')).toBeInTheDocument()
  })

  it('renders "Rejected" for status rejected', () => {
    render(<EvaluationStatusBadge status="rejected" />)
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })

  it('applies slate color classes for submitted', () => {
    const { container } = render(<EvaluationStatusBadge status="submitted" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('bg-slate-100')
    expect(el.className).toContain('text-slate-600')
  })

  it('applies blue color classes for under_review', () => {
    const { container } = render(<EvaluationStatusBadge status="under_review" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('bg-blue-100')
    expect(el.className).toContain('text-blue-700')
  })

  it('applies green color classes for accepted', () => {
    const { container } = render(<EvaluationStatusBadge status="accepted" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('bg-green-100')
    expect(el.className).toContain('text-green-700')
  })

  it('applies red color classes for rejected', () => {
    const { container } = render(<EvaluationStatusBadge status="rejected" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('bg-red-100')
    expect(el.className).toContain('text-red-700')
  })
})
