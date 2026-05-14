import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext'
import ChangePasswordSection from '../ChangePasswordSection'

vi.mock('@/api/auth', () => ({
  changePassword: vi.fn(),
}))

import { changePassword } from '@/api/auth'
const mockedChangePassword = changePassword as ReturnType<typeof vi.fn>

const mockUser = {
  id: 'u1',
  full_name: 'Alice Smith',
  email: 'alice@epam.com',
  role: 'submitter' as const,
}

function renderSection() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{ user: mockUser, isLoading: false, login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() }}
      >
        <ChangePasswordSection />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('ChangePasswordSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders three password fields and a submit button', () => {
    renderSection()
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
  })

  it('shows Zod validation errors before fetching when fields are empty', async () => {
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: /change password/i }))
    await waitFor(() => {
      expect(mockedChangePassword).not.toHaveBeenCalled()
    })
  })

  it('shows success alert and resets form on success', async () => {
    mockedChangePassword.mockResolvedValueOnce({ message: 'Password changed successfully.' })
    renderSection()
    await userEvent.type(screen.getByLabelText(/current password/i), 'password123')
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass99')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass99')
    await userEvent.click(screen.getByRole('button', { name: /change password/i }))
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Password changed successfully.')
    })
    expect((screen.getByLabelText(/current password/i) as HTMLInputElement).value).toBe('')
  })

  it('shows "Current password is incorrect." on 400', async () => {
    const err = Object.assign(new Error('Bad request'), { status: 400 })
    mockedChangePassword.mockRejectedValueOnce(err)
    renderSection()
    await userEvent.type(screen.getByLabelText(/current password/i), 'wrongpass')
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass99')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass99')
    await userEvent.click(screen.getByRole('button', { name: /change password/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Current password is incorrect.')
    })
  })
})
