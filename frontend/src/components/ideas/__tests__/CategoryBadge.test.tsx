import { render, screen } from '@testing-library/react'
import { CategoryBadge } from '../CategoryBadge'

describe('CategoryBadge', () => {
  it('renders Process Improvement for process_improvement', () => {
    render(<CategoryBadge category="process_improvement" />)
    expect(screen.getByText('Process Improvement')).toBeInTheDocument()
  })

  it('renders Technology for technology', () => {
    render(<CategoryBadge category="technology" />)
    expect(screen.getByText('Technology')).toBeInTheDocument()
  })

  it('renders Cost Saving for cost_saving', () => {
    render(<CategoryBadge category="cost_saving" />)
    expect(screen.getByText('Cost Saving')).toBeInTheDocument()
  })

  it('renders Other for other', () => {
    render(<CategoryBadge category="other" />)
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('falls back to raw value for unknown category', () => {
    render(<CategoryBadge category="some_unknown_value" />)
    expect(screen.getByText('some_unknown_value')).toBeInTheDocument()
  })
})
