import { render, screen } from '@testing-library/react'
import { CharacterCounter } from '../CharacterCounter'

describe('CharacterCounter', () => {
  it('displays current / max format', () => {
    render(<CharacterCounter current={50} max={150} />)
    expect(screen.getByText('50 / 150')).toBeInTheDocument()
  })

  it('is in normal (muted) state when remaining > 10%', () => {
    const { container } = render(<CharacterCounter current={50} max={150} />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('text-slate-400')
    expect(el.className).not.toContain('text-red-500')
  })

  it('is in warning (red) state when remaining <= 10% of max', () => {
    // 150 * 0.1 = 15 remaining threshold; current=136 → remaining=14 → warning
    const { container } = render(<CharacterCounter current={136} max={150} />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('text-red-500')
  })

  it('is in warning state at exactly 10% remaining', () => {
    // remaining == floor(150 * 0.1) == 15 → isWarning
    const { container } = render(<CharacterCounter current={135} max={150} />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('text-red-500')
  })
})
