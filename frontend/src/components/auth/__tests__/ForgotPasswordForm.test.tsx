import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ForgotPasswordForm from '../ForgotPasswordForm'

vi.mock('@/api/auth', () => ({
  resetPassword: vi.fn(),
}))

import { resetPassword } from '@/api/auth'
const mockedResetPassword = resetPassword as ReturnType<typeof vi.fn>

function renderForm(onSuccess = vi.fn()) {
  return render(
    <MemoryRouter>
      <ForgotPasswordForm onSuccess={onSuccess} />
    </MemoryRouter>
  )
}

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email, new_password and confirm_password fields plus a submit button', () => {
    renderForm()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
  })

  it('shows Zod validation errors before fetching when fields are empty', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }))
    await waitFor(() => {
      expect(mockedResetPassword).not.toHaveBeenCalled()
    })
  })

  it('calls onSuccess() after a successful reset', async () => {
    mockedResetPassword.mockResolvedValueOnce({ message: 'Password reset successfully.' })
    const onSuccess = vi.fn()
    renderForm(onSuccess)
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@epam.com')
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass99')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass99')
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }))
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('shows "No account found with that email address." on 404', async () => {
    const err = Object.assign(new Error('Not found'), { status: 404 })
    mockedResetPassword.mockRejectedValueOnce(err)
    renderForm()
    await userEvent.type(screen.getByLabelText(/email/i), 'nobody@epam.com')
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass99')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass99')
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No account found with that email address.'
      )
    })
  })
})
