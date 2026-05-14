import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StageFilterCards } from '../StageFilterCards'
import type { Stage } from '@/types/ideas'

describe('StageFilterCards', () => {
  it('renders exactly 5 cards', () => {
    render(<StageFilterCards value={[]} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
  })

  it('clicking an unselected card adds it to selection and calls onChange', async () => {
    const onChange = vi.fn()
    render(<StageFilterCards value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /new idea/i }))
    expect(onChange).toHaveBeenCalledWith(['new_idea'])
  })

  it('clicking a selected card removes it from selection', async () => {
    const onChange = vi.fn()
    const value: Stage[] = ['new_idea', 'technical_review']
    render(<StageFilterCards value={value} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /new idea/i }))
    expect(onChange).toHaveBeenCalledWith(['technical_review'])
  })

  it('empty selection: no card has selected (aria-pressed=true) state', () => {
    render(<StageFilterCards value={[]} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    for (const btn of buttons) {
      expect(btn).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('aria-pressed reflects selection state', () => {
    render(<StageFilterCards value={['new_idea']} onChange={vi.fn()} />)
    const newIdeaBtn = screen.getByRole('button', { name: /new idea/i })
    expect(newIdeaBtn).toHaveAttribute('aria-pressed', 'true')

    const techReviewBtn = screen.getByRole('button', { name: /technical review/i })
    expect(techReviewBtn).toHaveAttribute('aria-pressed', 'false')
  })
})
