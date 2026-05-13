import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { StatusFilter } from '../StatusFilter'

describe('StatusFilter', () => {
  it('renders 5 options including All statuses', () => {
    render(<StatusFilter value={undefined} onChange={vi.fn()} />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(5)
    expect(options[0]).toHaveTextContent('All statuses')
  })

  it('renders Submitted, Under Review, Accepted, Rejected options', () => {
    render(<StatusFilter value={undefined} onChange={vi.fn()} />)
    expect(screen.getByRole('option', { name: 'Submitted' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Under Review' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Accepted' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Rejected' })).toBeInTheDocument()
  })

  it('shows empty/all when value is undefined', () => {
    render(<StatusFilter value={undefined} onChange={vi.fn()} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('')
  })

  it('shows selected value when value is provided', () => {
    render(<StatusFilter value="accepted" onChange={vi.fn()} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('accepted')
  })

  it('calls onChange with status string when option selected', () => {
    const onChange = vi.fn()
    render(<StatusFilter value={undefined} onChange={onChange} />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'submitted' } })
    expect(onChange).toHaveBeenCalledWith('submitted')
  })

  it('calls onChange with undefined when All statuses selected', () => {
    const onChange = vi.fn()
    render(<StatusFilter value="submitted" onChange={onChange} />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})
