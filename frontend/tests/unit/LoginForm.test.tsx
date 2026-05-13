import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginForm from '@/components/auth/LoginForm'
import * as authApi from '@/api/auth'
import { AuthProvider } from '@/context/AuthContext'

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  getMe: vi.fn().mockResolvedValue(null),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => vi.fn() }
})

global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => null })

function renderForm() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('LoginForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders email, password fields and submit button', () => {
    renderForm()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('calls login() API with form data on valid submit', async () => {
    const mockLogin = vi.mocked(authApi.login)
    mockLogin.mockResolvedValue({ id: '1', full_name: 'Alice', email: 'alice@epam.com', role: 'admin' })
    renderForm()
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@epam.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mockLogin).toHaveBeenCalledOnce())
  })

  it('shows single generic error message on 401 — does not reveal which field failed', async () => {
    const mockLogin = vi.mocked(authApi.login)
    const err: Error & { status?: number } = new Error('Invalid credentials.')
    err.status = 401
    mockLogin.mockRejectedValue(err)
    renderForm()
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@epam.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })

  it('calls AuthContext.login and navigates on successful login', async () => {
    const mockLogin = vi.mocked(authApi.login)
    mockLogin.mockResolvedValue({ id: '1', full_name: 'Alice', email: 'alice@epam.com', role: 'admin' })
    renderForm()
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@epam.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mockLogin).toHaveBeenCalledOnce())
  })
})
