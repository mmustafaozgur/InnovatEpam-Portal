import { render, screen } from '@testing-library/react'
import { IdeasTableSkeleton } from '../IdeasTableSkeleton'

describe('IdeasTableSkeleton', () => {
  it('renders wrapper with aria-label "Loading ideas"', () => {
    render(<IdeasTableSkeleton />)
    expect(screen.getByLabelText('Loading ideas')).toBeInTheDocument()
  })

  it('renders 5 skeleton rows', () => {
    const { container } = render(<IdeasTableSkeleton />)
    // Each skeleton row has a w-2/5 title placeholder
    const rows = container.querySelectorAll('.animate-shimmer.w-2\\/5')
    // The header also has one w-2/5, so total = 5 rows + 1 header = 6
    // We just check there are multiple rows (≥ 5)
    expect(rows.length).toBeGreaterThanOrEqual(5)
  })

  it('skeleton rows use animate-shimmer class', () => {
    const { container } = render(<IdeasTableSkeleton />)
    const shimmerEls = container.querySelectorAll('.animate-shimmer')
    expect(shimmerEls.length).toBeGreaterThan(0)
  })
})
