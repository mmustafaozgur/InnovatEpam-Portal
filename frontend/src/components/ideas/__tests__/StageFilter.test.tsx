import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StageFilter } from '../StageFilter'
import type { Stage } from '@/types/ideas'

const ALL_STAGES: Stage[] = [
  'new_idea',
  'initial_screening',
  'technical_review',
  'business_impact_assessment',
  'final_selection',
]

describe('StageFilter', () => {
  it('renders an "All stages" option', () => {
    render(<StageFilter value={undefined} onChange={() => {}} />)
    expect(screen.getByRole('option', { name: /all stages/i })).toBeInTheDocument()
  })

  it.each(ALL_STAGES)('renders option for stage "%s"', stage => {
    render(<StageFilter value={undefined} onChange={() => {}} />)
    expect(screen.getByRole('option', { name: new RegExp(stage.replace(/_/g, '\\s+'), 'i') })).toBeInTheDocument()
  })

  it('renders all five stage options plus the "All stages" option (total 6)', () => {
    render(<StageFilter value={undefined} onChange={() => {}} />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(6)
  })

  it('calls onChange with Stage value when a stage option is selected', async () => {
    const onChange = vi.fn()
    render(<StageFilter value={undefined} onChange={onChange} />)
    const select = screen.getByRole('combobox')
    await userEvent.selectOptions(select, 'new_idea')
    expect(onChange).toHaveBeenCalledWith('new_idea')
  })

  it('calls onChange with undefined when "All stages" option is selected', async () => {
    const onChange = vi.fn()
    render(<StageFilter value="technical_review" onChange={onChange} />)
    const select = screen.getByRole('combobox')
    await userEvent.selectOptions(select, '')
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('reflects the current value prop as selected', () => {
    render(<StageFilter value="initial_screening" onChange={() => {}} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('initial_screening')
  })

  it('shows empty value when value prop is undefined', () => {
    render(<StageFilter value={undefined} onChange={() => {}} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('')
  })

  it('has an accessible label', () => {
    render(<StageFilter value={undefined} onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: /stage/i })).toBeInTheDocument()
  })
})
