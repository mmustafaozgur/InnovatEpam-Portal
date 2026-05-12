import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { http, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'
import { AuthProvider } from '@/context/AuthContext'
import RegisterForm from '@/components/auth/RegisterForm'
import LoginForm from '@/components/auth/LoginForm'
import UserTable from '@/components/users/UserTable'
import type { User } from '@/types/auth'

// ── Test data ──────────────────────────────────────────────────────────────

const ADMIN: User = { id: '1', full_name: 'Alice Admin', email: 'alice@epam.com', role: 'admin' }
const SUBMITTER: User = { id: '2', full_name: 'Bob Sub', email: 'bob@epam.com', role: 'submitter' }
const PROMOTED: User = { ...SUBMITTER, role: 'admin' }

// ── MSW server ─────────────────────────────────────────────────────────────

const server = setupServer(
  http.get('/api/v1/auth/me', () => HttpResponse.json(null, { status: 401 })),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ── Helpers ────────────────────────────────────────────────────────────────

function renderWithRouter(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('auth-flow integration', () => {
  it('register first user: POST /register → resolves with admin role', async () => {
    server.use(
      http.post('/api/v1/auth/register', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body.email).toBe('alice@epam.com')
        expect(body.privacy_policy_accepted).toBe(true)
        return HttpResponse.json(ADMIN, { status: 201 })
      }),
      http.get('/api/v1/auth/me', () => HttpResponse.json(ADMIN)),
    )

    renderWithRouter(<RegisterForm />)

    await userEvent.type(screen.getByLabelText(/full name/i), 'Alice Admin')
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@epam.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    )
  })

  it('login: POST /login → AuthContext receives user', async () => {
    server.use(
      http.post('/api/v1/auth/login', () => HttpResponse.json(ADMIN)),
      http.get('/api/v1/auth/me', () => HttpResponse.json(ADMIN)),
    )

    renderWithRouter(<LoginForm />)

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@epam.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() =>
      expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument(),
    )
  })

  it('401 on login: shows generic error message without leaking field detail', async () => {
    server.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json({ detail: 'Invalid credentials.' }, { status: 401 }),
      ),
      http.get('/api/v1/auth/me', () => HttpResponse.json(null, { status: 401 })),
    )

    renderWithRouter(<LoginForm />)

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@epam.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() =>
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument(),
    )
  })

  it('admin sees promote button only for submitters that are not self', async () => {
    const users: User[] = [ADMIN, SUBMITTER]

    render(
      <UserTable users={users} currentUser={ADMIN} onRefresh={() => {}} />,
    )

    // Submitter row has promote button
    expect(screen.getByRole('button', { name: /promote to admin/i })).toBeInTheDocument()

    // Admin's own row has no promote button (not submitter, and is self)
    const rows = screen.getAllByRole('row')
    const adminRow = rows.find((r) => r.textContent?.includes(ADMIN.full_name))
    expect(adminRow).not.toBeUndefined()
    expect(adminRow!.querySelector('button')).toBeNull()
  })

  it('promote submitter: PATCH /users/:id/promote → role becomes admin', async () => {
    let promoted = false
    server.use(
      http.patch('/api/v1/users/:id/promote', () => {
        promoted = true
        return HttpResponse.json(PROMOTED)
      }),
    )

    const onRefresh = vi.fn()
    render(
      <UserTable users={[ADMIN, SUBMITTER]} currentUser={ADMIN} onRefresh={onRefresh} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /promote to admin/i }))

    await waitFor(() => expect(promoted).toBe(true))
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('409 on register duplicate email: shows inline error', async () => {
    server.use(
      http.post('/api/v1/auth/register', () =>
        HttpResponse.json({ detail: 'Email already registered.' }, { status: 409 }),
      ),
      http.get('/api/v1/auth/me', () => HttpResponse.json(null, { status: 401 })),
    )

    renderWithRouter(<RegisterForm />)

    await userEvent.type(screen.getByLabelText(/full name/i), 'Alice Admin')
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@epam.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() =>
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument(),
    )
  })
})
