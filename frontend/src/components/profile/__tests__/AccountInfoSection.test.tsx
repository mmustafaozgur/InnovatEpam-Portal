import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext'
import AccountInfoSection from '../AccountInfoSection'

vi.mock('@/api/auth', () => ({
  updateProfile: vi.fn(),
}))

import { updateProfile } from '@/api/auth'
const mockedUpdateProfile = updateProfile as ReturnType<typeof vi.fn>

const mockUser = {
  id: 'u1',
  full_name: 'Alice Smith',
  email: 'alice@epam.com',
  role: 'submitter' as const,
}

const mockUpdateUser = vi.fn()

function renderSection(user = mockUser) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{ user, isLoading: false, login: vi.fn(), logout: vi.fn(), updateUser: mockUpdateUser }}
      >
        <AccountInfoSection />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('AccountInfoSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pre-fills full_name from auth context', () => {
    renderSection()
    expect((screen.getByLabelText(/full name/i) as HTMLInputElement).value).toBe('Alice Smith')
  })

  it('email field is disabled', () => {
    renderSection()
    expect(screen.getByDisplayValue('alice@epam.com')).toBeDisabled()
  })

  it('calls updateUser with response on successful save', async () => {
    const updatedUser = { ...mockUser, full_name: 'Alice Updated' }
    mockedUpdateProfile.mockResolvedValueOnce(updatedUser)
    renderSection()
    const input = screen.getByLabelText(/full name/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'Alice Updated')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(updatedUser)
    })
  })

  it('shows error message on server error', async () => {
    mockedUpdateProfile.mockRejectedValueOnce(new Error('Server error'))
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
