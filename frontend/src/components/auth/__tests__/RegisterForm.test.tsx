import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import RegisterForm from '../RegisterForm'

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return { ...mod, useNavigate: () => vi.fn() }
})

vi.mock('@/api/auth', () => ({
  register: vi.fn(),
}))

vi.mock('@/components/auth/PrivacyPolicyModal', () => ({
  PrivacyPolicyModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div role="dialog">
        <h2>Privacy Policy</h2>
        <p>Our privacy policy will be published here. Please contact your EPAM administrator for details.</p>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

function renderForm() {
  return render(
    <MemoryRouter>
      <RegisterForm />
    </MemoryRouter>
  )
}

describe('RegisterForm — Privacy Policy modal (T028)', () => {
  it('clicking "Privacy Policy" button opens PrivacyPolicyModal', async () => {
    renderForm()
    const privacyBtn = screen.getByRole('button', { name: /privacy policy/i })
    await userEvent.click(privacyBtn)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument()
      expect(screen.getByText(/contact your EPAM administrator/i)).toBeInTheDocument()
    })
  })

  it('clicking modal Close button dismisses the modal', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /privacy policy/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /^close$/i }))
    await waitFor(() => {
      expect(screen.queryByText(/contact your EPAM administrator/i)).not.toBeInTheDocument()
    })
  })
})
