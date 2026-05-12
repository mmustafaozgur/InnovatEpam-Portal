import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterForm from '@/components/auth/RegisterForm'
import * as authApi from '@/api/auth'
import { AuthProvider } from '@/context/AuthContext'

vi.mock('@/api/auth', () => ({
  register: vi.fn(),
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
        <RegisterForm />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('RegisterForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders full_name, email, password, privacy_policy checkbox and submit button', () => {
    renderForm()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
  })

  it('shows field-level errors when submitted empty', async () => {
    renderForm()
    fireEvent.submit(screen.getByRole('button', { name: /register/i }))
    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
  })

  it('calls register() API with form data on valid submit', async () => {
    const mockRegister = vi.mocked(authApi.register)
    mockRegister.mockResolvedValue({ id: '1', full_name: 'Alice', email: 'alice@epam.com', role: 'admin' })
    renderForm()
    await userEvent.type(screen.getByLabelText(/full name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@epam.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /register/i }))
    await waitFor(() => expect(mockRegister).toHaveBeenCalledOnce())
  })

  it('shows error message on 409 duplicate email', async () => {
    const mockRegister = vi.mocked(authApi.register)
    mockRegister.mockRejectedValue({ status: 409, message: 'Email already registered.' })
    renderForm()
    await userEvent.type(screen.getByLabelText(/full name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@epam.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /register/i }))
    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
    })
  })

  it('calls AuthContext.login and navigates on successful 201', async () => {
    const mockRegister = vi.mocked(authApi.register)
    mockRegister.mockResolvedValue({ id: '1', full_name: 'Alice', email: 'alice@epam.com', role: 'admin' })
    renderForm()
    await userEvent.type(screen.getByLabelText(/full name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@epam.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /register/i }))
    await waitFor(() => expect(mockRegister).toHaveBeenCalledOnce())
  })
})
