import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PrivacyPolicyModal } from '../PrivacyPolicyModal'

describe('PrivacyPolicyModal', () => {
  it('renders heading "Privacy Policy"', () => {
    render(<PrivacyPolicyModal open onClose={vi.fn()} />)
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })

  it('renders policy section headings and body text', () => {
    render(<PrivacyPolicyModal open onClose={vi.fn()} />)
    expect(screen.getByText('Compliance')).toBeInTheDocument()
    expect(screen.getByText('Information Security')).toBeInTheDocument()
  })

  it('clicking Close button fires onClose', async () => {
    const onClose = vi.fn()
    render(<PrivacyPolicyModal open onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('pressing Esc fires onClose', async () => {
    const onClose = vi.fn()
    render(<PrivacyPolicyModal open onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not render when open is false', () => {
    render(<PrivacyPolicyModal open={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Privacy Policy')).not.toBeInTheDocument()
  })
})
