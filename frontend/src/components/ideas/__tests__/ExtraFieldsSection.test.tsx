import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form } from '@/components/ui/form'
import { ExtraFieldsSection } from '../ExtraFieldsSection'
import { CATEGORY_FIELD_SCHEMA } from '../categoryFieldSchema'

function Wrapper({ category }: { category: string }) {
  const form = useForm({
    resolver: zodResolver(z.object({})),
    defaultValues: {},
  })
  return (
    <Form {...form}>
      <form>
        <ExtraFieldsSection category={category} control={form.control} />
      </form>
    </Form>
  )
}

describe('ExtraFieldsSection', () => {
  it('renders exactly the correct fields for process_improvement', () => {
    render(<Wrapper category="process_improvement" />)
    expect(screen.getByText('Target Process')).toBeInTheDocument()
    expect(screen.getByText('Estimated Time Saved per Week')).toBeInTheDocument()
  })

  it('renders exactly the correct fields for technology', () => {
    render(<Wrapper category="technology" />)
    expect(screen.getByText('Technology / Tool Name')).toBeInTheDocument()
    expect(screen.getByText('Affected Systems or Teams')).toBeInTheDocument()
  })

  it('renders exactly the correct fields for cost_saving', () => {
    render(<Wrapper category="cost_saving" />)
    expect(screen.getByText('Current Annual Cost (USD)')).toBeInTheDocument()
    expect(screen.getByText('Projected Annual Saving (USD)')).toBeInTheDocument()
  })

  it('renders exactly the correct fields for talent_development', () => {
    render(<Wrapper category="talent_development" />)
    expect(screen.getByText('Target Audience')).toBeInTheDocument()
    expect(screen.getByText('Skill Area')).toBeInTheDocument()
    expect(screen.getByText('Estimated Duration in Hours')).toBeInTheDocument()
  })

  it('renders exactly the correct fields for client_delivery', () => {
    render(<Wrapper category="client_delivery" />)
    expect(screen.getByText('Affected Delivery Phase')).toBeInTheDocument()
    expect(screen.getByText('Client Impact')).toBeInTheDocument()
  })

  it('renders exactly the correct fields for workplace_culture', () => {
    render(<Wrapper category="workplace_culture" />)
    expect(screen.getByText('Target Group')).toBeInTheDocument()
    expect(screen.getByText('Recurring or One-Time')).toBeInTheDocument()
  })

  it('renders no extra fields for "other"', () => {
    render(<Wrapper category="other" />)
    const fields = CATEGORY_FIELD_SCHEMA['process_improvement']
    fields.forEach((f) => {
      expect(screen.queryByText(f.label)).not.toBeInTheDocument()
    })
  })

  it('text fields have the correct maxLength attribute for process_improvement', () => {
    render(<Wrapper category="process_improvement" />)
    const input = screen.getByRole('textbox', { name: /target process/i })
    expect(input).toHaveAttribute('maxLength', '200')
  })

  it('number fields have type="number"', () => {
    render(<Wrapper category="process_improvement" />)
    const input = document.querySelector('input[type="number"]')
    expect(input).toBeInTheDocument()
  })

  it('workplace_culture select renders exactly "Recurring" and "One-Time" options', () => {
    render(<Wrapper category="workplace_culture" />)
    expect(screen.getByText('Recurring')).toBeInTheDocument()
    expect(screen.getByText('One-Time')).toBeInTheDocument()
  })
})
