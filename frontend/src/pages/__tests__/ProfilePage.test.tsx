import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext'
import ProfilePage from '../ProfilePage'

vi.mock('@/components/profile/AccountInfoSection', () => ({
  default: () => <div data-testid="account-info-section">AccountInfoSection</div>,
}))

vi.mock('@/components/profile/ChangePasswordSection', () => ({
  default: () => <div data-testid="change-password-section">ChangePasswordSection</div>,
}))

const mockUser = {
  id: 'u1',
  full_name: 'Alice Smith',
  email: 'alice@epam.com',
  role: 'submitter' as const,
}

function renderProfilePage(user = mockUser) {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <AuthContext.Provider
        value={{ user, isLoading: false, login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() }}
      >
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

function renderUnauthenticated() {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <AuthContext.Provider
        value={{ user: null, isLoading: false, login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() }}
      >
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('ProfilePage', () => {
  it('renders AccountInfoSection', () => {
    renderProfilePage()
    expect(screen.getByTestId('account-info-section')).toBeInTheDocument()
  })

  it('renders ChangePasswordSection', () => {
    renderProfilePage()
    expect(screen.getByTestId('change-password-section')).toBeInTheDocument()
  })

  it('renders the My Profile heading', () => {
    renderProfilePage()
    expect(screen.getByRole('heading', { name: /my profile/i })).toBeInTheDocument()
  })
})
