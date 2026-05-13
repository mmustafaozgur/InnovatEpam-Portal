import { render, screen } from '@testing-library/react'
import { ExtraDataDetails } from '../ExtraDataDetails'

describe('ExtraDataDetails', () => {
  it('renders "Details" section with correct labels for process_improvement', () => {
    render(
      <ExtraDataDetails
        category="process_improvement"
        extra_data={{ target_process: 'Review onboarding', estimated_time_saved_per_week: 3 }}
      />
    )
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Target Process')).toBeInTheDocument()
    expect(screen.getByText('Review onboarding')).toBeInTheDocument()
    expect(screen.getByText('Estimated Time Saved per Week')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders "Details" section for talent_development', () => {
    render(
      <ExtraDataDetails
        category="talent_development"
        extra_data={{ target_audience: 'All engineers', skill_area: 'Cloud', estimated_duration_hours: 8 }}
      />
    )
    expect(screen.getByText('Target Audience')).toBeInTheDocument()
    expect(screen.getByText('All engineers')).toBeInTheDocument()
    expect(screen.getByText('Skill Area')).toBeInTheDocument()
    expect(screen.getByText('Cloud')).toBeInTheDocument()
  })

  it('renders nothing when extra_data is null', () => {
    const { container } = render(
      <ExtraDataDetails category="process_improvement" extra_data={null} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for "other" category', () => {
    const { container } = render(
      <ExtraDataDetails category="other" extra_data={{ some_key: 'value' }} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when no fields are defined for category', () => {
    const { container } = render(
      <ExtraDataDetails category="unknown_category" extra_data={{ foo: 'bar' }} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('select field shows human-readable label "Recurring" not internal key "recurring"', () => {
    render(
      <ExtraDataDetails
        category="workplace_culture"
        extra_data={{ target_group: 'All staff', recurring_or_one_time: 'recurring' }}
      />
    )
    expect(screen.getByText('Recurring')).toBeInTheDocument()
    expect(screen.queryByText('recurring')).not.toBeInTheDocument()
  })

  it('select field shows human-readable label "One-Time" not internal key "one_time"', () => {
    render(
      <ExtraDataDetails
        category="workplace_culture"
        extra_data={{ target_group: 'All', recurring_or_one_time: 'one_time' }}
      />
    )
    expect(screen.getByText('One-Time')).toBeInTheDocument()
    expect(screen.queryByText('one_time')).not.toBeInTheDocument()
  })

  it('does not emit "Details" heading when extra_data is null', () => {
    render(<ExtraDataDetails category="cost_saving" extra_data={null} />)
    expect(screen.queryByText('Details')).not.toBeInTheDocument()
  })
})
